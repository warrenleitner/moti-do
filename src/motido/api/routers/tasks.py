# motido/api/routers/tasks.py
# pylint: disable=import-outside-toplevel,too-many-arguments,too-many-positional-arguments,too-many-branches,too-many-lines
"""
Task management API endpoints.
"""

from datetime import date as date_type
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, HTTPException, status

from motido.api.deps import CurrentUser, ManagerDep
from motido.api.schemas import (
    BulkJumpToCurrentInstanceRequest,
    BulkJumpToCurrentInstanceResponse,
    HistoryEntrySchema,
    JumpToCurrentInstancePreview,
    SubtaskCreate,
    SubtaskSchema,
    TaskCompletionResponse,
    TaskCreate,
    TaskDeferRequest,
    TaskDeferResponse,
    TaskResponse,
    TaskUpdate,
)
from motido.core.models import (
    Difficulty,
    Duration,
    Priority,
    RecurrenceType,
    SubtaskRecurrenceMode,
    Task,
    User,
)
from motido.core.scoring import (
    build_scoring_config_with_user_multipliers,
    calculate_score,
    calculate_task_scores,
    load_scoring_config,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def task_to_response(
    task: Task,
    all_tasks: dict[str, Task] | None = None,
    config: dict[str, Any] | None = None,
    effective_date: date_type | None = None,
) -> TaskResponse:
    """Convert a Task model to a TaskResponse schema with calculated scores."""
    # Calculate scores if we have the necessary context
    score: float = 0.0
    penalty_score: float = 0.0
    net_score: float = 0.0
    if all_tasks is not None and config is not None and effective_date is not None:
        score, penalty_score, net_score = calculate_task_scores(
            task, all_tasks, config, effective_date
        )

    return TaskResponse(
        id=task.id,
        title=task.title,
        text_description=task.text_description,
        priority=task.priority.value,
        difficulty=task.difficulty.value,
        duration=task.duration.value,
        creation_date=task.creation_date,
        due_date=task.due_date,
        start_date=task.start_date,
        icon=task.icon,
        tags=task.tags,
        project=task.project,
        is_complete=task.is_complete,
        is_habit=task.is_habit,
        recurrence_rule=task.recurrence_rule,
        recurrence_type=task.recurrence_type.value if task.recurrence_type else None,
        habit_start_delta=task.habit_start_delta,
        subtask_recurrence_mode=task.subtask_recurrence_mode.value,
        subtasks=[SubtaskSchema(**s) for s in task.subtasks],
        dependencies=task.dependencies,
        history=[HistoryEntrySchema(**h) for h in task.history],
        streak_current=task.streak_current,
        streak_best=task.streak_best,
        parent_habit_id=task.parent_habit_id,
        score=score,
        penalty_score=penalty_score,
        net_score=net_score,
        target_count=task.target_count,
        current_count=task.current_count,
        defer_until=task.defer_until,
        recurrence_ended_at=task.recurrence_ended_at,
    )


def parse_priority(value: str) -> Priority:
    """Parse priority string to enum."""
    for p in Priority:
        if p.value.lower() == value.lower():
            return p
    return Priority.LOW  # pragma: no cover


def parse_difficulty(value: str) -> Difficulty:
    """Parse difficulty string to enum."""
    for d in Difficulty:
        if d.value.lower() == value.lower():
            return d
    return Difficulty.TRIVIAL  # pragma: no cover


def parse_duration(value: str) -> Duration:
    """Parse duration string to enum."""
    for d in Duration:
        if d.value.lower() == value.lower():
            return d
    return Duration.MINUSCULE  # pragma: no cover


def parse_recurrence_type(value: str | None) -> RecurrenceType | None:
    """Parse recurrence type string to enum."""
    if value is None:
        return None
    for r in RecurrenceType:  # pragma: no cover
        if r.value.lower() == value.lower():  # pragma: no cover
            return r  # pragma: no cover
    return RecurrenceType.STRICT  # pragma: no cover


def parse_subtask_recurrence_mode(value: str | None) -> SubtaskRecurrenceMode:
    """Parse subtask recurrence mode string to enum."""
    if value is None:
        return SubtaskRecurrenceMode.DEFAULT
    for m in SubtaskRecurrenceMode:
        if m.value.lower() == value.lower():
            return m
    return SubtaskRecurrenceMode.DEFAULT


def _is_visible_task(task: Task) -> bool:
    """Return whether a task should appear in active task-facing APIs."""
    return task.recurrence_ended_at is None


def _get_recurring_series(task: Task, user: User) -> list[Task]:
    """Collect all tasks in the same recurring lineage as the given task."""
    tasks_by_id = {user_task.id: user_task for user_task in user.tasks}
    children_by_parent: dict[str, list[Task]] = {}
    for user_task in user.tasks:
        if user_task.parent_habit_id:
            children_by_parent.setdefault(user_task.parent_habit_id, []).append(
                user_task
            )

    related_ids: set[str] = set()
    pending_ids = [task.id]

    while pending_ids:
        current_id = pending_ids.pop()
        if current_id in related_ids:
            continue
        related_ids.add(current_id)

        current_task = tasks_by_id.get(current_id)
        if current_task is None:
            continue

        if current_task.parent_habit_id:
            pending_ids.append(current_task.parent_habit_id)

        for child in children_by_parent.get(current_id, []):
            pending_ids.append(child.id)

    return [tasks_by_id[task_id] for task_id in related_ids]


@router.get("", response_model=list[TaskResponse])
async def list_tasks(
    user: CurrentUser,
    status_filter: str | None = None,
    priority: str | None = None,
    tag: str | None = None,
    project: str | None = None,
    is_habit: bool | None = None,
    include_completed: bool = True,
) -> list[TaskResponse]:
    """
    List all tasks with optional filters.
    """
    tasks = [task for task in user.tasks if _is_visible_task(task)]

    # Apply filters
    if status_filter == "pending":
        tasks = [t for t in tasks if not t.is_complete]
    elif status_filter == "completed":
        tasks = [t for t in tasks if t.is_complete]

    if priority:  # pragma: no cover
        tasks = [
            t for t in tasks if t.priority.value.lower() == priority.lower()
        ]  # pragma: no cover

    if tag:
        tasks = [t for t in tasks if tag in t.tags]

    if project:
        tasks = [t for t in tasks if t.project == project]

    if is_habit is not None:
        tasks = [t for t in tasks if t.is_habit == is_habit]

    if not include_completed:  # pragma: no cover
        tasks = [t for t in tasks if not t.is_complete]  # pragma: no cover

    # Load scoring context for score calculation
    config = load_scoring_config()
    # Merge user's tag/project multipliers into config
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return [task_to_response(t, all_tasks, config, effective_date) for t in tasks]


@router.post("", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """
    Create a new task.
    """
    # Create the task
    task = Task(
        title=task_data.title,
        creation_date=datetime.now(),
        text_description=task_data.text_description,
        priority=parse_priority(task_data.priority),
        difficulty=parse_difficulty(task_data.difficulty),
        duration=parse_duration(task_data.duration),
        due_date=task_data.due_date,
        start_date=task_data.start_date,
        icon=task_data.icon,
        tags=task_data.tags,
        project=task_data.project,
        is_habit=task_data.is_habit,
        recurrence_rule=task_data.recurrence_rule,
        recurrence_type=parse_recurrence_type(task_data.recurrence_type),
        habit_start_delta=task_data.habit_start_delta,
        subtask_recurrence_mode=parse_subtask_recurrence_mode(
            task_data.subtask_recurrence_mode
        ),
        subtasks=[{"text": s.text, "complete": False} for s in task_data.subtasks],
        dependencies=task_data.dependencies,
        target_count=task_data.target_count,
    )

    # Auto-generate icon if not provided
    if not task.icon:
        from motido.core.utils import auto_generate_icon

        task.icon = auto_generate_icon(task.title)

    # Register tags and projects
    for tag_name in task.tags:
        user.get_or_create_tag(tag_name)
    if task.project:
        user.get_or_create_project(task.project)

    user.add_task(task)
    manager.save_user(user)

    # Load scoring context for score calculation
    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return task_to_response(task, all_tasks, config, effective_date)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    user: CurrentUser,
) -> TaskResponse:
    """
    Get a specific task by ID.
    """
    task = user.find_task_by_id(task_id)
    if not task:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    # Load scoring context for score calculation
    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return task_to_response(task, all_tasks, config, effective_date)


def _serialize_value(value: Any) -> Any:
    """Convert a value to a JSON-serializable format."""
    if value is None:
        return None
    if hasattr(value, "value"):
        # Enum values
        return value.value
    if isinstance(value, datetime):
        # datetime objects -> ISO string
        return value.isoformat()
    return value


def record_history(
    task: Task,
    field: str,
    old_value: Any,
    new_value: Any,
) -> None:
    """Record a change in the task's history for undo support."""
    # Convert values to JSON-serializable format
    old_str = _serialize_value(old_value)
    new_str = _serialize_value(new_value)

    # Only record if value actually changed
    if old_str != new_str:
        task.history.append(
            {
                "timestamp": datetime.now().isoformat(),
                "field": field,
                "old_value": old_str,
                "new_value": new_str,
            }
        )


def apply_task_updates(  # pylint: disable=too-many-branches,too-many-statements
    task: Task,
    task_data: TaskUpdate,
    user: User,
) -> None:
    """Apply task updates with history recording for undo support."""
    # Simple field updates
    if task_data.title is not None:
        record_history(task, "title", task.title, task_data.title)
        task.title = task_data.title
    if task_data.text_description is not None:  # pragma: no cover
        record_history(
            task, "text_description", task.text_description, task_data.text_description
        )
        task.text_description = task_data.text_description
    if task_data.due_date is not None:  # pragma: no cover
        record_history(task, "due_date", task.due_date, task_data.due_date)
        task.due_date = task_data.due_date
    if task_data.start_date is not None:  # pragma: no cover
        record_history(task, "start_date", task.start_date, task_data.start_date)
        task.start_date = task_data.start_date
    if task_data.icon is not None:  # pragma: no cover
        record_history(task, "icon", task.icon, task_data.icon)
        task.icon = task_data.icon
    if task_data.is_habit is not None:  # pragma: no cover
        record_history(task, "is_habit", task.is_habit, task_data.is_habit)
        task.is_habit = task_data.is_habit
    if task_data.recurrence_rule is not None:  # pragma: no cover
        record_history(
            task, "recurrence_rule", task.recurrence_rule, task_data.recurrence_rule
        )
        task.recurrence_rule = task_data.recurrence_rule
    if task_data.habit_start_delta is not None:  # pragma: no cover
        record_history(
            task,
            "habit_start_delta",
            task.habit_start_delta,
            task_data.habit_start_delta,
        )
        task.habit_start_delta = task_data.habit_start_delta
    if task_data.is_complete is not None:  # pragma: no cover
        record_history(task, "is_complete", task.is_complete, task_data.is_complete)
        task.is_complete = task_data.is_complete

    # Enum field updates (need parsing)
    if task_data.priority is not None:
        old_priority = task.priority
        task.priority = parse_priority(task_data.priority)
        record_history(task, "priority", old_priority, task.priority)
    if task_data.difficulty is not None:  # pragma: no cover
        old_difficulty = task.difficulty
        task.difficulty = parse_difficulty(task_data.difficulty)
        record_history(task, "difficulty", old_difficulty, task.difficulty)
    if task_data.duration is not None:  # pragma: no cover
        old_duration = task.duration
        task.duration = parse_duration(task_data.duration)
        record_history(task, "duration", old_duration, task.duration)
    if task_data.recurrence_type is not None:  # pragma: no cover
        old_recurrence_type = task.recurrence_type
        task.recurrence_type = parse_recurrence_type(task_data.recurrence_type)
        record_history(
            task, "recurrence_type", old_recurrence_type, task.recurrence_type
        )
    if task_data.subtask_recurrence_mode is not None:  # pragma: no cover
        old_mode = task.subtask_recurrence_mode
        task.subtask_recurrence_mode = parse_subtask_recurrence_mode(
            task_data.subtask_recurrence_mode
        )
        record_history(
            task, "subtask_recurrence_mode", old_mode, task.subtask_recurrence_mode
        )

    # Fields with side effects
    if task_data.tags is not None:
        record_history(task, "tags", task.tags, task_data.tags)
        task.tags = task_data.tags
        for tag_name in task.tags:
            user.get_or_create_tag(tag_name)
    if task_data.project is not None:  # pragma: no cover
        record_history(task, "project", task.project, task_data.project)
        task.project = task_data.project
        if task.project:
            user.get_or_create_project(task.project)

    # Counter task fields
    if task_data.target_count is not None:  # pragma: no cover
        record_history(task, "target_count", task.target_count, task_data.target_count)
        task.target_count = task_data.target_count
    if task_data.current_count is not None:
        record_history(
            task, "current_count", task.current_count, task_data.current_count
        )
        task.current_count = task_data.current_count

    # Defer/delay field
    if task_data.defer_until is not None:
        record_history(task, "defer_until", task.defer_until, task_data.defer_until)
        task.defer_until = task_data.defer_until


def _build_jump_to_current_instance_preview(
    task_id: str,
    user: User,
    current_date: date_type,
) -> JumpToCurrentInstancePreview:
    """
    Build preview data for the jump-to-current-instance bulk action.
    """
    from motido.core.recurrence import calculate_current_instance_dates

    task = user.find_task_by_id(task_id)
    if not task:
        return JumpToCurrentInstancePreview(
            task_id=task_id,
            title="Unknown task",
            can_apply=False,
            reason="Task not found",
        )

    if not task.is_habit or not task.recurrence_rule:
        return JumpToCurrentInstancePreview(
            task_id=task.id,
            title=task.title,
            current_start_date=task.start_date,
            current_due_date=task.due_date,
            can_apply=False,
            reason="Task is not a recurring task",
        )

    if task.is_complete:
        return JumpToCurrentInstancePreview(
            task_id=task.id,
            title=task.title,
            current_start_date=task.start_date,
            current_due_date=task.due_date,
            can_apply=False,
            reason="Task is already complete",
        )

    updated_dates = calculate_current_instance_dates(task, current_date)
    if updated_dates is None:
        return JumpToCurrentInstancePreview(
            task_id=task.id,
            title=task.title,
            current_start_date=task.start_date,
            current_due_date=task.due_date,
            can_apply=False,
            reason="Could not calculate the current recurring instance",
        )

    new_start_date, new_due_date = updated_dates
    if task.start_date == new_start_date and task.due_date == new_due_date:
        return JumpToCurrentInstancePreview(
            task_id=task.id,
            title=task.title,
            current_start_date=task.start_date,
            current_due_date=task.due_date,
            new_start_date=new_start_date,
            new_due_date=new_due_date,
            can_apply=False,
            reason="Task is already on the current instance",
        )

    return JumpToCurrentInstancePreview(
        task_id=task.id,
        title=task.title,
        current_start_date=task.start_date,
        current_due_date=task.due_date,
        new_start_date=new_start_date,
        new_due_date=new_due_date,
        can_apply=True,
    )


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """Update a task."""
    task = user.find_task_by_id(task_id)
    if not task:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    apply_task_updates(task, task_data, user)
    manager.save_user(user)

    # Load scoring context for score calculation
    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return task_to_response(task, all_tasks, config, effective_date)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> None:
    """
    Delete a task.
    """
    task = user.find_task_by_id(task_id)
    if not task:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    user.remove_task(task.id)
    manager.save_user(user)


@router.post("/{task_id}/end-recurrence", status_code=status.HTTP_204_NO_CONTENT)
async def end_task_recurrence(
    task_id: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> None:
    """End a recurring task series while preserving an exportable tombstone."""
    task = user.find_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    if not task.is_habit or not task.recurrence_rule:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is not a recurring task",
        )

    ended_at = datetime.now()
    for related_task in _get_recurring_series(task, user):
        record_history(
            related_task,
            "recurrence_ended_at",
            related_task.recurrence_ended_at,
            ended_at,
        )
        related_task.recurrence_ended_at = ended_at

    manager.save_user(user)


@router.post("/{task_id}/undo", response_model=TaskResponse)
async def undo_task_change(
    task_id: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """
    Undo the last change to a task.

    Reverts the most recent field change recorded in the task's history.
    """
    task = user.find_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    if not task.history:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes to undo",
        )

    # Pop the last history entry
    last_change = task.history.pop()
    field = last_change["field"]
    old_value = last_change["old_value"]

    # Revert the field to its old value
    if field == "title":
        task.title = old_value
    elif field == "text_description":
        task.text_description = old_value
    elif field == "priority":
        task.priority = parse_priority(old_value)
    elif field == "difficulty":
        task.difficulty = parse_difficulty(old_value)
    elif field == "duration":
        task.duration = parse_duration(old_value)
    elif field == "due_date":
        task.due_date = old_value
    elif field == "start_date":
        task.start_date = old_value
    elif field == "icon":
        task.icon = old_value
    elif field == "tags":
        task.tags = old_value if old_value else []
    elif field == "project":
        task.project = old_value
    elif field == "is_habit":
        task.is_habit = old_value
    elif field == "recurrence_rule":
        task.recurrence_rule = old_value
    elif field == "recurrence_type":
        task.recurrence_type = parse_recurrence_type(old_value)
    elif field == "habit_start_delta":
        task.habit_start_delta = old_value
    elif field == "is_complete":
        task.is_complete = old_value
    elif field == "defer_until":
        task.defer_until = old_value
    elif field == "recurrence_ended_at":
        task.recurrence_ended_at = (
            datetime.fromisoformat(old_value) if old_value else None
        )

    manager.save_user(user)

    # Load scoring context for score calculation
    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return task_to_response(task, all_tasks, config, effective_date)


@router.post("/{task_id}/defer", response_model=TaskDeferResponse)
async def defer_task(
    task_id: str,
    request: TaskDeferRequest,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskDeferResponse:
    """
    Defer a task until a specific date or until its next recurrence.

    Either provide an explicit `defer_until` date, or set
    `defer_to_next_recurrence=True` for recurring tasks.
    """
    from motido.core.recurrence import calculate_next_occurrence

    task = user.find_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    defer_date: datetime | None = None

    if request.defer_to_next_recurrence:
        if not task.is_habit or not task.recurrence_rule:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Task is not a recurring habit",
            )
        defer_date = calculate_next_occurrence(task)
        if not defer_date:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Could not calculate next recurrence date",
            )
    elif request.defer_until is not None:
        defer_date = request.defer_until
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Must provide defer_until or set defer_to_next_recurrence=True",
        )

    record_history(task, "defer_until", task.defer_until, defer_date)
    task.defer_until = defer_date

    manager.save_user(user)

    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return TaskDeferResponse(
        task=task_to_response(task, all_tasks, config, effective_date),
        deferred_until=defer_date,
    )


