# cli/main.py
"""
Command Line Interface (CLI) for the Moti-Do application.
Provides commands to initialize, create, view, list, and edit tasks.
"""

import argparse
import sys
from argparse import Namespace  # Import Namespace
from datetime import datetime
from typing import Any, Callable, TypeVar

# Import rich for table formatting
from rich.console import Console
from rich.table import Table
from rich.text import Text

# Updated imports
from motido.core.models import Difficulty, Priority, Task, User  # Added Difficulty
from motido.data.abstraction import DataManager  # For type hinting
from motido.data.abstraction import DEFAULT_USERNAME
from motido.data.backend_factory import get_data_manager
from motido.data.config import load_config, save_config

T = TypeVar("T")


# --- Verbose Print Helper ---
def print_verbose(args: Namespace, *print_args: Any, **print_kwargs: Any) -> None:
    """Prints messages only if verbose mode is enabled."""
    if args.verbose:
        print(*print_args, **print_kwargs)


def handle_init(args: Namespace) -> None:
    """Handles the 'init' command."""
    print_verbose(args, "Initializing Moti-Do...")
    config = {"backend": args.backend}
    save_config(config)
    try:
        manager = get_data_manager()  # Get manager based on *new* config
        manager.initialize()  # Initialize the chosen backend
        print(f"Initialization complete. Using '{args.backend}' backend.")
    except (IOError, OSError) as e:
        print(f"An error occurred during initialization: {e}")
        # Optionally revert config change or provide more guidance
        sys.exit(1)
    except Exception as e:  # pylint: disable=broad-exception-caught
        # Broad exception is needed for initialization to handle unexpected backend errors
        # while maintaining a clean exit for the CLI
        print(f"An error occurred during initialization: {e}")
        sys.exit(1)


def handle_create(args: Namespace, manager: DataManager, user: User | None) -> None:
    """Handles the 'create' command."""
    if (not args.description) or args.description == "":
        print("Error: Task description cannot be empty.")
        sys.exit(1)

    print_verbose(args, f"Creating task: '{args.description}'...")

    # Get the priority from args, default to LOW if not specified
    try:
        # Convert string to Priority enum
        priority = Priority(args.priority) if args.priority else Priority.LOW
    except ValueError:
        print(
            f"Error: Invalid priority '{args.priority}'. "
            f"Valid values are: {', '.join([p.value for p in Priority])}"
        )
        sys.exit(1)

    # Get the difficulty from args, default to TRIVIAL if not specified
    difficulty = Difficulty.TRIVIAL  # Default
    if args.difficulty:
        try:
            difficulty = Difficulty(args.difficulty)
        except ValueError:
            print(
                f"Error: Invalid difficulty '{args.difficulty}'. "
                f"Valid values are: {', '.join([d.value for d in Difficulty])}"
            )
            sys.exit(1)

    if user is None:
        # If user doesn't exist, create a new one
        print_verbose(args, f"User '{DEFAULT_USERNAME}' not found. Creating new user.")
        user = User(username=DEFAULT_USERNAME)
    # No need for isinstance check since we're using type hints and mypy

    # Create a new task with the current timestamp as creation_date
    new_task = Task(
        description=args.description,
        priority=priority,
        difficulty=difficulty,  # Add difficulty
        creation_date=datetime.now(),
    )
    user.add_task(new_task)
    try:
        manager.save_user(user)
        print(f"Task created successfully with ID prefix: {new_task.id[:8]}")
    except (IOError, OSError, ValueError) as e:
        print(f"Error saving task: {e}")
        sys.exit(1)
    except Exception as e:  # pylint: disable=broad-exception-caught
        # Broad exception required to ensure graceful CLI exit if unexpected errors occur
        # during task creation
        print(f"Error saving task: {e}")
        sys.exit(1)


def handle_list(args: Namespace, _manager: DataManager, user: User | None) -> None:
    """Handles the 'list' command."""
    print_verbose(args, "Listing all tasks...")

    if user and user.tasks:
        # Sort tasks if sort_by is specified
        if hasattr(args, "sort_by") and args.sort_by:
            reverse = False
            if hasattr(args, "sort_order") and args.sort_order == "desc":
                reverse = True

            if args.sort_by == "id":
                user.tasks.sort(key=lambda task: task.id, reverse=reverse)
            elif args.sort_by == "description":
                user.tasks.sort(
                    key=lambda task: task.description.lower(), reverse=reverse
                )
            elif args.sort_by == "priority":
                # Sort by priority (using the enum's order)
                priority_order = {
                    Priority.TRIVIAL: 1,
                    Priority.LOW: 2,
                    Priority.MEDIUM: 3,
                    Priority.HIGH: 4,
                    Priority.DEFCON_ONE: 5,
                }
                user.tasks.sort(
                    key=lambda task: priority_order[task.priority], reverse=reverse
                )

        # --- Display tasks using rich.table.Table ---
        console = Console()
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("ID Prefix", style="dim", width=12)
        table.add_column("Priority", width=15)
        table.add_column("Difficulty", width=15)
        table.add_column("Description")

        for task in user.tasks:
            # Add task details to the table with priority and difficulty emoji
            priority_text = f"{task.priority.emoji()} {task.priority.value}"
            difficulty_text = f"{task.difficulty.emoji()} {task.difficulty.value}"
            table.add_row(task.id[:8], priority_text, difficulty_text, task.description)

        console.print(table)
        # --- End rich table display ---

        print(f"Total tasks: {len(user.tasks)}")
    elif user:
        print("No tasks found.")
    else:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        print("Hint: Run 'motido init' first if you haven't already.")


