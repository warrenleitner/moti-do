"""View components for CLI display (calendar, dependency graph, kanban, heatmap)."""

from datetime import date, timedelta
from typing import Dict, List, Set

from rich.console import Console
from rich.table import Table
from rich.text import Text
from rich.tree import Tree

from motido.core.models import Task


def render_dependency_graph(tasks: List[Task], console: Console) -> None:
    """
    Renders a dependency graph using Rich Tree.
    Roots are tasks that have no dependencies (can be started).
    Children are tasks that depend on the parent.
    """
    task_map = {t.id: t for t in tasks}
    # Build adjacency list: parent_id -> list of child_ids (tasks that depend on parent)
    # task.dependencies contains IDs of tasks that this task depends on.
    # So if A depends on B (A.dependencies = [B.id]), then B is a prerequisite for A.
    # In "Unblocking" view: B -> A.

    dependents: Dict[str, List[str]] = {t.id: [] for t in tasks}
    for task in tasks:
        for dep_id in task.dependencies:
            if dep_id in dependents:
                dependents[dep_id].append(task.id)

    # Find roots: Tasks that have no dependencies (or dependencies not in the current list)
    # Wait, if we want to show the flow "Prerequisite -> Dependent",
    # Roots should be tasks with NO prerequisites.

    roots = [
        t
        for t in tasks
        if not t.dependencies or all(d not in task_map for d in t.dependencies)
    ]

    if not roots:
        console.print(
            "[yellow]No independent tasks found (possible cycle or empty list).[/yellow]"
        )
        return

    tree = Tree("Dependency Graph (Flow: Prerequisite -> Dependent)")

    processed: set[str] = set()

    for root in roots:
        label = Text(f"{root.title} ({root.priority.emoji()})")
        if root.is_complete:
            label.stylize("strike dim")
        root_node = tree.add(label)
        _add_children(root_node, root.id, processed, dependents, task_map)

    console.print(tree)


def _add_children(
    node: Tree,
    task_id: str,
    processed: set[str],
    dependents: Dict[str, List[str]],
    task_map: Dict[str, Task],
) -> None:
    if task_id in processed:
        return
    processed.add(task_id)

    # Find tasks that depend on this task
    children_ids = dependents.get(task_id, [])
    for child_id in children_ids:
        if child_id in task_map:
            child_task = task_map[child_id]
            # Format child node
            label = Text(f"{child_task.title} ({child_task.priority.emoji()})")
            if child_task.is_complete:
                label.stylize("strike dim")

            child_node = node.add(label)
            _add_children(child_node, child_id, processed, dependents, task_map)


def _format_task_for_calendar(task: Task, target_date: date | None = None) -> str:
    """Format a task for display in the calendar view."""
    status = "[green]✓[/green]" if task.is_complete else "[red]○[/red]"
    time_str = ""
    if target_date and task.due_date and task.due_date.date() == target_date:
        time_str = task.due_date.strftime("%H:%M ")

    return f"{status} {time_str}{task.title} {task.priority.emoji()}"


def render_calendar(tasks: List[Task], console: Console) -> None:  # noqa: PLR0914
    """
    Renders a simple agenda/calendar view.
    Groups tasks by due date (or start date if no due date).
    """
    # Group tasks by date
    tasks_by_date: Dict[date, List[Task]] = {}
    no_date_tasks: List[Task] = []

    for task in tasks:
        d = None
        if task.due_date:
            d = task.due_date.date()
        elif task.start_date:
            d = task.start_date.date()

        if d:
            if d not in tasks_by_date:
                tasks_by_date[d] = []
            tasks_by_date[d].append(task)
        else:
            no_date_tasks.append(task)

    # Sort dates
    sorted_dates = sorted(tasks_by_date.keys())

    table = Table(
        title="Calendar / Agenda", show_header=True, header_style="bold magenta"
    )
    table.add_column("Date", style="cyan", no_wrap=True)
    table.add_column("Tasks")

    today = date.today()

    for d in sorted_dates:
        day_tasks = tasks_by_date[d]

        date_str = d.strftime("%Y-%m-%d (%a)")
        if d == today:
            date_str += " [bold red]TODAY[/bold red]"

        task_strs = [_format_task_for_calendar(t, d) for t in day_tasks]
        table.add_row(date_str, "\n".join(task_strs))

    if no_date_tasks:
        task_strs = [_format_task_for_calendar(t) for t in no_date_tasks]
        table.add_row("No Date", "\n".join(task_strs))

    console.print(table)