@router.post(
    "/bulk/jump-to-current-instance",
    response_model=BulkJumpToCurrentInstanceResponse,
)
async def jump_tasks_to_current_instance(
    request: BulkJumpToCurrentInstanceRequest,
    user: CurrentUser,
    manager: ManagerDep,
) -> BulkJumpToCurrentInstanceResponse:
    """
    Preview or apply a catch-up jump for selected recurring tasks.

    The jump realigns each selected recurring task to the first scheduled
    occurrence whose due date is today or later, while preserving the
    original start-date offset for tasks that become visible before they are
    due.
    """
    current_date = date_type.today()
    previews = [
        _build_jump_to_current_instance_preview(task_id, user, current_date)
        for task_id in request.task_ids
    ]

    if request.dry_run:
        return BulkJumpToCurrentInstanceResponse(previews=previews)

    updated_tasks: list[Task] = []
    preview_by_id = {
        preview.task_id: preview for preview in previews if preview.can_apply
    }

    for task_id in request.task_ids:
        preview = preview_by_id.get(task_id)
        if preview is None:
            continue

        task = user.find_task_by_id(task_id)
        if task is None:
            continue

        record_history(task, "start_date", task.start_date, preview.new_start_date)
        record_history(task, "due_date", task.due_date, preview.new_due_date)
        task.start_date = preview.new_start_date
        task.due_date = preview.new_due_date
        updated_tasks.append(task)

    if updated_tasks:
        manager.save_user(user)

    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {task.id: task for task in user.tasks}
    effective_date = date_type.today()

    return BulkJumpToCurrentInstanceResponse(
        previews=previews,
        updated_tasks=[
            task_to_response(task, all_tasks, config, effective_date)
            for task in updated_tasks
        ],
        updated_count=len(updated_tasks),
    )


