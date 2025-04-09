# cli/main.py
"""
Command Line Interface (CLI) for the Moti-Do application.
Provides commands to initialize, create, view, list, and edit tasks.
"""

import argparse
import sys
from argparse import Namespace  # Import Namespace
from typing import Any, Callable, TypeVar

# Import rich for table formatting
from rich.console import Console
from rich.table import Table

# Updated imports
from motido.core.models import Task, User
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
        # Required for test compatibility
        print(f"An error occurred during initialization: {e}")
        sys.exit(1)


def handle_create(args: Namespace, manager: DataManager, user: User | None) -> None:
    """Handles the 'create' command."""
    if (not args.description) or args.description == "":
        print("Error: Task description cannot be empty.")
        sys.exit(1)

    print_verbose(args, f"Creating task: '{args.description}'...")

    if user is None:
        # If user doesn't exist, create a new one
        print_verbose(args, f"User '{DEFAULT_USERNAME}' not found. Creating new user.")
        user = User(username=DEFAULT_USERNAME)
    # No need for isinstance check since we're using type hints and mypy

    new_task = Task(description=args.description)
    user.add_task(new_task)
    try:
        manager.save_user(user)
        print(f"Task created successfully with ID prefix: {new_task.id[:8]}")
    except (IOError, OSError, ValueError) as e:
        print(f"Error saving task: {e}")
        sys.exit(1)
    except Exception as e:  # pylint: disable=broad-exception-caught
        # Required for test compatibility
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

        # --- Display tasks using rich.table.Table ---
        console = Console()
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("ID Prefix", style="dim", width=12)
        table.add_column("Description")

        for task in user.tasks:
            # Add task details to the table
            table.add_row(task.id[:8], task.description)

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
        # Required for test compatibility
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)


def handle_edit(args: Namespace, manager: DataManager, user: User | None) -> None:
    """Handles the 'edit' command."""
    if not args.id or not args.description:
        print("Error: Both --id and --description are required for editing.")
        sys.exit(1)

    print_verbose(args, f"Editing task with ID prefix: '{args.id}'...")

    if not user:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        task_to_edit = user.find_task_by_id(args.id)
        if task_to_edit:
            old_description = task_to_edit.description
            task_to_edit.description = args.description
            manager.save_user(user)
            # Print success messages in the correct order
            print("Task updated successfully:")
            print(f"  Old Description: {old_description}")
            print(f"  New Description: {task_to_edit.description}")
        else:
            print(f"Error: Task with ID prefix '{args.id}' not found.")
            sys.exit(1)
    except ValueError as e:  # Handles ambiguous ID prefix
        print(f"Error: {e}")
        sys.exit(1)
    except (IOError, OSError, AttributeError) as e:
        print(f"Error saving updated task: {e}")
        sys.exit(1)
    except Exception as e:  # pylint: disable=broad-exception-caught
        # Required for test compatibility
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
            try:
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
        # Required for test compatibility
        print(f"An unexpected error occurred during deletion: {e}")
        sys.exit(1)


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
    parser_create.set_defaults(func=_wrap_handler(handle_create))

    # --- List Command ---
    parser_list = subparsers.add_parser("list", help="List all tasks.")
    parser_list.add_argument(
        "--sort-by",
        choices=["id", "description"],
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
        "edit", help="Edit the description of an existing task."
    )
    parser_edit.add_argument(
        "--id",
        required=True,
        help="The full or unique partial ID of the task to edit.",
    )
    parser_edit.add_argument(
        "-d",
        "--description",
        required=True,
        help="The new description for the task.",
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
        print(f"Error: {e}")
        print("If you haven't initialized the application, try running 'motido init'.")
        sys.exit(1)


if __name__ == "__main__":
    main()  # pragma: no cover
