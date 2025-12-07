# motido/api/routers/user.py
# pylint: disable=import-outside-toplevel
"""
User profile, XP, and badges API endpoints.
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from motido.api.deps import CurrentUser, ManagerDep
from motido.api.schemas import (
    BadgeSchema,
    ProjectCreate,
    ProjectResponse,
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
    return [TagResponse(id=t.id, name=t.name, color=t.color) for t in user.defined_tags]


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

    tag = Tag(name=tag_data.name, color=tag_data.color)
    user.defined_tags.append(tag)
    manager.save_user(user)

    return TagResponse(id=tag.id, name=tag.name, color=tag.color)


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
    manager.save_user(user)

    return TagResponse(id=tag.id, name=tag.name, color=tag.color)


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
        ProjectResponse(id=p.id, name=p.name, color=p.color)
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

    project = Project(name=project_data.name, color=project_data.color)
    user.defined_projects.append(project)
    manager.save_user(user)

    return ProjectResponse(id=project.id, name=project.name, color=project.color)


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    project_data: ProjectCreate,
    user: CurrentUser,
    manager: ManagerDep,
) -> ProjectResponse:
    """Update a project."""
    project = next((p for p in user.defined_projects if p.id == project_id), None)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    project.name = project_data.name
    project.color = project_data.color
    manager.save_user(user)

    return ProjectResponse(id=project.id, name=project.name, color=project.color)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> None:
    """Delete a project."""
    project = next((p for p in user.defined_projects if p.id == project_id), None)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found",
        )

    user.defined_projects.remove(project)
    manager.save_user(user)