def _get_kanban_column(task: Task, all_tasks: Dict[str, Task]) -> str:
    """Determine which Kanban column a task belongs to."""
    if task.is_complete:
        return "Done"

    # Check for blocked (has incomplete dependencies)
    if task.dependencies:
        for dep_id in task.dependencies:
            dep_task = all_tasks.get(dep_id)
            if dep_task and not dep_task.is_complete:
                return "Blocked"

    today = date.today()

    # Check for in progress (start date has passed)
    if task.start_date and task.start_date.date() <= today:
        return "In Progress"

    # Check for backlog (future tasks - start_date or due_date in future)
    if task.start_date and task.start_date.date() > today:
        return "Backlog"
    if task.due_date and task.due_date.date() > today:
        # No start date but due in future - still in backlog
        return "Backlog"

    # Default to To Do (active tasks with no start date or start date <= today)
    return "To Do"


def _format_task_for_kanban(task: Task) -> Text:
    """Format a task for display in a Kanban column."""
    label = Text()
    label.append("• ", style="dim")
    label.append(f"{task.id[:8]} ", style="dim cyan")
    label.append(task.title)
    label.append(f" {task.priority.emoji()}")
    if task.due_date:
        label.append(f" 📅{task.due_date.strftime('%m/%d')}", style="yellow")
    return label


def render_kanban(tasks: List[Task], console: Console) -> None:
    """
    Renders a Kanban board view with columns:
    - Backlog: Future tasks (start_date or due_date in future)
    - To Do: Active tasks ready to start
    - In Progress: Tasks with start_date <= today
    - Blocked: Tasks with incomplete dependencies
    - Done: Completed tasks
    """
    task_map = {t.id: t for t in tasks}

    # Group tasks by column
    columns: Dict[str, List[Task]] = {
        "Backlog": [],
        "To Do": [],
        "In Progress": [],
        "Blocked": [],
        "Done": [],
    }

    for task in tasks:
        column = _get_kanban_column(task, task_map)
        columns[column].append(task)

    # Create a table for the Kanban board
    table = Table(title="Kanban Board", show_header=True, header_style="bold magenta")

    # Add columns
    column_styles = {
        "Backlog": "dim",
        "To Do": "cyan",
        "In Progress": "yellow",
        "Blocked": "red",
        "Done": "green",
    }

    for col_name, col_tasks in columns.items():
        count = len(col_tasks)
        table.add_column(f"{col_name} ({count})", style=column_styles[col_name])

    # Find max rows needed
    max_items = max(len(col) for col in columns.values()) if columns else 0

    # Build row data
    for i in range(max_items):
        row_data: List[Text | str] = []
        for col_name, col_tasks in columns.items():
            if i < len(col_tasks):
                row_data.append(_format_task_for_kanban(col_tasks[i]))
            else:
                row_data.append("")
        table.add_row(*row_data)

    console.print(table)
    console.print()
    console.print("Legend: 📅 = Due date", style="dim")


def _get_completion_dates_for_habit(tasks: List[Task], habit_id: str) -> Set[date]:
    """Get all dates when a habit (or its instances) was completed."""
    completion_dates: Set[date] = set()

    for task in tasks:
        # Include the habit itself if completed
        if task.id == habit_id and task.is_complete and task.due_date:
            completion_dates.add(task.due_date.date())
        # Include child instances (parent_habit_id points to original)
        if task.parent_habit_id == habit_id and task.is_complete and task.due_date:
            completion_dates.add(task.due_date.date())

    return completion_dates


def _get_heatmap_char(count: int) -> tuple[str, str]:
    """Get character and color based on completion count."""
    if count == 0:
        return "·", "dim"  # pragma: no cover  # Future use for intensity
    if count == 1:
        return "▪", "green"
    if count == 2:  # pragma: no cover  # Future use for intensity
        return "▫", "bright_green"
    return "█", "bold green"  # pragma: no cover  # Future use for intensity


