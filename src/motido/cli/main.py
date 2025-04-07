# cli/main.py
"""
Command Line Interface (CLI) for the Moti-Do application.
Provides commands to initialize, create, view, list, and edit tasks.
"""

import argparse
import os
import sys
from argparse import Namespace  # Import Namespace

# Updated imports
from motido.core.models import Task, User
from motido.data.abstraction import DataManager  # For type hinting
from motido.data.abstraction import DEFAULT_USERNAME
from motido.data.backend_factory import get_data_manager
from motido.data.config import load_config, save_config


def handle_init(args: Namespace) -> None:
    """Handles the 'init' command."""
    print("Initializing Moti-Do...")
    config = {"backend": args.backend}
    save_config(config)
    try:
        manager = get_data_manager()  # Get manager based on *new* config
        manager.initialize()  # Initialize the chosen backend
        print(f"Initialization complete. Using '{args.backend}' backend.")
    except Exception as e:
        print(f"An error occurred during initialization: {e}")
        # Optionally revert config change or provide more guidance
        sys.exit(1)


def handle_create(args: Namespace, manager: DataManager) -> None:
    """Handles the 'create' command."""
    if (not args.description) or args.description == "":
        print("Error: Task description cannot be empty.")
        sys.exit(1)

    print(f"Creating task: '{args.description}'...")
    user = manager.load_user(DEFAULT_USERNAME)
    if user is None:
        # If user doesn't exist, create a new one
        print(f"User '{DEFAULT_USERNAME}' not found. Creating new user.")
        user = User(username=DEFAULT_USERNAME)

    new_task = Task(description=args.description)
    user.add_task(new_task)
    try:
        manager.save_user(user)
        print(f"Task created successfully with ID prefix: {new_task.id[:8]}")
    except Exception as e:
        print(f"Error saving task: {e}")
        sys.exit(1)


def handle_list(args: Namespace, manager: DataManager) -> None:
    """Handles the 'list' command."""
    print("Listing all tasks...")
    user = manager.load_user(DEFAULT_USERNAME)
    if user and user.tasks:
        print("-" * 30)
        for task in user.tasks:
            print(task)  # Uses Task.__str__
        print("-" * 30)
        print(f"Total tasks: {len(user.tasks)}")
    elif user:
        print("No tasks found.")
    else:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        print("Hint: Run 'motido init' first if you haven't already.")


def handle_view(args: Namespace, manager: DataManager) -> None:
    """Handles the 'view' command."""
    if not args.id:
        print("Error: Please provide a task ID prefix using --id.")
        sys.exit(1)

    print(f"Viewing task with ID prefix: '{args.id}'...")
    user = manager.load_user(DEFAULT_USERNAME)
    if not user:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        task = user.find_task_by_id(args.id)
        if task:
            print("-" * 30)
            print(f"ID:          {task.id}")
            print(f"Description: {task.description}")
            print("-" * 30)
        else:
            print(f"Error: Task with ID prefix '{args.id}' not found.")
            sys.exit(1)
    except ValueError as e:  # Handles ambiguous ID prefix
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        sys.exit(1)


def handle_edit(args: Namespace, manager: DataManager) -> None:
    """Handles the 'edit' command."""
    if not args.id or not args.description:
        print("Error: Both --id and --description are required for editing.")
        sys.exit(1)

    print(f"Editing task with ID prefix: '{args.id}'...")
    user = manager.load_user(DEFAULT_USERNAME)
    if not user:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        task_to_edit = user.find_task_by_id(args.id)
        if task_to_edit:
            old_description = task_to_edit.description
            task_to_edit.description = args.description
            manager.save_user(user)
            print("Task updated successfully:")
            print(f"  Old Description: {old_description}")
            print(f"  New Description: {task_to_edit.description}")
        else:
            print(f"Error: Task with ID prefix '{args.id}' not found.")
            sys.exit(1)
    except ValueError as e:  # Handles ambiguous ID prefix
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error saving updated task: {e}")
        sys.exit(1)