def handle_view(args: Namespace, _manager: DataManager, user: User | None) -> None:
    """Handles the 'view' command."""
    if not args.id:  # pragma: no cover
        print("Error: Please provide a task ID prefix using --id.")
        sys.exit(1)

    print_verbose(args, f"Viewing task with ID prefix: '{args.id}'...")

    if not user:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        task = user.find_task_by_id(args.id)
        if task:
            # --- Display task details using rich.table.Table ---
            console = Console()
            table = Table(show_header=False, box=None, show_edge=False)
            table.add_column("Attribute", style="bold cyan")
            table.add_column("Value")
            table.add_row("ID:", task.id)

            # Display priority with emoji and colored text
            priority_text = Text()
            priority_text.append(f"{task.priority.emoji()} ")
            priority_text.append(
                task.priority.value, style=task.priority.display_style()
            )
            table.add_row("Priority:", priority_text)

            # Format creation_date as YYYY-MM-DD HH:MM:SS
            formatted_date = task.creation_date.strftime("%Y-%m-%d %H:%M:%S")
            table.add_row("Created:", formatted_date)

            # Display difficulty with emoji and style
            difficulty_text = Text()
            difficulty_text.append(f"{task.difficulty.emoji()} ")
            difficulty_text.append(
                task.difficulty.value, style=task.difficulty.display_style()
            )
            table.add_row("Difficulty:", difficulty_text)

            table.add_row("Description:", task.description)
            console.print(table)
            # --- End rich table display ---
        else:
            print(f"Error: Task with ID prefix '{args.id}' not found.")
            sys.exit(1)
    except ValueError as e:  # Handles ambiguous ID prefix
        print(f"Error: {e}")
        sys.exit(1)
    except (AttributeError, TypeError) as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)
    except Exception as e:  # pylint: disable=broad-exception-caught
        # Broad exception required to handle any unforeseen issues when accessing task data
        # and ensure clean CLI exit
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)


def _update_task_description(task: Task, new_description: str) -> str:
    """Update task description and return the old value."""
    old_description = task.description
    task.description = new_description
    return old_description


def _update_task_priority(task: Task, priority_str: str) -> Priority:
    """Update task priority and return the old value.

    Raises:
        ValueError: If the priority string is invalid.
    """
    old_priority = task.priority
    task.priority = Priority(priority_str)
    return old_priority


def _update_task_difficulty(task: Task, difficulty_str: str) -> Difficulty:
    """Update task difficulty and return the old value.

    Raises:
        ValueError: If the difficulty string is invalid.
    """
    old_difficulty = task.difficulty
    task.difficulty = Difficulty(difficulty_str)  # Raises ValueError if invalid
    return old_difficulty


# pylint: disable=too-many-arguments,too-many-positional-arguments
def _print_task_updates(
    task: Task,
    description_updated: bool,
    old_description: str | None,
    priority_updated: bool,
    old_priority: Priority | None,
    difficulty_updated: bool,  # Add this
    old_difficulty: Difficulty | None,  # Add this
) -> None:
    """Print task update details."""
    print("Task updated successfully:")
    if description_updated:
        print(f"  Old Description: {old_description}")
        print(f"  New Description: {task.description}")
    if priority_updated:
        # Narrow old_priority to non-None for mypy
        assert old_priority is not None
        print(f"  Old Priority: {old_priority.value}")
        print(f"  New Priority: {task.priority.value}")
    if difficulty_updated:
        assert old_difficulty is not None  # For mypy
        print(f"  Old Difficulty: {old_difficulty.value}")
        print(f"  New Difficulty: {task.difficulty.value}")


