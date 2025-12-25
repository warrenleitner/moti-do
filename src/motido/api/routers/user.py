# motido/api/routers/user.py
# pylint: disable=import-outside-toplevel
"""
User profile, XP, and badges API endpoints.
"""

import json
from datetime import datetime

from fastapi import APIRouter, File, HTTPException, Response, UploadFile, status

from motido.api.deps import CurrentUser, ManagerDep
from motido.api.schemas import (
    BadgeSchema,
    ProjectCreate,
    ProjectResponse,
    ScoringConfigResponse,
    ScoringConfigUpdate,
    TagCreate,
    TagResponse,
    UserProfile,
    UserStats,
    XPTransactionSchema,
    XPWithdrawRequest,
)
from motido.core.models import XPTransaction

router = APIRouter(prefix="/user", tags=["user"])


def calculate_level(xp: int) -> int:
    """Calculate level from XP using a simple formula."""
    # Every 100 XP = 1 level, with increasing requirements
    if xp <= 0:
        return 1
    level = 1
    xp_required = 100
    remaining_xp = xp
    while remaining_xp >= xp_required:
        remaining_xp -= xp_required
        level += 1
        xp_required = int(xp_required * 1.1)  # 10% more XP per level
    return level


@router.get("/profile", response_model=UserProfile)
async def get_profile(user: CurrentUser) -> UserProfile:
    """Get the current user's profile."""
    return UserProfile(
        username=user.username,
        total_xp=user.total_xp,
        level=calculate_level(user.total_xp),
        last_processed_date=user.last_processed_date,
        vacation_mode=user.vacation_mode,
    )


@router.get("/stats", response_model=UserStats)
async def get_stats(user: CurrentUser) -> UserStats:
    """Get user statistics."""
    total_tasks = len(user.tasks)
    completed_tasks = len([t for t in user.tasks if t.is_complete])
    pending_tasks = total_tasks - completed_tasks
    habits = [t for t in user.tasks if t.is_habit and not t.parent_habit_id]

    # Calculate current and best streak across all habits
    current_streak = max((h.streak_current for h in habits), default=0)
    best_streak = max((h.streak_best for h in habits), default=0)

    return UserStats(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        habits_count=len(habits),
        total_xp=user.total_xp,
        level=calculate_level(user.total_xp),
        badges_earned=len([b for b in user.badges if b.earned_date is not None]),
        current_streak=current_streak,
        best_streak=best_streak,
    )


# === XP Endpoints ===


@router.get("/xp", response_model=list[XPTransactionSchema])
async def get_xp_log(
    user: CurrentUser,
    limit: int = 50,
) -> list[XPTransactionSchema]:
    """Get XP transaction history."""
    transactions = sorted(
        user.xp_transactions,
        key=lambda t: t.timestamp,
        reverse=True,
    )[:limit]

    return [
        XPTransactionSchema(
            id=t.id,
            amount=t.amount,
            source=t.source,
            timestamp=t.timestamp,
            task_id=t.task_id,
            description=t.description,
        )
        for t in transactions
    ]


@router.post("/xp/withdraw", response_model=XPTransactionSchema)
async def withdraw_xp(
    request: XPWithdrawRequest,
    user: CurrentUser,
    manager: ManagerDep,
) -> XPTransactionSchema:
    """Withdraw XP (spend on rewards)."""
    if request.amount > user.total_xp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient XP. You have {user.total_xp} XP.",
        )

    user.total_xp -= request.amount

    transaction = XPTransaction(
        amount=-request.amount,
        source="withdrawal",
        timestamp=datetime.now(),
        description=request.description or "XP withdrawal",
    )
    user.xp_transactions.append(transaction)
    manager.save_user(user)

    return XPTransactionSchema(
        id=transaction.id,
        amount=transaction.amount,
        source=transaction.source,
        timestamp=transaction.timestamp,
        task_id=transaction.task_id,
        description=transaction.description,
    )


# === Badge Endpoints ===


@router.get("/badges", response_model=list[BadgeSchema])
async def get_badges(user: CurrentUser) -> list[BadgeSchema]:
    """Get all badges (earned and unearned)."""
    return [
        BadgeSchema(
            id=b.id,
            name=b.name,
            description=b.description,
            glyph=b.glyph,
            earned_date=b.earned_date,
        )
        for b in user.badges
    ]


# === Tag Endpoints ===


@router.get("/tags", response_model=list[TagResponse])
async def get_tags(user: CurrentUser) -> list[TagResponse]:
    """Get all defined tags."""
    return [
        TagResponse(id=t.id, name=t.name, color=t.color, multiplier=t.multiplier)
        for t in user.defined_tags
    ]


