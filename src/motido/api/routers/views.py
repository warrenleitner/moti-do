# motido/api/routers/views.py
# pylint: disable=too-many-branches
"""
View data API endpoints (calendar, heatmap, kanban).
"""

from collections import defaultdict
from datetime import date, datetime, timedelta

from fastapi import APIRouter

from motido.api.deps import CurrentUser
from motido.api.routers.tasks import task_to_response
from motido.api.schemas import CalendarEvent, HeatmapDay, KanbanColumn, TaskResponse

router = APIRouter(prefix="/views", tags=["views"])


# Priority colors for calendar events
PRIORITY_COLORS = {
    "Trivial": "#9e9e9e",
    "Low": "#4caf50",
    "Medium": "#2196f3",
    "High": "#ff9800",
    "Defcon One": "#f44336",
}


@router.get("/calendar", response_model=list[CalendarEvent])
async def get_calendar_events(
    user: CurrentUser,
    start_date: date | None = None,
    end_date: date | None = None,
) -> list[CalendarEvent]:
    """
    Get calendar events for tasks with due dates.
    """
    events = []

    # Default date range: current month +/- 1 month
    if start_date is None:
        start_date = date.today().replace(day=1) - timedelta(days=30)
    if end_date is None:
        end_date = date.today().replace(day=1) + timedelta(days=60)

    for task in user.tasks:
        if task.due_date is None:
            continue

        task_date = (
            task.due_date.date()
            if isinstance(task.due_date, datetime)
            else task.due_date
        )

        # Filter by date range
        if task_date < start_date or task_date > end_date:
            continue

        color = PRIORITY_COLORS.get(task.priority.value, "#2196f3")
        if task.is_complete:
            color = "#9e9e9e"  # Gray for completed

        events.append(
            CalendarEvent(
                id=task.id,
                title=f"{task.icon or ''} {task.title}".strip(),
                start=task.due_date,
                end=task.due_date,
                all_day=True,
                color=color,
                is_complete=task.is_complete,
                is_habit=task.is_habit,
            )
        )

    return events


@router.get("/heatmap", response_model=list[HeatmapDay])
async def get_heatmap_data(
    user: CurrentUser,
    weeks: int = 12,
    habit_id: str | None = None,
) -> list[HeatmapDay]:
    """
    Get heatmap data showing task completion over time.
    If habit_id is provided, shows data for that specific habit.
    """
    today = date.today()
    start_date = today - timedelta(weeks=weeks, days=today.weekday())

    # Initialize all days
    day_data: dict[date, dict[str, int]] = defaultdict(
        lambda: {"completed": 0, "total": 0}
    )

    # Current date for iteration
    current = start_date
    while current <= today:
        _ = day_data[current]  # Initialize the day (triggers defaultdict)
        current += timedelta(days=1)

    # Count completions
    for task in user.tasks:
        # Filter by habit if specified
        if habit_id:
            if habit_id not in (task.id, task.parent_habit_id):
                continue

        if task.due_date is None:
            continue

        task_date = (
            task.due_date.date()
            if isinstance(task.due_date, datetime)
            else task.due_date
        )

        if start_date <= task_date <= today:
            day_data[task_date]["total"] += 1
            if task.is_complete:
                day_data[task_date]["completed"] += 1

    return [
        HeatmapDay(
            date=d,
            completed_count=data["completed"],
            total_count=data["total"],
        )
        for d, data in sorted(day_data.items())
    ]


@router.get("/kanban", response_model=list[KanbanColumn])
async def get_kanban_data(
    user: CurrentUser,
    project: str | None = None,
    tag: str | None = None,
) -> list[KanbanColumn]:
    """
    Get kanban board data organized by status.
    """
    # Define columns with explicit types
    columns: dict[str, dict[str, str | list[TaskResponse]]] = {
        "backlog": {"title": "Backlog", "tasks": []},
        "todo": {"title": "To Do", "tasks": []},
        "in_progress": {"title": "In Progress", "tasks": []},
        "blocked": {"title": "Blocked", "tasks": []},
        "done": {"title": "Done", "tasks": []},
    }

    for task in user.tasks:
        # Skip habits (they have their own view)
        if task.is_habit:
            continue

        # Apply filters
        if project and task.project != project:
            continue
        if tag and tag not in task.tags:
            continue

        # Determine column
        if task.is_complete:
            column = "done"
        else:
            # Check if blocked by incomplete dependencies
            has_incomplete_deps = False
            for dep_id in task.dependencies:
                dep_task = user.find_task_by_id(dep_id)
                if dep_task and not dep_task.is_complete:
                    has_incomplete_deps = True
                    break

            if has_incomplete_deps:
                column = "blocked"
            elif (
                task.start_date and task.start_date > datetime.now()
            ):  # pragma: no cover
                column = "backlog"  # pragma: no cover
            elif task.due_date and task.due_date <= datetime.now() + timedelta(
                days=1
            ):  # pragma: no cover
                column = "in_progress"  # pragma: no cover
            else:
                column = "todo"

        task_list = columns[column]["tasks"]
        if isinstance(task_list, list):
            task_list.append(task_to_response(task))

    return [
        KanbanColumn(
            id=col_id,
            title=str(col_data["title"]),
            tasks=col_data["tasks"] if isinstance(col_data["tasks"], list) else [],
        )
        for col_id, col_data in columns.items()
    ]


@router.get("/habits", response_model=list[TaskResponse])
async def get_habits(
    user: CurrentUser,
    include_instances: bool = False,
) -> list[TaskResponse]:
    """
    Get all habits (root habits only by default).
    """
    habits = []

    for task in user.tasks:
        if not task.is_habit:
            continue

        # Skip child instances unless requested
        if task.parent_habit_id and not include_instances:
            continue

        habits.append(task_to_response(task))

    return habits