# pylint: disable=too-many-branches,too-many-statements
def handle_edit(args: Namespace, manager: DataManager, user: User | None) -> None:
    """Handles the 'edit' command."""
    if not args.id:
        print("Error: --id is required for editing.")
        sys.exit(1)

    if (
        not args.description and not args.priority and not args.difficulty
    ):  # Add difficulty check
        print("No changes specified. Nothing to update.")
        return  # Exit the function gracefully, do not proceed

    print_verbose(args, f"Editing task with ID prefix: '{args.id}'...")

    if not user:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        task_to_edit = user.find_task_by_id(args.id)
        if not task_to_edit:
            print(f"Error: Task with ID prefix '{args.id}' not found.")
            sys.exit(1)

        # Initialize variables
        changes_made = False
        old_description = None
        old_priority = None
        old_difficulty = None  # Add this

        # Update description if provided
        description_updated = False
        if args.description:
            old_description = _update_task_description(task_to_edit, args.description)
            description_updated = True
            changes_made = True

        # Update priority if provided
        priority_updated = False
        if args.priority:
            try:
                old_priority = _update_task_priority(task_to_edit, args.priority)
                priority_updated = True
                changes_made = True
            except ValueError:
                print(
                    f"Error: Invalid priority '{args.priority}'. "
                    f"Valid values are: {', '.join([p.value for p in Priority])}"
                )
                sys.exit(1)

        # Update difficulty if provided
        difficulty_updated = False
        if args.difficulty:
            try:
                old_difficulty = _update_task_difficulty(task_to_edit, args.difficulty)
                difficulty_updated = True
                changes_made = True
            except ValueError:
                print(
                    f"Error: Invalid difficulty '{args.difficulty}'. "
                    f"Valid values are: {', '.join([d.value for d in Difficulty])}"
                )
                sys.exit(1)

        if changes_made:
            manager.save_user(user)
            _print_task_updates(
                task_to_edit,
                description_updated,
                old_description,
                priority_updated,
                old_priority,
                difficulty_updated,  # Add this
                old_difficulty,  # Add this
            )

    except ValueError as e:  # Catches find_task_by_id ambiguity or invalid enum value
        print(f"Error: {e}")
        sys.exit(1)
    except (IOError, OSError) as e:  # Should catch the save_user IOError
        print(f"Error saving task update: {e}")
        sys.exit(1)
    except Exception as e:  # pylint: disable=broad-exception-caught
        # Broad exception required to handle any unforeseen issues when accessing task data
        # and ensure clean CLI exit
        print(f"Error saving updated task: {e}")
        sys.exit(1)


def handle_delete(args: Namespace, manager: DataManager, user: User | None) -> None:
    """Handles the 'delete' command."""
    if not args.id:
        print("Error: Please provide a task ID prefix using --id.")
        sys.exit(1)

    print_verbose(args, f"Deleting task with ID prefix: '{args.id}'...")

    if not user:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        # Assuming user.remove_task returns True if deleted, False if not found
        # and raises ValueError for ambiguity (delegated from find_task_by_id)
        task_deleted = user.remove_task(args.id)
        if task_deleted:
            try:  # pragma: no cover
                manager.save_user(user)  # Save first
                print(f"Task '{args.id}' deleted successfully.")  # Then print success
            except IOError as e:
                print(f"Error saving after deleting task: {e}")
                sys.exit(1)
            except Exception as e:  # pylint: disable=broad-exception-caught
                print(f"Error saving after deleting task: {e}")
                sys.exit(1)
        else:
            print(f"Error: Task with ID prefix '{args.id}' not found.")
            sys.exit(1)

    except ValueError as e:  # Handles ambiguous ID prefix from underlying find
        print(f"Error: {e}")
        sys.exit(1)
    except (AttributeError, TypeError) as e:
        print(f"An unexpected error occurred during deletion: {e}")
        sys.exit(1)
    except Exception as e:  # pylint: disable=broad-exception-caught
        # Broad exception required to handle any unforeseen issues when accessing task data
        # and ensure clean CLI exit
        print(f"An unexpected error occurred during deletion: {e}")
        sys.exit(1)  # Exit after printing error # pragma: no cover


def _wrap_handler(
    handler_func: Callable[[argparse.Namespace, DataManager, User | None], T],
) -> Callable[[argparse.Namespace, DataManager, User | None], T]:
    """Wrapper function to ensure handler functions receive all required arguments."""

    def wrapped(args: argparse.Namespace, manager: DataManager, user: User | None) -> T:
        return handler_func(args, manager, user)

    return wrapped


