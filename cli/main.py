import argparse
import sys
from pathlib import Path
from typing import Dict, Any, Optional, List
import datetime

# Add project root to sys.path
project_root = Path(__file__).parent.parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
    print(f"Added {project_root} to sys.path") # Debug print

# Attempt to import necessary components
try:
    from cli.initialize import initialize_cli
    # Import the command registration function
    from cli.commands.task import register_task_commands
    print("Successfully imported initialize_cli and command registration") # Debug print
    # Import Task model and Enums if they exist and are needed for validation/choices
    # from library.datatypes import Task, ImportanceLevel, DifficultyLevel, DurationLevel, RecurrenceType, Weekday
except ImportError as e:
    print(f"Critical Error: Could not import necessary components: {e}.", file=sys.stderr)
    print("Please ensure cli/initialize.py and cli/commands/task.py exist and are importable.", file=sys.stderr)
    sys.exit(1)
    # Provide dummy functions if imports fail to allow basic structure check,
    # but the CLI won't be functional.
    def initialize_cli(**kwargs) -> Dict[str, Any]:
        print("Warning: Using dummy initialize_cli.", file=sys.stderr)
        return {'repositories': {}, 'settings': {}}
    def register_task_commands(subparsers):
        print("Warning: Using dummy command registration.", file=sys.stderr)
        pass
    # Define dummy Enums if needed for choices (adjust values as needed)
    class ImportanceLevel: Low = "Low"; Medium = "Medium"; High = "High"; DefconOne = "DefconOne"; NotSet = "NotSet"
    class DifficultyLevel: Trivial = "Trivial"; Low = "Low"; Medium = "Medium"; High = "High"; Herculean = "Herculean"; NotSet = "NotSet"
    class DurationLevel: Trivial = "Trivial"; Short = "Short"; Medium = "Medium"; Long = "Long"; Odysseyan = "Odysseyan"; NotSet = "NotSet"
    class RecurrenceType: fixed = "fixed"; weekly = "weekly"; monthly_day = "monthly_day" # Add others as needed
    class Weekday: Mon = "Mon"; Tue = "Tue"; Wed = "Wed"; Thu = "Thu"; Fri = "Fri"; Sat = "Sat"; Sun = "Sun"


# --- Helper Functions (Example: Date Parsing) ---
def parse_date(date_string: Optional[str]) -> Optional[datetime.datetime]:
    """Parses a date string in YYYY-MM-DD format."""
    if not date_string:
        return None
    try:
        return datetime.datetime.strptime(date_string, "%Y-%m-%d")
    except ValueError:
        raise argparse.ArgumentTypeError(f"Invalid date format: {date_string}. Please use YYYY-MM-DD.")

# --- Command Handlers ---
def handle_add_task(args: argparse.Namespace, config: Dict[str, Any]):
    """Handles the 'add' command logic."""
    print("Handling 'add' command...")
    print(f"Received arguments: {args}")

    # 1. Validate Arguments (Example: Recurrence dependencies)
    if args.recurrence_type:
        if args.recurrence_type == RecurrenceType.fixed:
            if not args.recurrence_interval or not args.recurrence_unit:
                print("Error: For fixed recurrence, --recurrence-interval and --recurrence-unit are required.", file=sys.stderr)
                sys.exit(1)
        elif args.recurrence_type == RecurrenceType.weekly:
            if not args.recurrence_days:
                print("Error: For weekly recurrence, --recurrence-days is required.", file=sys.stderr)
                sys.exit(1)
            # Interval is optional for weekly, defaults to 1 if not provided maybe?
        elif args.recurrence_type == RecurrenceType.monthly_day:
             if not args.recurrence_day_of_month:
                 print("Error: For monthly_day recurrence, --recurrence-day-of-month is required.", file=sys.stderr)
                 sys.exit(1)
        # Add checks for other recurrence types...

    # 2. Prepare Task Data (Placeholder)
    # In a real scenario, map args to the Task dataclass/model fields
    task_data = {
        "title": args.title,
        "description": args.description,
        "icon": args.icon,
        "project_id": args.project, # Assume mapping name/ID happens here or in repo
        "tag_ids": args.tags,       # Assume mapping names/IDs happens here or in repo
        "due_date": parse_date(args.due_date),
        "start_date": parse_date(args.start_date),
        "importance": args.importance,
        "difficulty": args.difficulty,
        "duration": args.duration,
        "dependency_ids": args.dependencies, # Assume mapping happens here or in repo
        "subtask_titles": args.subtasks,     # Need logic to create actual subtasks
        "is_starred": args.starred,
        "is_frogged": args.frog,
        "note": args.note,
        # Recurrence needs careful mapping based on type and related args
        "recurrence_rule": None # Placeholder for the constructed recurrence rule
    }

    # Construct recurrence rule based on validated args (complex logic)
    if args.recurrence_type:
        # Placeholder: This logic would build the actual recurrence object/dict
        print(f"Constructing recurrence: type={args.recurrence_type}, interval={args.recurrence_interval}, unit={args.recurrence_unit}, days={args.recurrence_days}, day_of_month={args.recurrence_day_of_month}")
        task_data['recurrence_rule'] = {
            'type': args.recurrence_type,
            'interval': args.recurrence_interval,
            'unit': args.recurrence_unit,
            'days': args.recurrence_days,
            'day_of_month': args.recurrence_day_of_month,
            # Add other recurrence fields based on type
        }
        print(f"Placeholder recurrence rule: {task_data['recurrence_rule']}")


    print("Prepared Task Data (Placeholder):")
    # Pretty print the dictionary
    import json
    print(json.dumps(task_data, indent=2, default=str)) # Use default=str for datetime

    # 3. Use Repository to Save Task (Placeholder)
    task_repo = config['repositories'].get('task')
    if task_repo:
        try:
            # Assuming task_repo.add() takes the task data dictionary or a Task object
            # new_task = Task(**task_data) # Ideally, create the model instance
            # task_repo.add(new_task)
            print(f"Simulating: Calling task_repo.add() with task data for '{args.title}'")
            # task_repo.save(task_data) # Or whatever the method is called
            print("Task added successfully (simulated).")
        except Exception as e:
            print(f"Error adding task via repository: {e}", file=sys.stderr)
            sys.exit(1)
    else:
        print("Error: Task repository not available.", file=sys.stderr)
        sys.exit(1)


# --- Main Application Logic ---
def main():
    """Main entry point for the Moti-Do CLI."""
    # 1. Initialize Configuration (Storage, Repositories)
    try:
        config = initialize_cli() # Let initialize handle defaults/prompts
        print("Initialization successful.")
        print(f"Using storage type: {config.get('storage_type')}")
        print(f"Using storage path: {config.get('storage_path')}")
    except Exception as e:
        print(f"Critical Error during initialization: {e}", file=sys.stderr)
        sys.exit(1)


    # 2. Set up Argument Parser
    parser = argparse.ArgumentParser(description="Moti-Do: Command Line Task Manager")
    subparsers = parser.add_subparsers(dest="command", help="Available commands", required=True)

    # --- Register Commands from Modules ---
    register_task_commands(subparsers)
    # Add calls to register commands from other modules here
    # e.g., register_project_commands(subparsers)
    # e.g., register_tag_commands(subparsers)

    # 3. Parse Arguments
    args = parser.parse_args()

    # 4. Execute Command Function
    if hasattr(args, 'func'):
        # Pass the parsed args and the config dict to the handler function
        args.func(args, config)
    else:
        # This should not happen if subparsers are required=True
        print("Error: No command specified.", file=sys.stderr)
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main() 