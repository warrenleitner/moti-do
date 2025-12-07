# motido/api/routers/tasks.py
"""
Task management API endpoints.
"""

from datetime import datetime

from fastapi import APIRouter, HTTPException, status

from motido.api.deps import CurrentUser, ManagerDep
from motido.api.schemas import (
    SubtaskCreate,
    SubtaskSchema,
    TaskCreate,
    TaskResponse,
    TaskUpdate,
)
from motido.core.models import (
    Difficulty,
    Duration,
    Priority,
    RecurrenceType,
    Task,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])


def task_to_response(task: Task) -> TaskResponse:
    """Convert a Task model to a TaskResponse schema."""
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
        subtasks=[SubtaskSchema(**s) for s in task.subtasks],
        dependencies=task.dependencies,
        history=[],  # Simplified for API
        streak_current=task.streak_current,
        streak_best=task.streak_best,
        parent_habit_id=task.parent_habit_id,
    )


def parse_priority(value: str) -> Priority:
    """Parse priority string to enum."""
    for p in Priority:
        if p.value.lower() == value.lower():
            return p
    return Priority.LOW


def parse_difficulty(value: str) -> Difficulty:
    """Parse difficulty string to enum."""
    for d in Difficulty:
        if d.value.lower() == value.lower():
            return d
    return Difficulty.TRIVIAL


def parse_duration(value: str) -> Duration:
    """Parse duration string to enum."""
    for d in Duration:
        if d.value.lower() == value.lower():
            return d
    return Duration.MINISCULE


def parse_recurrence_type(value: str | None) -> RecurrenceType | None:
    """Parse recurrence type string to enum."""
    if value is None:
        return None
    for r in RecurrenceType:
        if r.value.lower() == value.lower():
            return r
    return RecurrenceType.STRICT


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
    tasks = user.tasks

    # Apply filters
    if status_filter == "pending":
        tasks = [t for t in tasks if not t.is_complete]
    elif status_filter == "completed":
        tasks = [t for t in tasks if t.is_complete]

    if priority:
        tasks = [t for t in tasks if t.priority.value.lower() == priority.lower()]

    if tag:
        tasks = [t for t in tasks if tag in t.tags]

    if project:
        tasks = [t for t in tasks if t.project == project]

    if is_habit is not None:
        tasks = [t for t in tasks if t.is_habit == is_habit]

    if not include_completed:
        tasks = [t for t in tasks if not t.is_complete]

    return [task_to_response(t) for t in tasks]


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
        subtasks=[{"text": s.text, "complete": False} for s in task_data.subtasks],
        dependencies=task_data.dependencies,
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

    return task_to_response(task)


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    user: CurrentUser,
) -> TaskResponse:
    """
    Get a specific task by ID.
    """
    task = user.find_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )
    return task_to_response(task)


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """
    Update a task.
    """
    task = user.find_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    # Update fields if provided
    if task_data.title is not None:
        task.title = task_data.title
    if task_data.text_description is not None:
        task.text_description = task_data.text_description
    if task_data.priority is not None:
        task.priority = parse_priority(task_data.priority)
    if task_data.difficulty is not None:
        task.difficulty = parse_difficulty(task_data.difficulty)
    if task_data.duration is not None:
        task.duration = parse_duration(task_data.duration)
    if task_data.due_date is not None:
        task.due_date = task_data.due_date
    if task_data.start_date is not None:
        task.start_date = task_data.start_date
    if task_data.icon is not None:
        task.icon = task_data.icon
    if task_data.tags is not None:
        task.tags = task_data.tags
        for tag_name in task.tags:
            user.get_or_create_tag(tag_name)
    if task_data.project is not None:
        task.project = task_data.project
        if task.project:
            user.get_or_create_project(task.project)
    if task_data.is_habit is not None:
        task.is_habit = task_data.is_habit
    if task_data.recurrence_rule is not None:
        task.recurrence_rule = task_data.recurrence_rule
    if task_data.recurrence_type is not None:
        task.recurrence_type = parse_recurrence_type(task_data.recurrence_type)
    if task_data.habit_start_delta is not None:
        task.habit_start_delta = task_data.habit_start_delta
    if task_data.is_complete is not None:
        task.is_complete = task_data.is_complete

    manager.save_user(user)
    return task_to_response(task)


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
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    user.remove_task(task.id)
    manager.save_user(user)


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: str,
    user: CurrentUser,
    manager: ManagerDep,
) -> TaskResponse:
    """
    Mark a task as complete and award XP.
    """
    task = user.find_task_by_id(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    if task.is_complete:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Task is already complete",
        )

    # Mark as complete
    task.is_complete = True

    # Update streak for habits
    if task.is_habit:
        task.streak_current += 1
        task.streak_best = max(task.streak_best, task.streak_current)

    # Award XP (simplified - uses base XP from scoring)
    from datetime import date as date_type

    from motido.core.scoring import calculate_score, check_badges, load_scoring_config

    config = load_scoring_config()
    all_tasks = {t.id: t for t in user.tasks}
    xp_earned = int(calculate_score(task, all_tasks, config, date_type.today()))
    user.total_xp += xp_earned

    # Log XP transaction
    from motido.core.models import XPTransaction

    transaction = XPTransaction(
        amount=xp_earned,
        source="task_completion",
        timestamp=datetime.now(),
        task_id=task.id,
        description=f"Completed: {task.title}",
    )
    user.xp_transactions.append(transaction)

    # Check for badges
    check_badges(user, manager, config)

    manager.save_user(user)
    return task_to_response(task)


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
    if not task:
        raise HTTPException(
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
    if task.is_habit and task.streak_current > 0:
        task.streak_current -= 1

    manager.save_user(user)
    return task_to_response(task)


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
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    task.subtasks.append({"text": subtask_data.text, "complete": False})
    manager.save_user(user)
    return task_to_response(task)


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
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    if subtask_index < 0 or subtask_index >= len(task.subtasks):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subtask index {subtask_index} out of range",
        )

    task.subtasks[subtask_index] = {
        "text": subtask_data.text,
        "complete": subtask_data.complete,
    }
    manager.save_user(user)
    return task_to_response(task)


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
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    if subtask_index < 0 or subtask_index >= len(task.subtasks):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subtask index {subtask_index} out of range",
        )

    task.subtasks.pop(subtask_index)
    manager.save_user(user)
    return task_to_response(task)


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
    if not task:
        raise HTTPException(
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

    return task_to_response(task)


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
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with ID {task_id} not found",
        )

    dep_task = user.find_task_by_id(dep_id)
    if dep_task and dep_task.id in task.dependencies:
        task.dependencies.remove(dep_task.id)
        manager.save_user(user)

    return task_to_response(task)