def setup_parser() -> argparse.ArgumentParser:
    """Set up and configure the argument parser for the CLI.

    Returns:
        argparse.ArgumentParser: Configured argument parser with
        all commands and options.
    """
    parser = argparse.ArgumentParser(description="Moti-Do: Task Management CLI")
    subparsers = parser.add_subparsers(
        dest="command", help="Available commands", required=True
    )

    # --- Global Arguments ---
    parser.add_argument(
        "-v",
        "--verbose",
        action="store_true",
        help="Enable verbose output for commands.",
    )

    # --- Init Command ---
    parser_init = subparsers.add_parser(
        "init", help="Initialize the application and select backend."
    )
    parser_init.add_argument(
        "--backend",
        choices=["json", "db"],
        default=load_config().get("backend", "json"),  # Default to current or 'json'
        help="Specify the data storage backend (json or db).",
    )
    parser_init.set_defaults(func=handle_init)

    # --- Create Command ---
    parser_create = subparsers.add_parser("create", help="Create a new task.")
    parser_create.add_argument(
        "-d",
        "--description",
        required=True,
        help="The description of the task.",
    )
    parser_create.add_argument(
        "-p",
        "--priority",
        choices=[p.value for p in Priority],
        default=Priority.LOW.value,
        help=f"The priority of the task. Default is '{Priority.LOW.value}'.",
    )
    parser_create.add_argument(
        "-f",  # Short flag for difficulty
        "--difficulty",
        choices=[d.value for d in Difficulty],
        # Default is handled in the model, no CLI default needed
        help=f"The difficulty of the task. Valid values: {', '.join([d.value for d in Difficulty])}.",
    )
    parser_create.set_defaults(func=_wrap_handler(handle_create))

    # --- List Command ---
    parser_list = subparsers.add_parser("list", help="List all tasks.")
    parser_list.add_argument(
        "--sort-by",
        choices=["id", "description", "priority"],
        help="Field to sort tasks by.",
    )
    parser_list.add_argument(
        "--sort-order",
        choices=["asc", "desc"],
        default="asc",
        help="Sort order: ascending (asc) or descending (desc).",
    )
    parser_list.set_defaults(func=_wrap_handler(handle_list))

    # --- View Command ---
    parser_view = subparsers.add_parser("view", help="View details of a specific task.")
    parser_view.add_argument(
        "--id",
        required=True,
        help="The full or unique partial ID of the task to view.",
    )
    parser_view.set_defaults(func=_wrap_handler(handle_view))

    # --- Edit Command ---
    parser_edit = subparsers.add_parser(
        "edit",
        help="Edit the description, priority, or difficulty of an existing task.",  # Updated help
    )
    parser_edit.add_argument(
        "--id",
        required=True,
        help="The full or unique partial ID of the task to edit.",
    )
    parser_edit.add_argument(
        "-d",
        "--description",
        required=False,
        help="The new description for the task.",
    )
    parser_edit.add_argument(
        "-p",
        "--priority",
        choices=[p.value for p in Priority],
        help="The new priority for the task.",
    )
    parser_edit.add_argument(
        "-f",
        "--difficulty",
        choices=[d.value for d in Difficulty],
        help="The new difficulty for the task.",
    )
    parser_edit.set_defaults(func=_wrap_handler(handle_edit))

    # --- Delete Command ---
    parser_delete = subparsers.add_parser("delete", help="Delete a task by ID.")
    parser_delete.add_argument(
        "--id",
        required=True,
        help="The full or unique partial ID of the task to delete.",
    )
    parser_delete.set_defaults(func=_wrap_handler(handle_delete))

    return parser


def main() -> None:
    """Main function to parse arguments and dispatch commands."""
    # Parse arguments
    args = setup_parser().parse_args()

    # --- Execute Command ---
    # The 'init' command doesn't need a pre-fetched manager or user
    if args.command == "init":
        args.func(args)
        return

    # Get the manager *once* for other commands
    manager = get_data_manager()
    user = None  # Initialize user to None

    # Load user for commands that require it
    if args.command in ["create", "list", "view", "edit", "delete"]:
        try:
            user = manager.load_user(DEFAULT_USERNAME)
            if user is None and args.command != "create":
                print_verbose(
                    args, f"User '{DEFAULT_USERNAME}' not found."
                )  # pragma: no cover
        except (IOError, OSError, ValueError) as e:
            print(f"Error loading user data: {e}")
            print("Hint: If you haven't initialized, run 'motido init'.")
            sys.exit(1)
        except Exception as e:  # pylint: disable=broad-exception-caught
            # Broad exception is needed here to prevent unexpected crashes
            # during user data loading and to provide helpful error messages
            print(f"An unexpected error occurred loading user data: {e}")
            sys.exit(1)

    # Execute the command, passing manager and user
    try:
        args.func(args, manager=manager, user=user)
    except (IOError, OSError, ValueError, AttributeError, TypeError) as e:
        print(f"Error: {e}")
        print("If you haven't initialized the application, try running 'motido init'.")
        sys.exit(1)
    except Exception as e:  # pylint: disable=broad-exception-caught
        # Broad exception is necessary as the final safety net to prevent
        # the CLI from crashing with an unhandled exception under any circumstances
        print(f"Error: {e}")
        print("If you haven't initialized the application, try running 'motido init'.")
        sys.exit(1)


if __name__ == "__main__":
    main()  # pragma: no cover
