# cli/main.py
# pylint: disable=too-many-lines
"""
Command Line Interface (CLI) for the Moti-Do application.
Provides commands to initialize, create, view, list, and edit tasks.
"""

import argparse
import sys
from argparse import Namespace  # Import Namespace
from datetime import date, datetime
from typing import Any, Callable, TypeVar

# Import rich for table formatting
from rich.console import Console
from rich.table import Table
from rich.text import Text

# Updated imports
from motido.core.models import (  # Added Duration
    Difficulty,
    Duration,
    Priority,
    Task,
    User,
)
from motido.core.scoring import (
    add_xp,
    apply_penalties,
    calculate_score,
    load_scoring_config,
)
from motido.core.utils import parse_date
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
    if (not args.title) or args.title == "":
        print("Error: Task title cannot be empty.")
        sys.exit(1)

    print_verbose(args, f"Creating task: '{args.title}'...")

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

    # Get the duration from args, default to MINISCULE if not specified
    duration = Duration.MINISCULE  # Default
    if args.duration:
        try:
            duration = Duration(args.duration)
        except ValueError:
            print(
                f"Error: Invalid duration '{args.duration}'. "
                f"Valid values are: {', '.join([d.value for d in Duration])}"
            )
            sys.exit(1)

    if user is None:
        # If user doesn't exist, create a new one
        print_verbose(args, f"User '{DEFAULT_USERNAME}' not found. Creating new user.")
        user = User(username=DEFAULT_USERNAME)
    # No need for isinstance check since we're using type hints and mypy

    # Create a new task with the current timestamp as creation_date
    new_task = Task(
        title=args.title,
        priority=priority,
        difficulty=difficulty,
        duration=duration,
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


# pylint: disable=too-many-locals,too-many-branches,too-many-statements
def handle_list(args: Namespace, _manager: DataManager, user: User | None) -> None:
    """Handles the 'list' command."""
    print_verbose(args, "Listing all tasks...")

    if user and user.tasks:
        # Load scoring config
        try:
            scoring_config = load_scoring_config()
        except ValueError as e:
            print(f"Warning: Could not load scoring config: {e}")
            scoring_config = None

        # Calculate scores for all tasks if config is available
        tasks_with_scores = []
        if scoring_config:
            today = date.today()
            for task in user.tasks:
                try:
                    score = calculate_score(task, scoring_config, today)
                    tasks_with_scores.append((task, score))
                except Exception as e:  # pylint: disable=broad-exception-caught
                    print(
                        f"Warning: Could not calculate score for task {task.id[:8]}: {e}"
                    )
                    tasks_with_scores.append((task, 0))  # Default score of 0
        else:
            # Just create a list of tasks with score=0 if no config
            tasks_with_scores = [(task, 0) for task in user.tasks]

        # PERF: Calculating score for all tasks on every list call can be slow for large datasets
        # in a DB. Consider caching or DB indexing.

        # Sort tasks
        if hasattr(args, "sort_by") and args.sort_by:
            reverse = False
            if hasattr(args, "sort_order") and args.sort_order == "desc":
                reverse = True

            if args.sort_by == "id":
                tasks_with_scores.sort(key=lambda item: item[0].id, reverse=reverse)
            elif args.sort_by == "title":
                tasks_with_scores.sort(
                    key=lambda item: item[0].title.lower(), reverse=reverse
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
                tasks_with_scores.sort(
                    key=lambda item: priority_order[item[0].priority], reverse=reverse
                )
            elif args.sort_by == "status":
                # Sort by completion status
                tasks_with_scores.sort(
                    key=lambda item: item[0].is_complete, reverse=reverse
                )
            elif args.sort_by == "score":
                # Sort by score
                tasks_with_scores.sort(key=lambda item: item[1], reverse=reverse)
        else:
            # Default sorting: by score in descending order
            tasks_with_scores.sort(key=lambda item: item[1], reverse=True)

        # --- Display tasks using rich.table.Table ---
        console = Console()
        table = Table(show_header=True, header_style="bold magenta")
        table.add_column("Status", width=6)
        table.add_column("ID Prefix", style="dim", width=12)
        table.add_column("Priority", width=15)
        table.add_column("Difficulty", width=15)
        table.add_column("Duration", width=15)
        table.add_column("Score", width=8)
        table.add_column("Title")

        for task, score in tasks_with_scores:
            # Add task details to the table with priority, difficulty, and duration emoji
            status_text = "[✓]" if task.is_complete else "[ ]"
            # Apply style to make completed tasks visually distinct
            description_style = "dim" if task.is_complete else None

            priority_text = f"{task.priority.emoji()} {task.priority.value}"
            difficulty_text = f"{task.difficulty.emoji()} {task.difficulty.value}"
            duration_text = f"{task.duration.emoji()} {task.duration.value}"

            # Determine score color based on its value
            score_style = None
            if score >= 50:
                score_style = "red bold"
            elif score >= 30:
                score_style = "yellow"
            elif score >= 20:
                score_style = "green"
            elif score >= 10:
                score_style = "blue"

            # If the task is completed, use dimmed style
            if task.is_complete:
                score_style = "dim"

            score_text = Text(str(score), style=score_style or "")

            table.add_row(
                status_text,
                task.id[:8],
                priority_text,
                difficulty_text,
                duration_text,
                score_text,
                task.title,
                style=description_style,
            )

        console.print(table)
        # --- End rich table display ---

        print(f"Total tasks: {len(user.tasks)}")
    elif user:
        print("No tasks found.")
    else:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        print("Hint: Run 'motido init' first if you haven't already.")


# pylint: disable=too-many-locals,too-many-branches,too-many-statements
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
            # Load scoring config and calculate score
            try:
                scoring_config = load_scoring_config()
                current_score = calculate_score(task, scoring_config, date.today())
            except ValueError as e:
                print(f"Warning: Could not calculate score: {e}")
                current_score = None

            # --- Display task details using rich.table.Table ---
            console = Console()
            table = Table(show_header=False, box=None, show_edge=False)
            table.add_column("Attribute", style="bold cyan")
            table.add_column("Value")
            table.add_row("ID:", task.id)

            # Display completion status
            completion_status = "Complete" if task.is_complete else "Incomplete"
            status_style = "green" if task.is_complete else "yellow"
            status_text = Text(completion_status, style=status_style)
            table.add_row("Status:", status_text)

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

            # Display duration with emoji and style
            duration_text = Text()
            duration_text.append(f"{task.duration.emoji()} ")
            duration_text.append(
                task.duration.value, style=task.duration.display_style()
            )
            table.add_row("Duration:", duration_text)

            table.add_row("Title:", task.title)
            if task.text_description:
                table.add_row("Description:", task.text_description)

            # Display score if available
            if current_score is not None:
                # Determine score color based on its value
                score_style = "default"
                if current_score >= 50:
                    score_style = "red bold"
                elif current_score >= 30:
                    score_style = "yellow"
                elif current_score >= 20:
                    score_style = "green"
                elif current_score >= 10:
                    score_style = "blue"

                score_text = Text(str(current_score), style=score_style or "")
                table.add_row("Score:", score_text)

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
    """Updates the task's title and returns the old title."""
    old_description = task.title
    task.title = new_description
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


def _update_task_duration(task: Task, duration_str: str) -> Duration:
    """Update task duration and return the old value.

    Raises:
        ValueError: If the duration string is invalid.
    """
    old_duration = task.duration
    task.duration = Duration(duration_str)  # Raises ValueError if invalid
    return old_duration


# pylint: disable=too-many-branches
def handle_complete(args: Namespace, manager: DataManager, user: User | None) -> None:
    """Handles the 'complete' command to mark a task as complete."""
    if not args.id:
        print("Error: Please provide a task ID prefix using --id.")
        sys.exit(1)

    print_verbose(args, f"Marking task with ID prefix: '{args.id}' as complete...")

    if not user:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        task = user.find_task_by_id(args.id)
        if task:
            if task.is_complete:
                print(
                    f"Task '{task.title}' (ID: {task.id[:8]}) is already marked as complete."
                )
                return

            # Load scoring config and calculate score
            score_to_add = 0
            try:
                scoring_config = load_scoring_config()
                score_to_add = calculate_score(task, scoring_config, date.today())
            except ValueError as e:
                print(f"Warning: Could not calculate score: {e}")

            # Mark the task as complete
            task.is_complete = True

            # Save the updated user data
            try:
                manager.save_user(user)

                # Add XP based on score
                if score_to_add > 0:
                    add_xp(user, manager, score_to_add)
                    print(
                        f"Marked task '{task.title}' (ID: {task.id[:8]}) as complete. "
                        f"Added {score_to_add} XP points! Total XP: {user.total_xp}"
                    )
                else:
                    print(
                        f"Marked task '{task.title}' (ID: {task.id[:8]}) as complete."
                    )

            except (IOError, OSError) as e:
                print(f"Error saving task update: {e}")
                sys.exit(1)
            except Exception as e:  # pylint: disable=broad-exception-caught
                print(f"Error saving updated task: {e}")
                sys.exit(1)
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


def handle_describe(args: Namespace, manager: DataManager, user: User | None) -> None:
    """Handles the 'describe' command to set text description on a task."""
    print_verbose(args, f"Setting description for task with ID prefix: '{args.id}'...")

    if not user:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        task = user.find_task_by_id(args.id)
        if task:
            old_description = task.text_description
            task.text_description = args.description

            # Save the updated user data
            try:
                manager.save_user(user)
                if old_description:
                    print(
                        f"Updated description for task '{task.title}' (ID: {task.id[:8]})."
                    )
                else:
                    print(
                        f"Added description to task '{task.title}' (ID: {task.id[:8]})."
                    )
            except (IOError, OSError) as e:
                print(f"Error saving task update: {e}")
                sys.exit(1)
            except Exception as e:  # pylint: disable=broad-exception-caught
                print(f"Error saving updated task: {e}")
                sys.exit(1)
        else:
            print(f"Error: Task with ID prefix '{args.id}' not found.")
            sys.exit(1)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)


def handle_set_due(args: Namespace, manager: DataManager, user: User | None) -> None:
    """Handles the 'set-due' command to set or clear the due date of a task."""
    print_verbose(args, f"Setting due date for task with ID prefix: '{args.id}'...")

    if not user:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        task = user.find_task_by_id(args.id)
        if task:
            if args.clear:
                task.due_date = None
                manager.save_user(user)
                print(f"Cleared due date for task '{task.title}'.")
            elif args.date:
                try:
                    parsed_date = parse_date(args.date)
                    task.due_date = parsed_date
                    manager.save_user(user)
                    print(
                        f"Set due date to {parsed_date.strftime('%Y-%m-%d')} for task '{task.title}'."
                    )
                except ValueError as e:
                    print(f"Error parsing date: {e}")
                    sys.exit(1)
            else:
                print(
                    "Error: Please provide a date or use --clear to remove the due date."
                )
                sys.exit(1)
        else:
            print(f"Error: Task with ID prefix '{args.id}' not found.")
            sys.exit(1)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except IOError as e:
        print(f"Error saving task: {e}")
        sys.exit(1)
    except Exception as e:  # pragma: no cover  # pylint: disable=broad-exception-caught
        print(f"Unexpected error: {e}")
        sys.exit(1)


def handle_set_start(args: Namespace, manager: DataManager, user: User | None) -> None:
    """Handles the 'set-start' command to set or clear the start date of a task."""
    print_verbose(args, f"Setting start date for task with ID prefix: '{args.id}'...")

    if not user:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        task = user.find_task_by_id(args.id)
        if task:
            if args.clear:
                task.start_date = None
                manager.save_user(user)
                print(f"Cleared start date for task '{task.title}'.")
            elif args.date:
                try:
                    parsed_date = parse_date(args.date)
                    task.start_date = parsed_date
                    manager.save_user(user)
                    print(
                        f"Set start date to {parsed_date.strftime('%Y-%m-%d')} for task '{task.title}'."
                    )
                except ValueError as e:
                    print(f"Error parsing date: {e}")
                    sys.exit(1)
            else:
                print(
                    "Error: Please provide a date or use --clear to remove the start date."
                )
                sys.exit(1)
        else:
            print(f"Error: Task with ID prefix '{args.id}' not found.")
            sys.exit(1)
    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except IOError as e:
        print(f"Error saving task: {e}")
        sys.exit(1)
    except Exception as e:  # pragma: no cover  # pylint: disable=broad-exception-caught
        print(f"Unexpected error: {e}")
        sys.exit(1)


# pylint: disable=too-many-arguments,too-many-positional-arguments
def _print_task_updates(
    task: Task,
    description_updated: bool,
    old_description: str | None,
    priority_updated: bool,
    old_priority: Priority | None,
    difficulty_updated: bool,
    old_difficulty: Difficulty | None,
    duration_updated: bool,
    old_duration: Duration | None,
) -> None:
    """Print task update details."""
    print("Task updated successfully:")
    if description_updated:
        print(f"  Old Title: {old_description}")
        print(f"  New Title: {task.title}")
    if priority_updated:
        # Narrow old_priority to non-None for mypy
        assert old_priority is not None
        print(f"  Old Priority: {old_priority.value}")
        print(f"  New Priority: {task.priority.value}")
    if difficulty_updated:
        assert old_difficulty is not None  # For mypy
        print(f"  Old Difficulty: {old_difficulty.value}")
        print(f"  New Difficulty: {task.difficulty.value}")
    if duration_updated:
        assert old_duration is not None  # For mypy
        print(f"  Old Duration: {old_duration.value}")
        print(f"  New Duration: {task.duration.value}")


# pylint: disable=too-many-branches,too-many-statements
def handle_edit(args: Namespace, manager: DataManager, user: User | None) -> None:
    """Handles the 'edit' command."""
    if not args.id:
        print("Error: --id is required for editing.")
        sys.exit(1)

    if (
        not args.title
        and not args.priority
        and not args.difficulty
        and not args.duration
    ):
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
        old_difficulty = None
        old_duration = None

        # Update description if provided
        description_updated = False
        if args.title:
            old_description = _update_task_description(task_to_edit, args.title)
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

        # Update duration if provided
        duration_updated = False
        if args.duration:
            try:
                old_duration = _update_task_duration(task_to_edit, args.duration)
                duration_updated = True
                changes_made = True
            except ValueError:
                print(
                    f"Error: Invalid duration '{args.duration}'. "
                    f"Valid values are: {', '.join([d.value for d in Duration])}"
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
                difficulty_updated,
                old_difficulty,
                duration_updated,
                old_duration,
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


def handle_run_penalties(
    args: Namespace, manager: DataManager, user: User | None
) -> None:
    """Handles the 'run-penalties' command to apply daily penalties for incomplete tasks."""
    print_verbose(args, "Running penalty calculation...")

    if not user:
        print(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        sys.exit(1)

    try:
        # Load scoring config
        try:
            scoring_config = load_scoring_config()
        except ValueError as e:
            print(f"Error: Could not load scoring config: {e}")
            sys.exit(1)

        # Set the effective date
        effective_date = date.today()
        if args.date:
            try:
                # Parse the date format YYYY-MM-DD
                effective_date = date.fromisoformat(args.date)
            except ValueError:
                print(
                    f"Error: Invalid date format. Please use YYYY-MM-DD, got: {args.date}"
                )
                sys.exit(1)

        # Apply penalties
        apply_penalties(user, manager, effective_date, scoring_config, user.tasks)
        print(f"Penalties calculated successfully for date: {effective_date}")

    except ValueError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:  # pylint: disable=broad-exception-caught
        print(f"An unexpected error occurred: {e}")
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
        "--title",
        required=True,
        help="The title of the task.",
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
    parser_create.add_argument(
        "-t",  # Short flag for duration
        "--duration",
        choices=[d.value for d in Duration],
        # Default is handled in the model, no CLI default needed
        help=f"The duration of the task. Valid values: {', '.join([d.value for d in Duration])}.",
    )
    parser_create.set_defaults(func=_wrap_handler(handle_create))

    # --- List Command ---
    parser_list = subparsers.add_parser("list", help="List all tasks.")
    parser_list.add_argument(
        "--sort-by",
        choices=["id", "title", "priority", "status", "score"],
        help="Field to sort tasks by. Default is score (descending).",
    )
    parser_list.add_argument(
        "--sort-order",
        choices=["asc", "desc"],
        default="asc",
        help="Sort order: ascending (asc) or descending (desc). "
        "Default is asc, except for score which defaults to desc.",
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
        help="Edit the description, priority, difficulty, or duration of an existing task.",
    )
    parser_edit.add_argument(
        "--id",
        required=True,
        help="The full or unique partial ID of the task to edit.",
    )
    parser_edit.add_argument(
        "-d",
        "--title",
        required=False,
        help="The new title for the task.",
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
    parser_edit.add_argument(
        "-t",
        "--duration",
        choices=[d.value for d in Duration],
        help="The new duration for the task.",
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

    # --- Complete Command ---
    parser_complete = subparsers.add_parser("complete", help="Mark a task as complete.")
    parser_complete.add_argument(
        "--id",
        required=True,
        help="The full or unique partial ID of the task to mark as complete.",
    )
    parser_complete.set_defaults(func=_wrap_handler(handle_complete))

    # --- Describe Command ---
    parser_describe = subparsers.add_parser(
        "describe", help="Set or update the text description of a task."
    )
    parser_describe.add_argument(
        "--id",
        required=True,
        help="The full or unique partial ID of the task to describe.",
    )
    parser_describe.add_argument(
        "description",
        help="The text description to set for the task.",
    )
    parser_describe.set_defaults(func=_wrap_handler(handle_describe))

    # --- Set Due Date Command ---
    parser_set_due = subparsers.add_parser(
        "set-due", help="Set or clear the due date of a task."
    )
    parser_set_due.add_argument(
        "--id", required=True, help="The full or unique partial ID of the task."
    )
    parser_set_due.add_argument(
        "date",
        nargs="?",
        help="The due date (e.g., '2025-12-31', 'tomorrow', 'next friday', 'in 3 days').",
    )
    parser_set_due.add_argument(
        "--clear", action="store_true", help="Clear the due date."
    )
    parser_set_due.set_defaults(func=_wrap_handler(handle_set_due))

    # --- Set Start Date Command ---
    parser_set_start = subparsers.add_parser(
        "set-start", help="Set or clear the start date of a task."
    )
    parser_set_start.add_argument(
        "--id", required=True, help="The full or unique partial ID of the task."
    )
    parser_set_start.add_argument(
        "date",
        nargs="?",
        help="The start date (e.g., '2025-12-31', 'tomorrow', 'next friday', 'in 3 days').",
    )
    parser_set_start.add_argument(
        "--clear", action="store_true", help="Clear the start date."
    )
    parser_set_start.set_defaults(func=_wrap_handler(handle_set_start))

    # --- Run Penalties Command ---
    parser_penalties = subparsers.add_parser(
        "run-penalties", help="Apply daily penalties for incomplete tasks."
    )
    parser_penalties.add_argument(
        "--date",
        required=False,
        help="The date to calculate penalties for, in YYYY-MM-DD format. Defaults to today.",
    )
    parser_penalties.set_defaults(func=_wrap_handler(handle_run_penalties))

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
    if args.command in [
        "create",
        "list",
        "view",
        "edit",
        "delete",
        "complete",
        "run-penalties",
    ]:
        try:
            user = manager.load_user(DEFAULT_USERNAME)
            if user is None and args.command not in ["create"]:
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