def handle_delete(args: Namespace, manager: DataManager) -> None:
    """Handles the 'delete' command."""
    if not args.id:
        # This check might be redundant if argparse requires it, but good practice.
        print("Error: Please provide a task ID prefix using --id.")
        sys.exit(1)

    print(f"Deleting task with ID prefix: '{args.id}'...")
    user = manager.load_user(DEFAULT_USERNAME)
    if not user:
        # Consistent user not found message
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        # Assuming user.remove_task returns True if deleted, False if not found
        # and raises ValueError for ambiguity (delegated from find_task_by_id)
        task_deleted = user.remove_task(args.id)
        if task_deleted:
            try:
                manager.save_user(user)
                print(f"Task '{args.id}' deleted successfully.")
            except Exception as e:
                print(f"Error saving after deleting task: {e}")
                sys.exit(1)
        else:
            print(f"Error: Task with ID prefix '{args.id}' not found.")
            # Exiting here because the task wasn't found to be deleted
            sys.exit(1)

    except ValueError as e:  # Handles ambiguous ID prefix from underlying find
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:  # Catch other unexpected errors during removal logic
        print(f"An unexpected error occurred during deletion: {e}")
        sys.exit(1)


def main() -> None:
    """Main function to parse arguments and dispatch commands."""
    parser = argparse.ArgumentParser(description="Moti-Do: Task Management CLI")
    subparsers = parser.add_subparsers(
        dest="command", help="Available commands", required=True
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
    parser_create.set_defaults(
        func=lambda args: handle_create(args, get_data_manager())
    )

    # --- List Command ---
    parser_list = subparsers.add_parser("list", help="List all tasks.")
    parser_list.set_defaults(func=lambda args: handle_list(args, get_data_manager()))

    # --- View Command ---
    parser_view = subparsers.add_parser("view", help="View details of a specific task.")
    parser_view.add_argument(
        "--id",
        required=True,
        help="The full or unique partial ID of the task to view.",
    )
    parser_view.set_defaults(func=lambda args: handle_view(args, get_data_manager()))

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
    parser_edit.set_defaults(func=lambda args: handle_edit(args, get_data_manager()))

    # --- Delete Command ---
    parser_delete = subparsers.add_parser("delete", help="Delete a task by ID.")
    parser_delete.add_argument(
        "--id",
        required=True,
        help="The full or unique partial ID of the task to delete.",
    )
    parser_delete.set_defaults(
        func=lambda args: handle_delete(args, get_data_manager())
    )

    # --- Parse Arguments ---
    args = parser.parse_args()

    # --- Execute Command ---
    # The 'init' command doesn't need a pre-fetched manager
    if args.command == "init":
        args.func(args)
    else:
        # For other commands, check if initialization has happened
        # (e.g., config file exists in the *package* data location)
        # The get_data_manager will handle config loading and potential errors
        # If the config *doesn't* exist, load_config returns a default,
        # which might be okay or might indicate 'init' is needed.
        # Let's refine the check slightly - get_data_manager handles the backend logic
        # but the CLI should still guide the user if they haven't run init.
        # We can check if the manager *could* load a user, or rely on manager initialization checks.
        # For now, let's rely on get_data_manager() failing gracefully if needed,
        # or subsequent commands failing if data isn't there.
        # Removing the explicit config path check here as config location changed.
        # The error messages within handlers should guide the user now.
        # config_path = os.path.join(parent_dir, "config.json") # Old path
        # if not os.path.exists(config_path) and args.command != "init":
        #      print("Error: Application not initialized. Please run 'python cli/main.py init' first.") # Old message
        #      sys.exit(1)
        try:
            args.func(args)  # Call the appropriate handler function
        except Exception as e:
            # Provide a more general error message here
            print(f"An error occurred: {e}")
            print(
                "If you haven't initialized the application, try running 'motido init'."
            )
            sys.exit(1)


if __name__ == "__main__":
    main()