@router.post("/{task_id}/complete", response_model=TaskCompletionResponse)
async def complete_task(
    task_id: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskCompletionResponse:
    """
    Mark a task as complete and award XP.

    For recurring habit tasks, also creates the next instance and returns it.
    Recurrence is calculated based on the user's processing date (game day).
    """
    task = user.find_task_by_id(task_id)
    if not task:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    if task.is_complete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is already complete",
        )

    # For recurrence calculations, use the current processing date (game day)
    # This is the day AFTER last_processed_date (the day being worked on now)
    # This ensures consistent behavior regardless of actual wall-clock time
    completion_date = datetime.combine(
        user.last_processed_date + timedelta(days=1), datetime.min.time()
    )

    # Mark as complete
    task.is_complete = True

    # Update streak for habits
    if task.is_habit:
        task.streak_current += 1
        task.streak_best = max(task.streak_best, task.streak_current)

    # Award XP (simplified - uses base XP from scoring)
    from motido.core.scoring import check_badges

    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()
    xp_earned = int(calculate_score(task, all_tasks, config, effective_date))
    user.total_xp += xp_earned

    # Log XP transaction (use actual time for audit trail)
    from motido.core.models import XPTransaction

    transaction = XPTransaction(
        amount=xp_earned,
        source="task_completion",
        timestamp=datetime.now(),
        task_id=task.id,
        description=f"Completed: {task.title}",
        game_date=user.last_processed_date,
    )
    user.xp_transactions.append(transaction)

    # Check for badges (persist=False: single atomic save at the end)
    check_badges(user, manager, config, persist=False)

    # Create next instance for recurring habits
    next_instance = None
    next_instance_response = None
    if task.is_habit and task.recurrence_rule:
        from motido.core.recurrence import create_next_habit_instance

        next_instance = create_next_habit_instance(task, completion_date)
        if next_instance:
            user.add_task(next_instance)
            # Update all_tasks to include the new instance for scoring
            all_tasks[next_instance.id] = next_instance
            next_instance_response = task_to_response(
                next_instance, all_tasks, config, effective_date
            )

    manager.save_user(user)

    return TaskCompletionResponse(
        task=task_to_response(task, all_tasks, config, effective_date),
        xp_earned=xp_earned,
        next_instance=next_instance_response,
    )


