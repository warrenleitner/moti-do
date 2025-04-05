import sys
from rich.console import Console
from rich.table import Table
from library.marvin_parser import load_data_from_file
from library.slim_classes import Task, Category, RecurringTask, Habit

def display_tasks(console: Console, tasks: dict):
    """Displays tasks in a table using SlimTask objects."""
    table = Table(title="Tasks", show_header=True, header_style="bold magenta")
    table.add_column("ID", style="dim", width=12)
    table.add_column("Title")
    table.add_column("Status", width=8)
    table.add_column("Parent ID", style="dim", width=12)
    table.add_column("Due Date", width=10)
    table.add_column("Estimate (m)", width=8, justify="right")

    count = 0
    for task_id, task in tasks.items():
        if count >= 20: # Limit output for brevity
             table.add_row("...", "...", "...", "...", "...", "...")
             break
        status = "Done" if task.done else "Open"
        estimate_min = str(task.timeEstimate // 60000) if task.timeEstimate else "-"
        table.add_row(
            task._id,
            task.title,
            status,
            task.parentId if task.parentId else "-",
            task.dueDate if task.dueDate else "-",
            estimate_min
        )
        count += 1
    console.print(table)

def display_categories(console: Console, categories: dict):
    """Displays categories and projects in a table using SlimCategory objects."""
    table = Table(title="Categories/Projects", show_header=True, header_style="bold blue")
    table.add_column("ID", style="dim", width=12)
    table.add_column("Title")
    table.add_column("Parent ID", style="dim", width=12)
    table.add_column("Status", width=8)

    count = 0
    for cat_id, cat in categories.items():
        if count >= 20:
            table.add_row("...", "...", "...", "...")
            break
        status = "Done" if cat.done else "Active"
        table.add_row(
            cat._id,
            cat.title,
            cat.parentId if cat.parentId else "-",
            status
        )
        count += 1
    console.print(table)

def display_recurring_tasks(console: Console, recurring_tasks: dict):
    """Displays recurring tasks in a table using SlimRecurringTask objects."""
    table = Table(title="Recurring Tasks", show_header=True, header_style="bold green")
    table.add_column("ID", style="dim", width=12)
    table.add_column("Recurrence Type", width=15)
    table.add_column("Recurrence Rule", width=20)

    count = 0
    for rec_id, rec in recurring_tasks.items():
        if count >= 15:
            table.add_row("...", "...", "...")
            break
        rule = f"{rec.type}"
        if rec.repeat: rule += f" every {rec.repeat}"
        if rec.weekDays: rule += f" on {','.join(map(str, rec.weekDays))}"
        if rec.customRecurrence: rule = rec.customRecurrence # Prefer custom string if exists
        elif rec.echoDays: rule = f"echo after {rec.echoDays} days"

        table.add_row(
            rec._id,
            rec.type.capitalize(),
            rule
        )
        count += 1
    console.print(table)

def display_habits(console: Console, habits: dict):
    """Displays habits in a table using SlimHabit objects."""
    table = Table(title="Habits", show_header=True, header_style="bold cyan")
    table.add_column("ID", style="dim", width=12)
    table.add_column("Title")
    table.add_column("Type", width=10)
    table.add_column("Period", width=8)
    table.add_column("Target", width=8)
    table.add_column("Units", width=10)

    count = 0
    for habit_id, habit in habits.items():
        if count >= 15:
             table.add_row("...", "...", "...", "...", "...", "...")
             break
        habit_type = ("Positive" if habit.isPositive else "Negative") + f" ({habit.recordType})"
        table.add_row(
            habit._id,
            habit.title,
            habit_type,
            habit.period if habit.period else "-",
            str(habit.target) if habit.target is not None else "-",
            habit.units if habit.units else "-"
        )
        count += 1
    console.print(table)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python marvin_cli_viewer.py <json_file_path>")
        sys.exit(1)

    file_path = sys.argv[1]

    try:
        tables_data = load_data_from_file(file_path)
    except Exception as e:
        print(f"Error loading or parsing data: {e}")
        sys.exit(1)

    console = Console()

    console.print(f"[bold underline]Marvin Data Overview for {file_path}[/bold underline]")

    # Display each table if data exists
    if "Tasks" in tables_data:
        display_tasks(console, tables_data["Tasks"])
        console.print() # Add space between tables
    if "Categories" in tables_data:
        display_categories(console, tables_data["Categories"])
        console.print()
    if "RecurringTasks" in tables_data:
        display_recurring_tasks(console, tables_data["RecurringTasks"])
        console.print()
    if "Habits" in tables_data:
        display_habits(console, tables_data["Habits"])
        console.print()

    # Add more displays for DayItems, ProfileItems, LocalStorageItems if needed
    # For example:
    # if "DayItems" in tables_data: display_day_items(console, tables_data["DayItems"])
    # if "ProfileItems" in tables_data: display_profile_items(console, tables_data["ProfileItems"])
    # if "LocalStorageItems" in tables_data: display_local_storage_items(console, tables_data["LocalStorageItems"])

    console.print("[bold green]Finished displaying data.[/bold green]") 