@router.post("/tags", response_model=TagResponse, status_code=status.HTTP_201_CREATED)
async def create_tag(
    tag_data: TagCreate,
    user: CurrentUser,
    manager: ManagerDep,
) -> TagResponse:
    """Create a new tag."""
    # Check if tag already exists
    existing = user.find_tag_by_name(tag_data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Tag '{tag_data.name}' already exists",
        )

    from motido.core.models import Tag

    tag = Tag(name=tag_data.name, color=tag_data.color, multiplier=tag_data.multiplier)
    user.defined_tags.append(tag)
    manager.save_user(user)

    return TagResponse(
        id=tag.id, name=tag.name, color=tag.color, multiplier=tag.multiplier
    )


@router.put("/tags/{tag_id}", response_model=TagResponse)
async def update_tag(
    tag_id: str,
    tag_data: TagCreate,
    user: CurrentUser,
    manager: ManagerDep,
) -> TagResponse:
    """Update a tag."""
    tag = next((t for t in user.defined_tags if t.id == tag_id), None)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tag with ID {tag_id} not found",
        )

    tag.name = tag_data.name
    tag.color = tag_data.color
    tag.multiplier = tag_data.multiplier
    manager.save_user(user)

    return TagResponse(
        id=tag.id, name=tag.name, color=tag.color, multiplier=tag.multiplier
    )


@router.delete("/tags/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tag(
    tag_id: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> None:
    """Delete a tag."""
    tag = next((t for t in user.defined_tags if t.id == tag_id), None)
    if not tag:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Tag with ID {tag_id} not found",
        )

    user.defined_tags.remove(tag)
    manager.save_user(user)


# === Project Endpoints ===


@router.get("/projects", response_model=list[ProjectResponse])
async def get_projects(user: CurrentUser) -> list[ProjectResponse]:
    """Get all defined projects."""
    return [
        ProjectResponse(id=p.id, name=p.name, color=p.color, multiplier=p.multiplier)
        for p in user.defined_projects
    ]


@router.post(
    "/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED
)
async def create_project(
    project_data: ProjectCreate,
    user: CurrentUser,
    manager: ManagerDep,
) -> ProjectResponse:
    """Create a new project."""
    existing = user.find_project_by_name(project_data.name)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Project '{project_data.name}' already exists",
        )

    from motido.core.models import Project

    project = Project(
        name=project_data.name,
        color=project_data.color,
        multiplier=project_data.multiplier,
    )
    user.defined_projects.append(project)
    manager.save_user(user)

    return ProjectResponse(
        id=project.id,
        name=project.name,
        color=project.color,
        multiplier=project.multiplier,
    )


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectCreate,
    user: CurrentUser,
    manager: ManagerDep,
) -> ProjectResponse:
    """Update a project."""
    project = next((p for p in user.defined_projects if p.id == project_id), None)
    if not project:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    project.name = project_data.name
    project.color = project_data.color
    project.multiplier = project_data.multiplier
    manager.save_user(user)

    return ProjectResponse(
        id=project.id,
        name=project.name,
        color=project.color,
        multiplier=project.multiplier,
    )


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> None:
    """Delete a project."""
    project = next((p for p in user.defined_projects if p.id == project_id), None)
    if not project:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    user.defined_projects.remove(project)
    manager.save_user(user)


# === Data Export/Import endpoints ===