@router.post("/{task_id}/uncomplete", response_model=TaskResponse)
async def uncomplete_task(
    task_id: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """
    Mark a task as incomplete.
    """
    task = user.find_task_by_id(task_id)
    if not task:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    if not task.is_complete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is not complete",
        )

    task.is_complete = False

    # Decrease streak for habits
    if task.is_habit and task.streak_current > 0:  # pragma: no cover
        task.streak_current -= 1  # pragma: no cover

    manager.save_user(user)

    # Load scoring context for score calculation
    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return task_to_response(task, all_tasks, config, effective_date)


# === Subtask endpoints ===


@router.post("/{task_id}/subtasks", response_model=TaskResponse)
async def add_subtask(
    task_id: str,
    subtask_data: SubtaskCreate,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """
    Add a subtask to a task.
    """
    task = user.find_task_by_id(task_id)
    if not task:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    task.subtasks.append({"text": subtask_data.text, "complete": False})
    manager.save_user(user)

    # Load scoring context for score calculation
    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return task_to_response(task, all_tasks, config, effective_date)


@router.put("/{task_id}/subtasks/{subtask_index}", response_model=TaskResponse)
async def update_subtask(
    task_id: str,
    subtask_index: int,
    subtask_data: SubtaskSchema,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """
    Update a subtask.
    """
    task = user.find_task_by_id(task_id)
    if not task:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    if subtask_index < 0 or subtask_index >= len(task.subtasks):  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subtask index {subtask_index} out of range",
        )

    task.subtasks[subtask_index] = {
        "text": subtask_data.text,
        "complete": subtask_data.complete,
    }
    manager.save_user(user)

    # Load scoring context for score calculation
    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return task_to_response(task, all_tasks, config, effective_date)


@router.delete("/{task_id}/subtasks/{subtask_index}", response_model=TaskResponse)
async def delete_subtask(
    task_id: str,
    subtask_index: int,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """
    Delete a subtask.
    """
    task = user.find_task_by_id(task_id)
    if not task:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    if subtask_index < 0 or subtask_index >= len(task.subtasks):  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subtask index {subtask_index} out of range",
        )

    task.subtasks.pop(subtask_index)
    manager.save_user(user)

    # Load scoring context for score calculation
    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return task_to_response(task, all_tasks, config, effective_date)


# === Dependency endpoints ===


@router.post("/{task_id}/dependencies/{dep_id}", response_model=TaskResponse)
async def add_dependency(
    task_id: str,
    dep_id: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """
    Add a dependency to a task.
    """
    task = user.find_task_by_id(task_id)
    if not task:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    dep_task = user.find_task_by_id(dep_id)
    if not dep_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dependency task with ID {dep_id} not found",
        )

    if dep_task.id not in task.dependencies:
        task.dependencies.append(dep_task.id)
        manager.save_user(user)

    # Load scoring context for score calculation
    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return task_to_response(task, all_tasks, config, effective_date)


@router.delete("/{task_id}/dependencies/{dep_id}", response_model=TaskResponse)
async def remove_dependency(
    task_id: str,
    dep_id: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """
    Remove a dependency from a task.
    """
    task = user.find_task_by_id(task_id)
    if not task:  # pragma: no cover
        raise HTTPException(  # pragma: no cover
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    dep_task = user.find_task_by_id(dep_id)
    if dep_task and dep_task.id in task.dependencies:
        task.dependencies.remove(dep_task.id)
        manager.save_user(user)

    # Load scoring context for score calculation
    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return task_to_response(task, all_tasks, config, effective_date)


@router.post("/{task_id}/counter/{action}", response_model=TaskResponse)
async def update_counter(
    task_id: str,
    action: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """
    Increment or decrement a counter task's current count.

    Actions:
    - increment: Add 1 to current_count
    - decrement: Subtract 1 from current_count (minimum 0)
    """
    task = user.find_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    if task.target_count is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is not a counter task",
        )

    if action == "increment":
        task.current_count += 1
    elif action == "decrement":
        task.current_count = max(0, task.current_count - 1)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid action: {action}. Must be 'increment' or 'decrement'",
        )

    manager.save_user(user)

    # Load scoring context for score calculation
    config = load_scoring_config()
    config = build_scoring_config_with_user_multipliers(config, user)
    all_tasks = {t.id: t for t in user.tasks}
    effective_date = date_type.today()

    return task_to_response(task, all_tasks, config, effective_date)