def _build_week_labels(start_date: date, weeks: int) -> List[str]:
    """Build week labels showing month when week starts."""
    week_labels: List[str] = []
    current = start_date
    for _ in range(weeks):
        week_start = current - timedelta(days=current.weekday())
        if week_start.day <= 7:
            week_labels.append(week_start.strftime("%b"))
        else:
            week_labels.append("   ")
        current += timedelta(days=7)
    return week_labels


# pylint: disable=too-many-arguments, too-many-positional-arguments
def _render_heatmap_row(
    day_idx: int,
    day_name: str,
    start_date: date,
    weeks: int,
    today: date,
    completion_dates: Set[date],
) -> Text:
    """Render a single row of the heatmap."""
    row = Text()
    row.append(f"{day_name} ", style="dim")

    current = start_date
    for _ in range(weeks):
        week_start = current - timedelta(days=current.weekday())
        target_date = week_start + timedelta(days=day_idx)

        if target_date > today:
            row.append("  · ", style="dim")
        elif target_date in completion_dates:
            char, style = _get_heatmap_char(1)
            row.append(f"  {char} ", style=style)
        else:
            row.append("  · ", style="dim")

        current += timedelta(days=7)

    return row


def _find_habits_to_show(
    tasks: List[Task], habit_id: str | None, console: Console
) -> List[Task] | None:
    """Find habits to display in heatmap.

    Only returns root habits (those without parent_habit_id) since
    child instances are tracked by their parent.
    """
    if habit_id:
        habit = next(
            (t for t in tasks if t.id.startswith(habit_id) and t.is_habit), None
        )
        if not habit:
            console.print(f"[red]Habit not found with ID prefix: {habit_id}[/red]")
            return None
        return [habit]

    # Only show root habits (no parent_habit_id)
    habits = [t for t in tasks if t.is_habit and not t.parent_habit_id]
    if not habits:
        console.print("[yellow]No habits found.[/yellow]")
        return None
    return habits


def _render_habit_heatmap(
    habit: Task,
    tasks: List[Task],
    start_date: date,
    weeks: int,
    today: date,
    console: Console,
) -> None:
    """Render heatmap for a single habit."""
    completion_dates = _get_completion_dates_for_habit(tasks, habit.id)
    console.print(f"[bold]{habit.title}[/bold]")

    # Build and print week labels
    week_labels = _build_week_labels(start_date, weeks)
    header_line = "     " + " ".join(f"{lbl:>3}" for lbl in week_labels)
    console.print(header_line, style="dim")

    # Render each day row
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    for day_idx, day_name in enumerate(day_names):
        row = _render_heatmap_row(
            day_idx, day_name, start_date, weeks, today, completion_dates
        )
        console.print(row)

    console.print()


def render_heatmap(
    tasks: List[Task], habit_id: str | None, console: Console, weeks: int = 12
) -> None:
    """
    Renders a calendar heatmap showing habit completion over time.

    Shows a grid with weeks as columns and days as rows:
    - · = no completion (or not applicable)
    - ▪ = completed once

    Args:
        tasks: All user tasks
        habit_id: Specific habit ID to show, or None for all habits
        console: Rich Console for output
        weeks: Number of weeks to display (default 12)
    """
    today = date.today()
    # Calculate start_date as the Monday of (weeks-1) weeks ago
    # This ensures the current week is included
    this_monday = today - timedelta(days=today.weekday())
    start_date = this_monday - timedelta(weeks=weeks - 1)

    habits_to_show = _find_habits_to_show(tasks, habit_id, console)
    if habits_to_show is None:
        return

    console.print(f"[bold cyan]Habit Heatmap (last {weeks} weeks)[/bold cyan]")
    console.print()

    for habit in habits_to_show:
        _render_habit_heatmap(habit, tasks, start_date, weeks, today, console)

    # Legend
    legend = Text("Legend: ", style="dim")
    legend.append("· ", style="dim")
    legend.append("no data  ", style="dim")
    legend.append("▪ ", style="green")
    legend.append("completed", style="dim")
    console.print(legend)