@router.get("/export")
async def export_user_data(user: CurrentUser) -> Response:
    """
    Export complete user data as JSON for backup.

    Returns all user data including tasks, XP transactions, badges, tags, and projects
    in the same format as JsonDataManager for full data portability.
    """
    # Serialize tasks (match JsonDataManager format exactly)
    tasks_data = [
        {
            "id": task.id,
            "title": task.title,
            "text_description": task.text_description,
            "priority": task.priority.value,
            "difficulty": task.difficulty.value,
            "duration": task.duration.value,
            "is_complete": task.is_complete,
            "creation_date": (
                task.creation_date.strftime("%Y-%m-%d %H:%M:%S")
                if task.creation_date
                else None
            ),
            "due_date": (
                task.due_date.strftime("%Y-%m-%d %H:%M:%S") if task.due_date else None
            ),
            "start_date": (
                task.start_date.strftime("%Y-%m-%d %H:%M:%S")
                if task.start_date
                else None
            ),
            "icon": task.icon,
            "tags": task.tags,
            "project": task.project,
            "subtasks": task.subtasks,
            "dependencies": task.dependencies,
            "history": task.history,
            "is_habit": task.is_habit,
            "recurrence_rule": task.recurrence_rule,
            "recurrence_type": (
                task.recurrence_type.value if task.recurrence_type else None
            ),
            "streak_current": task.streak_current,
            "streak_best": task.streak_best,
            "parent_habit_id": task.parent_habit_id,
        }
        for task in user.tasks
    ]

    # Prepare complete user data
    user_data = {
        "username": user.username,
        "total_xp": user.total_xp,
        "password_hash": user.password_hash,
        "tasks": tasks_data,
        "last_processed_date": user.last_processed_date.isoformat(),
        "vacation_mode": user.vacation_mode,
        "xp_transactions": [
            {
                "id": trans.id,
                "amount": trans.amount,
                "source": trans.source,
                "timestamp": trans.timestamp.strftime("%Y-%m-%d %H:%M:%S"),
                "task_id": trans.task_id,
                "description": trans.description,
            }
            for trans in getattr(user, "xp_transactions", [])
        ],
        "badges": [
            {
                "id": badge.id,
                "name": badge.name,
                "description": badge.description,
                "glyph": badge.glyph,
                "earned_date": (
                    badge.earned_date.strftime("%Y-%m-%d %H:%M:%S")
                    if badge.earned_date
                    else None
                ),
            }
            for badge in getattr(user, "badges", [])
        ],
        "defined_tags": [
            {
                "id": tag.id,
                "name": tag.name,
                "color": tag.color,
                "multiplier": tag.multiplier,
            }
            for tag in getattr(user, "defined_tags", [])
        ],
        "defined_projects": [
            {
                "id": proj.id,
                "name": proj.name,
                "color": proj.color,
                "multiplier": proj.multiplier,
            }
            for proj in getattr(user, "defined_projects", [])
        ],
    }

    # Wrap in the same format as JsonDataManager (username as key)
    export_data = {user.username: user_data}

    # Generate filename with timestamp
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    filename = f"motido-backup-{timestamp}.json"

    # Return as downloadable JSON file
    return Response(
        content=json.dumps(export_data, indent=2),
        media_type="application/json",
        headers={
            "Content-Disposition": f'attachment; filename="{filename}"',
        },
    )


@router.post("/import")
async def import_user_data(
    user: CurrentUser,
    manager: ManagerDep,
    file: UploadFile = File(...),
) -> dict:
    """
    Import user data from JSON backup file.

    Replaces all current user data with data from the backup file.
    Preserves the current password_hash for security unless explicitly included in import.

    Returns a summary of imported data.
    """
    # Validate file type
    if not file.filename or not file.filename.endswith(".json"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a JSON file (.json)",
        )

    try:
        # Read and parse JSON file
        contents = await file.read()
        import_data = json.loads(contents.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid JSON file: {e}",
        ) from e

    # Validate structure - expect {username: user_data} format
    if not isinstance(import_data, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file structure: expected dictionary with username as key",
        )

    # Get user data (should be keyed by username)
    user_data = import_data.get(user.username)
    if not user_data:
        # Check if there's only one user in the file and use that
        if len(import_data) == 1:
            user_data = list(import_data.values())[0]
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No data found for user '{user.username}' in import file",
            )

    # Deserialize user data using JsonDataManager's method
    try:
        from motido.data.json_manager import JsonDataManager

        json_mgr = JsonDataManager()
        imported_user = json_mgr.deserialize_user_data(user_data, user.username)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid user data format: {e}",
        ) from e

    # Preserve current password_hash if not in import (security)
    if not imported_user.password_hash:
        imported_user.password_hash = user.password_hash

    # Save the imported user data (replaces all current data)
    manager.save_user(imported_user)

    # Return summary of imported data
    return {
        "message": "Data imported successfully",
        "summary": {
            "username": imported_user.username,
            "total_xp": imported_user.total_xp,
            "tasks_count": len(imported_user.tasks),
            "xp_transactions_count": len(getattr(imported_user, "xp_transactions", [])),
            "badges_count": len(getattr(imported_user, "badges", [])),
            "tags_count": len(getattr(imported_user, "defined_tags", [])),
            "projects_count": len(getattr(imported_user, "defined_projects", [])),
        },
    }


# === Scoring Configuration Endpoints ===
# These endpoints are tested via E2E integration tests


