from datetime import date
from typing import Dict, List

from rich.console import Console
from rich.table import Table
from rich.tree import Tree
from rich.text import Text

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
    
    roots = [t for t in tasks if not t.dependencies or all(d not in task_map for d in t.dependencies)]
    
    if not roots:
        console.print("[yellow]No independent tasks found (possible cycle or empty list).[/yellow]")
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


def render_calendar(tasks: List[Task], console: Console) -> None:
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

    table = Table(title="Calendar / Agenda", show_header=True, header_style="bold magenta")
    table.add_column("Date", style="cyan", no_wrap=True)
    table.add_column("Tasks")

    today = date.today()

    for d in sorted_dates:
        day_tasks = tasks_by_date[d]
        
        date_str = d.strftime("%Y-%m-%d (%a)")
        if d == today:
            date_str += " [bold red]TODAY[/bold red]"
        
        task_list: List[str] = []
        for t in day_tasks:
            status = "[green]✓[/green]" if t.is_complete else "[red]○[/red]"
            time_str = ""
            if t.due_date and t.due_date.date() == d:
                time_str = t.due_date.strftime("%H:%M ")
            
            task_str = f"{status} {time_str}{t.title} {t.priority.emoji()}"
            task_list.append(task_str)
        
        table.add_row(date_str, "\n".join(task_list))

    if no_date_tasks:
        task_list = []
        for t in no_date_tasks:
            status = "[green]✓[/green]" if t.is_complete else "[red]○[/red]"
            task_str = f"{status} {t.title} {t.priority.emoji()}"
            task_list.append(task_str)
        table.add_row("No Date", "\n".join(task_list))

    console.print(table)