@router.get("/scoring-config", response_model=ScoringConfigResponse)
async def get_scoring_config(  # pragma: no cover
    _user: CurrentUser,
) -> ScoringConfigResponse:
    """
    Get the current scoring configuration.

    Returns all scoring weights and multipliers that affect task scoring.
    Note: tag_multipliers and project_multipliers are managed separately
    via the /tags and /projects endpoints.
    """
    from motido.core.scoring import load_scoring_config

    config = load_scoring_config()

    # Convert to response schema (excluding tag/project multipliers)
    return ScoringConfigResponse(
        base_score=config.get("base_score", 10),
        field_presence_bonus=config.get(
            "field_presence_bonus", {"text_description": 5}
        ),
        difficulty_multiplier=config.get("difficulty_multiplier", {}),
        duration_multiplier=config.get("duration_multiplier", {}),
        priority_multiplier=config.get("priority_multiplier", {}),
        age_factor=config.get("age_factor", {}),
        daily_penalty=config.get("daily_penalty", {}),
        due_date_proximity=config.get("due_date_proximity", {}),
        start_date_aging=config.get("start_date_aging", {}),
        dependency_chain=config.get("dependency_chain", {}),
        habit_streak_bonus=config.get("habit_streak_bonus", {}),
        status_bumps=config.get("status_bumps", {}),
    )


@router.post("/scoring-config/reset", response_model=ScoringConfigResponse)
async def reset_scoring_config(  # pragma: no cover
    _user: CurrentUser,
) -> ScoringConfigResponse:
    """
    Reset the scoring configuration to default values.

    Restores all scoring weights and multipliers to their original defaults.
    """
    from motido.core.scoring import get_default_scoring_config, save_scoring_config

    config = get_default_scoring_config()
    save_scoring_config(config)

    return ScoringConfigResponse(
        base_score=config.get("base_score", 10),
        field_presence_bonus=config.get(
            "field_presence_bonus", {"text_description": 5}
        ),
        difficulty_multiplier=config.get("difficulty_multiplier", {}),
        duration_multiplier=config.get("duration_multiplier", {}),
        priority_multiplier=config.get("priority_multiplier", {}),
        age_factor=config.get("age_factor", {}),
        daily_penalty=config.get("daily_penalty", {}),
        due_date_proximity=config.get("due_date_proximity", {}),
        start_date_aging=config.get("start_date_aging", {}),
        dependency_chain=config.get("dependency_chain", {}),
        habit_streak_bonus=config.get("habit_streak_bonus", {}),
        status_bumps=config.get("status_bumps", {}),
    )


@router.put("/scoring-config", response_model=ScoringConfigResponse)
async def update_scoring_config(  # pragma: no cover
    update_data: ScoringConfigUpdate,
    _user: CurrentUser,
) -> ScoringConfigResponse:
    """
    Update the scoring configuration.

    Only the fields provided in the request will be updated.
    Note: tag_multipliers and project_multipliers are managed separately
    via the /tags and /projects endpoints.
    """
    from motido.core.scoring import load_scoring_config, save_scoring_config

    # Load current config
    config = load_scoring_config()

    # Fields that are simple values (no model_dump needed)
    simple_fields = [
        "base_score",
        "difficulty_multiplier",
        "duration_multiplier",
        "priority_multiplier",
    ]
    # Fields that are Pydantic models (need model_dump)
    model_fields = [
        "field_presence_bonus",
        "age_factor",
        "daily_penalty",
        "due_date_proximity",
        "start_date_aging",
        "dependency_chain",
        "habit_streak_bonus",
        "status_bumps",
    ]

    # Update simple fields
    for field in simple_fields:
        value = getattr(update_data, field)
        if value is not None:
            config[field] = value

    # Update model fields (need to call model_dump())
    for field in model_fields:
        value = getattr(update_data, field)
        if value is not None:
            config[field] = value.model_dump()

    # Save updated config
    try:
        save_scoring_config(config)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        ) from e

    # Return updated config
    return ScoringConfigResponse(
        base_score=config.get("base_score", 10),
        field_presence_bonus=config.get(
            "field_presence_bonus", {"text_description": 5}
        ),
        difficulty_multiplier=config.get("difficulty_multiplier", {}),
        duration_multiplier=config.get("duration_multiplier", {}),
        priority_multiplier=config.get("priority_multiplier", {}),
        age_factor=config.get("age_factor", {}),
        daily_penalty=config.get("daily_penalty", {}),
        due_date_proximity=config.get("due_date_proximity", {}),
        start_date_aging=config.get("start_date_aging", {}),
        dependency_chain=config.get("dependency_chain", {}),
        habit_streak_bonus=config.get("habit_streak_bonus", {}),
        status_bumps=config.get("status_bumps", {}),
    )
