import argparse
import sys
import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List

# Attempt to import real models and enums
try:
    from library.datatypes import Task, ImportanceLevel, DifficultyLevel, DurationLevel, Recurrence, HabitTracking, Tag, Project
    # Import the level dictionaries and other needed types
    from library.datatypes import IMPORTANT_LEVELS, DIFFICULTY_LEVELS, DURATION_LEVELS, RecurrenceFrequency, Weekday, HabitGoalType
    print("Successfully imported models/enums/levels from library.datatypes")
except ImportError:
    print("Warning: Could not import models/enums/levels from library.datatypes. Using dummy classes/dicts.")
    # Define dummy classes if import fails
    raise

# Import Services
try:
    from library.services import TaskService, TagService, ProjectService
    print("Successfully imported services from library.services")
except ImportError:
    print("Warning: Could not import services from library.services. Service layer refactoring will fail.", file=sys.stderr)
    # Exit or raise? For now, let it potentially fail later.
    TaskService = TagService = ProjectService = None # Define as None to avoid NameError later, but operations will fail

# --- Helper Functions ---
def parse_date(date_string: Optional[str]) -> Optional[datetime.datetime]:
    """Parses a date string in YYYY-MM-DD format."""
    if not date_string:
        return None
    try:
        # Return datetime object set to the beginning of the day
        return datetime.datetime.strptime(date_string, "%Y-%m-%d")
    except ValueError:
        raise argparse.ArgumentTypeError(f"Invalid date format: {date_string}. Please use YYYY-MM-DD.")

# --- Command Handler ---
def handle_add_task(args: argparse.Namespace, config: Dict[str, Any]):
    """Handles the 'add' command logic."""
    print("Handling 'add' task command...")
    print(f"Received arguments: {args}")

    # 1. Validate Arguments (Example: Recurrence dependencies)
    if args.recurrence_frequency:
        if args.recurrence_frequency == RecurrenceFrequency.WEEKLY:
            if not args.recurrence_days:
                print("Error: For weekly recurrence, --recurrence-days is required.", file=sys.stderr)
                sys.exit(1)
            # Interval is optional for weekly, defaults to 1?
        elif args.recurrence_frequency == RecurrenceFrequency.MONTHLY:
             if not args.recurrence_day_of_month:
                 print("Error: For monthly recurrence, --recurrence-day-of-month is required.", file=sys.stderr)
                 sys.exit(1)
        # Add validation for other frequencies/combinations if needed
        if not args.recurrence_interval:
             args.recurrence_interval = 1 # Default interval to 1 if frequency is set but interval isn't
             print("Defaulting recurrence interval to 1.")

    # --- Habit Validation ---
    if args.habit:
        if not args.habit_goal_type:
            print("Error: If creating a habit (--habit), --habit-goal-type is required.", file=sys.stderr)
            sys.exit(1)
        # Example validation: target_value might be needed for specific goal types
        if args.habit_goal_type in [HabitGoalType.WEEKLY_TIMES, HabitGoalType.MONTHLY_VALUE] and args.habit_target_value is None:
             print(f"Error: For habit goal type '{args.habit_goal_type}', --habit-target-value is required.", file=sys.stderr)
             sys.exit(1)
        # Habits usually have recurrence, but the model allows non-recurring ones.
        # Add a warning if a habit is created without recurrence?
        if not args.recurrence_frequency:
            print("Warning: Creating a habit without a recurrence rule (--recurrence-frequency).")

    # 2. Prepare Task Data and Services
    task_repo = config['repositories'].get('task')
    tag_repo = config['repositories'].get('tag')
    project_repo = config['repositories'].get('project')

    # Instantiate Services
    if not task_repo or not tag_repo or not project_repo or not TaskService or not TagService or not ProjectService:
        print("Error: Required repositories or services not available. Cannot add task.", file=sys.stderr)
        sys.exit(1)

    task_service = TaskService(task_repo)
    tag_service = TagService(tag_repo)
    project_service = ProjectService(project_repo)

    # --- Resolve IDs using Services (Placeholder logic remains, but points to services) ---
    project_id: Optional[str] = None
    if args.project:
        # TODO: Implement actual project lookup by name/ID using project_service
        print(f"Simulating lookup for project using project_service: {args.project}")
        try:
            # Assume ProjectService has a method like this:
            # project = project_service.get_project_by_name_or_id(args.project) # hypothetical
            # if project: project_id = project.id
            # else: print(f"Warning: Project '{args.project}' not found."); sys.exit(1)
            project_id = f"project_id_for_{args.project}" # Placeholder
        except AttributeError:
             print("Error: ProjectService missing expected method for lookup.", file=sys.stderr)
             sys.exit(1)
        except Exception as e:
             print(f"Error looking up project: {e}", file=sys.stderr)
             sys.exit(1)


    tag_ids: List[str] = []
    if args.tags:
        # TODO: Implement actual tag lookup/creation using tag_service
        print(f"Simulating lookup/creation for tags using tag_service: {args.tags}")
        try:
            # Assume TagService has a method like this:
            # for tag_name in args.tags:
            #     tag = tag_service.get_or_create_tag_by_name(tag_name) # hypothetical
            #     if tag: tag_ids.append(tag.id)
            tag_ids = [f"tag_id_for_{tag_name}" for tag_name in args.tags] # Placeholder
        except AttributeError:
             print("Error: TagService missing expected method for lookup/creation.", file=sys.stderr)
             sys.exit(1)
        except Exception as e:
             print(f"Error processing tags: {e}", file=sys.stderr)
             sys.exit(1)

    dependency_ids: List[str] = []
    if args.dependencies:
        # TODO: Implement actual task lookup by title/ID using task_service
        print(f"Simulating lookup for dependencies using task_service: {args.dependencies}")
        try:
            # Assume TaskService has a method like this:
            # for dep_ref in args.dependencies:
            #     task = task_service.get_task_by_ref(dep_ref) # hypothetical
            #     if task: dependency_ids.append(task.id)
            #     else: print(f"Warning: Dependency task '{dep_ref}' not found."); sys.exit(1)
            dependency_ids = [f"dep_id_for_{dep}" for dep in args.dependencies] # Placeholder
        except AttributeError:
             print("Error: TaskService missing expected method for lookup.", file=sys.stderr)
             sys.exit(1)
        except Exception as e:
             print(f"Error looking up dependencies: {e}", file=sys.stderr)
             sys.exit(1)

    # --- Subtasks (Placeholder logic) ---
    # Actual subtasks would likely be Task objects themselves or a simpler structure
    # For now, we just store the titles provided.
    subtasks_data = []
    if args.subtasks:
        # In reality, you might create Subtask objects or link Task objects
        print(f"Processing subtask titles: {args.subtasks}")
        # from library.task import Subtask
        # subtasks_data = [Subtask(name=title, status=False, order=i) for i, title in enumerate(args.subtasks)]
        subtasks_data = args.subtasks # Placeholder: just storing titles

    # --- Construct Recurrence Rule --- 
    recurrence_rule: Optional[Recurrence] = None
    if args.recurrence_frequency:
        print("Constructing recurrence rule...")
        # TODO: Map CLI args to the Recurrence dataclass fields accurately
        # This requires converting weekday names to ints (0-6), etc.
        days_of_week_ints: Optional[List[int]] = None
        if args.recurrence_days:
            # Placeholder mapping - needs actual Weekday enum/values from library.datatypes
            day_map = {day: i for i, day in enumerate(Weekday.__dict__.keys()) if not day.startswith('_')} # Crude map
            try:
                days_of_week_ints = [day_map[day_name] for day_name in args.recurrence_days]
            except KeyError as e:
                print(f"Error: Invalid day name provided: {e}", file=sys.stderr)
                sys.exit(1)

        try:
            recurrence_rule = Recurrence(
                frequency=args.recurrence_frequency,
                interval=args.recurrence_interval or 1,
                start_date=datetime.datetime.now(), # Default start_date, consider allowing CLI arg
                end_date=None, # Consider allowing CLI arg
                days_of_week=days_of_week_ints, # For weekly
                day_of_month=args.recurrence_day_of_month # For monthly
                # Add other fields if Recurrence model expands
            )
            print(f"Constructed recurrence: {recurrence_rule}")
        except Exception as e: # Catch potential errors during Recurrence creation
            print(f"Error constructing Recurrence object: {e}", file=sys.stderr)
            sys.exit(1)

    # --- Construct Habit Tracking ---
    habit_tracking_details: Optional[HabitTracking] = None
    if args.habit:
        print("Constructing habit tracking details...")
        try:
            habit_tracking_details = HabitTracking(
                goal_type=args.habit_goal_type,
                target_value=args.habit_target_value,
                # tracking_start_date defaults to now in the model
            )
            print(f"Constructed habit tracking: {habit_tracking_details}")
        except Exception as e:
            print(f"Error constructing HabitTracking object: {e}", file=sys.stderr)
            sys.exit(1)

    # --- Map Enums (Placeholder logic) ---
    # TODO: Map string args (--importance, etc.) to actual Enum/Level objects
    importance_level = args.importance # Placeholder - should be ImportanceLevel object
    difficulty_level = args.difficulty # Placeholder - should be DifficultyLevel object
    duration_level = args.duration   # Placeholder - should be DurationLevel object
    print(f"Simulating Enum mapping: Importance='{importance_level}', Difficulty='{difficulty_level}', Duration='{duration_level}'")


    # --- Create Task Object ---
    try:
        new_task = Task(
            name=args.title,
            description=args.description,
            emoji=args.icon,
            project_id=project_id,
            tag_ids=tag_ids,
            due_date=parse_date(args.due_date),
            start_date=parse_date(args.start_date),
            importance=importance_level, # Replace with actual object
            difficulty=difficulty_level, # Replace with actual object
            duration=duration_level,     # Replace with actual object
            dependency_ids=dependency_ids,
            subtasks=subtasks_data,      # Replace with actual Subtask objects if needed
            # is_starred=args.starred,  # Task model doesn't have is_starred/is_frogged yet
            # is_frogged=args.frog,
            # note=args.note,          # Task model doesn't have note yet
            recurrence=recurrence_rule,
            habit_tracking=habit_tracking_details, # Add habit tracking details
            # status= 'future' if start_date else 'active' # Initial status logic
        )
        # Manually add fields not in Task constructor if needed
        # if args.note: new_task.note = args.note # Example if note added later
        print("Constructed Task Object (Placeholder):")
        import json # Use pprint for dataclasses if available
        # Need a way to serialize dataclasses with nested objects/enums/datetime
        # print(json.dumps(new_task.__dict__, indent=2, default=str)) # Simple dict conversion
        print(new_task) # Rely on dataclass repr for now

    except Exception as e:
        print(f"Error creating Task object: {e}", file=sys.stderr)
        sys.exit(1)

    # 3. Save Task via Service
    try:
        print(f"Simulating: Calling task_service.save_task() for task '{new_task.name}'")
        task_service.save_task(new_task)
        # Note: The ID might be assigned upon saving by the repository/service
        print(f"Task '{new_task.name}' (ID: {new_task.id}) added successfully (via service).")
    except TypeError as e: # Catch type errors from service validation
         print(f"Error: {e}", file=sys.stderr)
         sys.exit(1)
    except Exception as e:
        print(f"Error saving task via service: {e}", file=sys.stderr)
        sys.exit(1)

# --- Edit Task Command Handler ---
def handle_edit_task(args: argparse.Namespace, config: Dict[str, Any]):
    """Handles the 'edit' command logic."""
    print(f"Handling 'edit' task command for ID/prefix: {args.id_or_prefix}")
    print(f"Received arguments for update: {vars(args)}") # Show all received args

    task_repo = config['repositories'].get('task')
    tag_repo = config['repositories'].get('tag')       # Needed for tag operations
    project_repo = config['repositories'].get('project') # Needed for project operations

    # Instantiate Services
    if not task_repo or not tag_repo or not project_repo or not TaskService or not TagService or not ProjectService:
        print("Error: One or more required repositories or services not available.", file=sys.stderr)
        sys.exit(1)

    task_service = TaskService(task_repo)
    tag_service = TagService(tag_repo)
    project_service = ProjectService(project_repo)

    # Helper function for mapping weekday names to integers (adjust if Weekday enum is structured differently)
    def get_weekday_ints(day_names: Optional[List[str]]) -> Optional[List[int]]:
        if not day_names:
            return None
        # Placeholder mapping - needs actual Weekday enum/values from library.datatypes
        # Ensure Weekday enum is accessible here, might need to pass it or access globally
        if not Weekday:
             print("Error: Weekday definition not available for mapping.", file=sys.stderr)
             sys.exit(1)
        # Attempt to build map case-insensitively
        day_map = {}
        for day_attr in dir(Weekday):
             if not day_attr.startswith('_'):
                  day_map[day_attr.lower()] = getattr(Weekday, day_attr) # Assuming Weekday values are ints 0-6
                  # Or if Weekday values are strings like "Mon", map to ints:
                  # day_enum_val = getattr(Weekday, day_attr)
                  # if isinstance(day_enum_val, str) and day_enum_val.lower() in ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]:
                  #     day_map[day_enum_val.lower()] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"].index(day_enum_val.lower())


        # Example using Python's weekday standard (Mon=0, Sun=6) if Weekday enum isn't directly usable
        # std_day_map = { "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6 }
        # day_map = std_day_map # Use this as a fallback if Weekday enum isn't integers 0-6

        if not day_map:
             print("Error: Could not build weekday mapping.", file=sys.stderr)
             sys.exit(1)

        try:
            # Ensure case-insensitivity and uniqueness, then sort
            return sorted(list(set(day_map[day_name.lower()] for day_name in day_names)))
        except KeyError as e:
            print(f"Error: Invalid day name provided: {e}. Valid names (case-insensitive) are: {list(day_map.keys())}", file=sys.stderr)
            sys.exit(1)

    target_id = args.id_or_prefix
    task_to_edit: Optional[Task] = None

    # 1. Find the task: Exact ID match first (using service)
    try:
        print(f"Attempting to find task by exact ID using task_service: '{target_id}'")
        task_to_edit = task_service.get_task_by_id(target_id)
        if task_to_edit:
            print(f"Found task by exact ID: {getattr(task_to_edit, 'id', 'N/A')} ({getattr(task_to_edit, 'name', 'N/A')})")
        else:
            print(f"No task found with exact ID '{target_id}'. Proceeding to partial match search.")

    except Exception as e: # Catch potential errors from service interaction
        print(f"Error retrieving task by exact ID '{target_id}' via service: {e}", file=sys.stderr)
        # Decide whether to exit or proceed based on error type
        print("Proceeding to partial match search despite error.")
        pass # Proceed to partial search

    # 2. Find the task: Partial ID match if no exact match found (using service)
    if not task_to_edit:
        try:
            print(f"Attempting to find task by partial ID prefix using task_service: '{target_id}'")
            # TODO: Assume TaskService has a method like find_tasks_by_partial_id
            # This method needs to be defined in library/services.py
            matching_tasks = task_service.find_tasks_by_partial_id(target_id) # Hypothetical method
            print(f"Simulated: task_service.find_tasks_by_partial_id returned {len(matching_tasks)} tasks.")

            # --- Dummy data for testing - REMOVE WHEN SERVICE METHOD IS IMPLEMENTED ---
            if not hasattr(task_service, 'find_tasks_by_partial_id'):
                print("Warning: task_service.find_tasks_by_partial_id not implemented. Using dummy logic.")
                # matching_tasks = [] # Uncomment for testing no match
                # matching_tasks = [Task(name="Partial 1", id="partial_abc"), Task(name="Partial 2", id="partial_def")] # Uncomment for testing ambiguity
                matching_tasks = [Task(name="Found Partial Task", id=f"{target_id}_full_id", description="Old Desc", emoji="?", due_date=None, start_date=None, importance=ImportanceLevel.MEDIUM, difficulty=DifficultyLevel.MEDIUM, duration=DurationLevel.MEDIUM, project_id="proj_1", tag_ids=["tag1", "tag2"], dependency_ids=["dep1"], recurrence=None, habit_tracking=None)] # Example single match with data
            # --- End Dummy Data ---


            if len(matching_tasks) == 0:
                print(f"Error: No task or habit found matching ID prefix '{target_id}'.", file=sys.stderr)
                sys.exit(1)
            elif len(matching_tasks) > 1:
                print(f"Error: Ambiguous ID prefix '{target_id}'. Matches found:", file=sys.stderr)
                for t in matching_tasks:
                    # Assume Task has id and name attributes for display
                    print(f"  - {getattr(t, 'id', 'N/A')} ({getattr(t, 'name', 'N/A')})")
                sys.exit(1)
            else:
                task_to_edit = matching_tasks[0]
                print(f"Found unique task by prefix: {getattr(task_to_edit, 'id', 'N/A')} ({getattr(task_to_edit, 'name', 'N/A')})")

        except AttributeError:
             print("Error: Task service does not have the expected 'find_tasks_by_partial_id' method.", file=sys.stderr)
             sys.exit(1)
        except Exception as e:
            print(f"Error searching for tasks by partial ID '{target_id}': {e}", file=sys.stderr)
            sys.exit(1)

    if not task_to_edit:
        # This case should technically be handled by the checks above, but as a safeguard:
        print(f"Error: Could not identify a unique task to edit with '{target_id}'.", file=sys.stderr)
        sys.exit(1)

    # --- Pre-computation: Ensure Task object has expected attributes ---
    # Use getattr with defaults to avoid AttributeErrors if using dummy Task class
    task_id = getattr(task_to_edit, 'id', 'UNKNOWN_ID')
    task_name = getattr(task_to_edit, 'name', 'Unnamed Task')
    print(f"Task found: ID={task_id}, Name='{task_name}'") # Debug print

    # Store original values for detailed change logging (using getattr for safety)
    # Use deepcopy for mutable objects if necessary, though direct comparison later handles it okay for now
    import copy
    original_task_data = {
        'name': getattr(task_to_edit, 'name', None),
        'description': getattr(task_to_edit, 'description', None),
        'emoji': getattr(task_to_edit, 'emoji', None),
        'due_date': getattr(task_to_edit, 'due_date', None),
        'start_date': getattr(task_to_edit, 'start_date', None),
        'importance': getattr(task_to_edit, 'importance', None),
        'difficulty': getattr(task_to_edit, 'difficulty', None),
        'duration': getattr(task_to_edit, 'duration', None),
        'project_id': getattr(task_to_edit, 'project_id', None),
        'tag_ids': list(getattr(task_to_edit, 'tag_ids', []) or []),
        'dependency_ids': list(getattr(task_to_edit, 'dependency_ids', []) or []),
        'recurrence': copy.deepcopy(getattr(task_to_edit, 'recurrence', None)), # Use deepcopy for recurrence
        'habit_tracking': copy.deepcopy(getattr(task_to_edit, 'habit_tracking', None)) # Use deepcopy for habit
    }
    changes_summary = [] # List to store descriptions of changes made


    # 3. Apply Updates from Arguments
    changes_made = False

    # --- Update Simple Attributes ---
    if args.title is not None and args.title != original_task_data['name']:
        old_val = original_task_data['name']
        task_to_edit.name = args.title
        changes_summary.append(f"Title changed from '{old_val}' to '{args.title}'")
        changes_made = True

    if args.description is not None and args.description != original_task_data['description']:
         old_val = original_task_data['description']
         task_to_edit.description = args.description
         changes_summary.append(f"Description updated.") # Keep summary brief
         # changes_summary.append(f"Description changed from '{old_val}' to '{args.description}'") # More verbose option
         changes_made = True

    if args.icon is not None and args.icon != original_task_data['emoji']:
         old_val = original_task_data['emoji']
         task_to_edit.emoji = args.icon
         changes_summary.append(f"Icon changed from '{old_val}' to '{args.icon}'")
         changes_made = True

    # --- Update Dates ---
    if args.due_date is not None: # Check if arg was provided
        new_due_date = None
        if args.due_date == "": # Explicitly clear date
            print("Clearing due date.")
            pass # new_due_date remains None
        else:
            try:
                new_due_date = parse_date(args.due_date)
            except argparse.ArgumentTypeError as e:
                print(f"Error processing --due-date: {e}", file=sys.stderr)
                sys.exit(1)

        if new_due_date != original_task_data['due_date']:
             old_val_str = original_task_data['due_date'].strftime('%Y-%m-%d') if original_task_data['due_date'] else 'None'
             new_val_str = new_due_date.strftime('%Y-%m-%d') if new_due_date else 'None'
             task_to_edit.due_date = new_due_date
             changes_summary.append(f"Due date changed from {old_val_str} to {new_val_str}")
             changes_made = True

    if args.start_date is not None: # Check if arg was provided
        new_start_date = None
        if args.start_date == "": # Explicitly clear date
            print("Clearing start date.")
            pass # new_start_date remains None
        else:
            try:
                new_start_date = parse_date(args.start_date)
            except argparse.ArgumentTypeError as e:
                print(f"Error processing --start-date: {e}", file=sys.stderr)
                sys.exit(1)

        if new_start_date != original_task_data['start_date']:
            old_val_str = original_task_data['start_date'].strftime('%Y-%m-%d') if original_task_data['start_date'] else 'None'
            new_val_str = new_start_date.strftime('%Y-%m-%d') if new_start_date else 'None'
            task_to_edit.start_date = new_start_date
            changes_summary.append(f"Start date changed from {old_val_str} to {new_val_str}")
            changes_made = True

    # --- Update Levels (Importance, Difficulty, Duration) ---
    # Ensure level dicts/enums are accessible
    level_updates = {}
    if ImportanceLevel and IMPORTANT_LEVELS:
        level_updates['importance'] = (args.importance, IMPORTANT_LEVELS, ImportanceLevel, 'Importance')
    if DifficultyLevel and DIFFICULTY_LEVELS:
        level_updates['difficulty'] = (args.difficulty, DIFFICULTY_LEVELS, DifficultyLevel, 'Difficulty')
    if DurationLevel and DURATION_LEVELS:
        level_updates['duration'] = (args.duration, DURATION_LEVELS, DurationLevel, 'Duration')

    for field, (arg_value, levels_dict, _, name) in level_updates.items():
        if arg_value is not None: # Check if arg was provided
            level_key = arg_value.upper()
            # Use .get to handle potential missing keys in dummy dicts
            new_level_obj = levels_dict.get(level_key)

            if new_level_obj is not None:
                 current_level_obj = original_task_data[field]
                 # Compare objects directly (assumes Enums/dataclasses have correct __eq__)
                 if new_level_obj != current_level_obj:
                     # Format old/new values nicely (e.g., get Enum name)
                     old_val_str = getattr(current_level_obj, 'name', str(current_level_obj)) if current_level_obj else 'None'
                     new_val_str = getattr(new_level_obj, 'name', level_key) # Use key if name attribute missing
                     setattr(task_to_edit, field, new_level_obj)
                     changes_summary.append(f"{name} level changed from '{old_val_str}' to '{new_val_str}'")
                     changes_made = True
            else:
                 # Provide valid choices from the dictionary keys
                 valid_levels = [k for k in levels_dict.keys() if k != 'NotSet'] # Exclude NotSet if it exists
                 print(f"Error: Invalid {name.lower()} level '{arg_value}'. Valid levels: {valid_levels}", file=sys.stderr)
                 sys.exit(1)


    # --- Update Project (using service) ---
    if args.project is not None: # Check if arg was provided
        new_project_id: Optional[str] = None
        if args.project == "": # Explicitly clear project
             print("Clearing project association.")
             new_project_id = None
        else:
            # Conceptual: Assume project_service method exists
            try:
                print(f"Looking up project using project_service: '{args.project}'")
                # TODO: Assume ProjectService has a method like this:
                # This method needs to be defined in library/services.py
                new_project_id = project_service.get_project_id_by_name_or_id(args.project) # Hypothetical method
                if not new_project_id:
                     # --- Dummy logic - REMOVE WHEN SERVICE METHOD IS IMPLEMENTED ---
                     if not hasattr(project_service, 'get_project_id_by_name_or_id'):
                          print(f"Warning: project_service.get_project_id_by_name_or_id not implemented. Simulating success.")
                          new_project_id = f"project_id_for_{args.project}"
                     else:
                          # --- End Dummy Logic ---
                          print(f"Error: Project '{args.project}' not found via service.", file=sys.stderr)
                          sys.exit(1)
                print(f"Found project ID via service: {new_project_id}")
            except AttributeError:
                 print("Error: Project service does not have expected lookup method (e.g., 'get_project_id_by_name_or_id').", file=sys.stderr)
                 sys.exit(1)
            except Exception as e:
                print(f"Error looking up project '{args.project}' via service: {e}", file=sys.stderr)
                sys.exit(1)

        if new_project_id != original_task_data['project_id']:
             old_val = original_task_data['project_id'] or 'None'
             new_val = new_project_id or 'None'
             task_to_edit.project_id = new_project_id
             changes_summary.append(f"Project changed from '{old_val}' to '{new_val}'")
             changes_made = True


    # --- Update Tags ---
    original_tags = set(original_task_data['tag_ids'])
    current_tags = set(original_task_data['tag_ids']) # Start with original tags
    tags_modified = False

    if args.set_tags is not None: # Explicitly setting tags (can be empty list [])
        new_tag_ids = set()
        print(f"Setting tags to: {args.set_tags}")
        for tag_ref in args.set_tags:
            try:
                # Conceptual: Assume tag_service method exists, create if missing
                # Assume returns tag ID string or None
                tag_id = tag_service.get_tag_id_by_name_or_id(tag_ref, create_if_missing=True)
                if tag_id:
                    new_tag_ids.add(tag_id)
                else:
                    # Should not happen if create_if_missing=True and repo works, but handle defensively
                    print(f"Warning: Could not find or create tag '{tag_ref}'. Skipping.", file=sys.stderr)
            except AttributeError:
                 print("Error: Tag service does not have 'get_tag_id_by_name_or_id' method.", file=sys.stderr)
                 sys.exit(1)
            except Exception as e:
                print(f"Error processing tag '{tag_ref}' for set operation: {e}", file=sys.stderr)
                # Decide whether to skip or exit based on error severity
                sys.exit(1)
        # Replace the current set entirely
        current_tags = new_tag_ids
        # Check if the final set differs from original *after* processing all args
        if current_tags != original_tags:
             tags_modified = True

    else: # Handle add/remove only if set_tags was not used
        if args.add_tags:
            print(f"Adding tags: {args.add_tags}")
            added_during_op = set()
            for tag_ref in args.add_tags:
                if tag_ref in added_during_op: continue # Avoid duplicate processing/creation attempts
                try:
                    # Conceptual: Assume tag_service method exists, create if missing
                    tag_id = tag_service.get_tag_id_by_name_or_id(tag_ref, create_if_missing=True)
                    if tag_id:
                        added_during_op.add(tag_ref) # Track processed ref
                        if tag_id not in current_tags:
                            current_tags.add(tag_id)
                            tags_modified = True
                    elif not tag_id:
                         print(f"Warning: Could not find or create tag '{tag_ref}' for add operation. Skipping.", file=sys.stderr)
                except AttributeError:
                     print("Error: Tag service does not have 'get_tag_id_by_name_or_id' method.", file=sys.stderr)
                     sys.exit(1)
                except Exception as e:
                    print(f"Error processing tag '{tag_ref}' for add operation: {e}", file=sys.stderr)
                    # Continue processing other tags

        if args.remove_tags:
            print(f"Removing tags: {args.remove_tags}")
            tags_to_remove_ids = set()
            processed_refs_for_remove = set()
            for tag_ref in args.remove_tags:
                 if tag_ref in processed_refs_for_remove: continue
                 processed_refs_for_remove.add(tag_ref)
                 try:
                    # Conceptual: Assume tag_service method exists, DO NOT create if missing
                    tag_id = tag_service.get_tag_id_by_name_or_id(tag_ref, create_if_missing=False)
                    if tag_id:
                        tags_to_remove_ids.add(tag_id)
                    else:
                        # It's okay if the tag to remove doesn't exist or isn't on the task
                        print(f"Info: Tag '{tag_ref}' not found or already not associated with the task. Cannot remove.", file=sys.stderr)
                 except AttributeError:
                      print("Error: Tag service does not have 'get_tag_id_by_name_or_id' method.", file=sys.stderr)
                      sys.exit(1)
                 except Exception as e:
                     print(f"Error processing tag '{tag_ref}' for remove operation: {e}", file=sys.stderr)
                     # Continue processing other tags

            # Remove the found IDs from the current set
            if tags_to_remove_ids.intersection(current_tags):
                 current_tags -= tags_to_remove_ids
                 tags_modified = True

    # Finalize tag changes
    if tags_modified:
        task_to_edit.tag_ids = sorted(list(current_tags)) # Store as sorted list
        added = current_tags - original_tags
        removed = original_tags - current_tags
        summary_parts = ["Tags updated:"]
        if added:
            # TODO: Optionally look up tag names from IDs via tag_service for better summary
            summary_parts.append(f"Added {sorted(list(added))}.")
        if removed:
            # TODO: Optionally look up tag names from IDs via tag_service for better summary
            summary_parts.append(f"Removed {sorted(list(removed))}.")
        if not added and not removed: # Handle case where set was used but result is same
             summary_parts.append("Tags set (no change).")
        changes_summary.append(" ".join(summary_parts))
        changes_made = True


    # --- Update Dependencies (using service for validation) ---
    original_deps = set(original_task_data['dependency_ids'])
    current_deps = set(original_task_data['dependency_ids'])
    deps_modified = False

    if args.set_dependencies is not None: # Explicitly setting dependencies
        new_dep_ids = set()
        print(f"Setting dependencies to: {args.set_dependencies}")
        for dep_id in args.set_dependencies:
             # Conceptual: Validate dependency ID exists using task_service
             # Also prevent self-dependency
             if dep_id == task_id:
                  print(f"Warning: Cannot set a task to depend on itself ('{dep_id}'). Skipping.", file=sys.stderr)
                  continue
             try:
                 # TODO: Assume task_service has a method like task_exists or get_task_by_id
                 # This method needs to be defined in library/services.py
                 task_exists = task_service.task_exists(dep_id) # Hypothetical method
                 # --- Dummy logic - REMOVE WHEN SERVICE METHOD IS IMPLEMENTED ---
                 if not hasattr(task_service, 'task_exists'):
                      print(f"Warning: task_service.task_exists not implemented. Simulating existence for '{dep_id}'.")
                      task_exists = True # Assume exists for simulation
                 # --- End Dummy Logic ---

                 if task_exists:
                     new_dep_ids.add(dep_id)
                 else:
                     print(f"Warning: Dependency task with ID '{dep_id}' not found via service. Skipping.", file=sys.stderr)
             except AttributeError:
                 print("Error: Task service does not have expected validation method (e.g., 'task_exists').", file=sys.stderr)
                 sys.exit(1)
             except Exception as e:
                 print(f"Error validating dependency task '{dep_id}' via service for set operation: {e}", file=sys.stderr)
                 sys.exit(1) # Exit on validation error for set
        current_deps = new_dep_ids
        if current_deps != original_deps:
            deps_modified = True

    else: # Handle add/remove only if set_dependencies was not used
        if args.add_dependencies:
            print(f"Adding dependencies: {args.add_dependencies}")
            added_during_op = set()
            for dep_id in args.add_dependencies:
                 if dep_id in added_during_op: continue
                 added_during_op.add(dep_id)
                 # Prevent self-dependency
                 if dep_id == task_id:
                      print(f"Warning: Cannot add self as a dependency ('{dep_id}'). Skipping.", file=sys.stderr)
                      continue
                 try:
                     # Conceptual: Validate dependency ID exists using task_service
                     # TODO: Assume task_service has task_exists or get_task_by_id
                     task_exists = task_service.task_exists(dep_id) # Hypothetical
                     # --- Dummy logic - REMOVE WHEN SERVICE METHOD IS IMPLEMENTED ---
                     if not hasattr(task_service, 'task_exists'):
                          print(f"Warning: task_service.task_exists not implemented. Simulating existence for '{dep_id}'.")
                          task_exists = True # Assume exists for simulation
                     # --- End Dummy Logic ---

                     if task_exists:
                         if dep_id not in current_deps:
                             current_deps.add(dep_id)
                             deps_modified = True
                     else:
                         print(f"Warning: Dependency task with ID '{dep_id}' not found via service for add operation. Skipping.", file=sys.stderr)
                 except AttributeError:
                     print("Error: Task service does not have expected validation method (e.g., 'task_exists').", file=sys.stderr)
                     sys.exit(1)
                 except Exception as e:
                     print(f"Error validating dependency task '{dep_id}' via service for add operation: {e}", file=sys.stderr)
                     # Continue adding others

        if args.remove_dependencies:
            print(f"Removing dependencies: {args.remove_dependencies}")
            # No need to validate existence for removal, just remove if present
            ids_to_remove = set(args.remove_dependencies)
            if current_deps.intersection(ids_to_remove):
                 current_deps -= ids_to_remove
                 deps_modified = True

    # Finalize dependency changes
    if deps_modified:
        task_to_edit.dependency_ids = sorted(list(current_deps)) # Store as sorted list
        added = current_deps - original_deps
        removed = original_deps - current_deps
        summary_parts = ["Dependencies updated:"]
        if added: summary_parts.append(f"Added {sorted(list(added))}.")
        if removed: summary_parts.append(f"Removed {sorted(list(removed))}.")
        if not added and not removed:
             summary_parts.append("Dependencies set (no change).")
        changes_summary.append(" ".join(summary_parts))
        changes_made = True

    # --- Update Recurrence ---
    # Use the original recurrence object from the deep copy for comparison
    original_recurrence = original_task_data['recurrence']
    # Work on a copy of the current recurrence state to easily revert or compare
    current_recurrence = copy.deepcopy(getattr(task_to_edit, 'recurrence', None))
    recurrence_changed = False # Tracks if the recurrence object itself was modified

    if args.clear_recurrence:
        if current_recurrence is not None:
            print("Clearing recurrence rule.")
            current_recurrence = None
            recurrence_changed = True
    else:
        # Collect potential updates only if clear flag is not set
        recurrence_updates = {}
        if args.recurrence_frequency is not None:
            recurrence_updates['frequency'] = args.recurrence_frequency
        if args.recurrence_interval is not None:
            if args.recurrence_interval > 0:
                 recurrence_updates['interval'] = args.recurrence_interval
            else:
                 print("Error: Recurrence interval must be positive.", file=sys.stderr)
                 sys.exit(1)
        if args.recurrence_days is not None: # Can be empty list to clear days
             # Validate and convert day names to ints
             days_list = get_weekday_ints(args.recurrence_days)
             # Allow empty list to clear days_of_week if frequency is weekly
             recurrence_updates['days_of_week'] = days_list
        if args.recurrence_day_of_month is not None:
             # Validate day of month (e.g., 1-31)
             if 1 <= args.recurrence_day_of_month <= 31:
                 recurrence_updates['day_of_month'] = args.recurrence_day_of_month
             else:
                 print(f"Error: Invalid day of month '{args.recurrence_day_of_month}'. Must be between 1 and 31.", file=sys.stderr)
                 sys.exit(1)
        # TODO: Add args/logic for recurrence start/end dates if needed

        if recurrence_updates:
            if current_recurrence is None:
                # Creating a new recurrence rule requires frequency
                if 'frequency' not in recurrence_updates:
                    print("Error: Cannot set recurrence details without specifying --recurrence-frequency when creating a new rule.", file=sys.stderr)
                    sys.exit(1)

                print("Creating new recurrence rule.")
                try:
                    # Validate frequency-specific requirements before creating
                    freq = recurrence_updates['frequency']
                    days = recurrence_updates.get('days_of_week')
                    day_of_month = recurrence_updates.get('day_of_month')

                    if freq == RecurrenceFrequency.WEEKLY and days is None:
                        # Maybe default to empty list or prompt? For now, allow.
                         print("Warning: Creating weekly recurrence without specific days (--recurrence-days).")
                    elif freq != RecurrenceFrequency.WEEKLY and days is not None:
                         print(f"Warning: Ignoring --recurrence-days for non-weekly frequency ({freq}).")
                         recurrence_updates['days_of_week'] = None # Clear it

                    if freq == RecurrenceFrequency.MONTHLY and day_of_month is None:
                         print("Error: Monthly recurrence requires --recurrence-day-of-month.", file=sys.stderr)
                         sys.exit(1)
                    elif freq != RecurrenceFrequency.MONTHLY and day_of_month is not None:
                         print(f"Warning: Ignoring --recurrence-day-of-month for non-monthly frequency ({freq}).")
                         recurrence_updates['day_of_month'] = None # Clear it

                    current_recurrence = Recurrence(
                        frequency=recurrence_updates['frequency'],
                        interval=recurrence_updates.get('interval', 1),
                        days_of_week=recurrence_updates.get('days_of_week'),
                        day_of_month=recurrence_updates.get('day_of_month'),
                        start_date=datetime.datetime.now().date(), # Default start date to today
                        # end_date=... # Add if supported
                    )
                    recurrence_changed = True
                except Exception as e:
                    print(f"Error creating new Recurrence object: {e}", file=sys.stderr)
                    sys.exit(1)

            else:
                # Update existing recurrence rule
                print("Updating existing recurrence rule.")
                updated_fields = []
                new_frequency = recurrence_updates.get('frequency', current_recurrence.frequency) # Get potential new frequency first

                for field, value in recurrence_updates.items():
                     # Validate frequency-specific fields based on *potential* new frequency
                     if field == 'days_of_week':
                         if new_frequency != RecurrenceFrequency.WEEKLY:
                              if value is not None: # User tried to set days for non-weekly
                                   print(f"Warning: Ignoring --recurrence-days for non-weekly frequency ({new_frequency}).")
                                   continue # Don't apply this update
                         # Allow clearing days for weekly: value might be [] or None
                     elif field == 'day_of_month':
                          if new_frequency != RecurrenceFrequency.MONTHLY:
                               if value is not None:
                                    print(f"Warning: Ignoring --recurrence-day-of-month for non-monthly frequency ({new_frequency}).")
                                    continue

                     # Check if value actually changes
                     if getattr(current_recurrence, field, None) != value:
                         setattr(current_recurrence, field, value)
                         updated_fields.append(field)
                         recurrence_changed = True

                # Post-update cleanup: ensure consistency if frequency changed
                if 'frequency' in updated_fields:
                     if current_recurrence.frequency != RecurrenceFrequency.WEEKLY and current_recurrence.days_of_week is not None:
                          print("Clearing days_of_week due to frequency change.")
                          current_recurrence.days_of_week = None
                          recurrence_changed = True # It's a change from intermediate state
                     if current_recurrence.frequency != RecurrenceFrequency.MONTHLY and current_recurrence.day_of_month is not None:
                          print("Clearing day_of_month due to frequency change.")
                          current_recurrence.day_of_month = None
                          recurrence_changed = True

    # Finalize recurrence changes (compare final state to original deep copy)
    # Assumes Recurrence dataclass has a working __eq__ method
    if current_recurrence != original_recurrence:
         task_to_edit.recurrence = current_recurrence # Assign the modified/new/None object
         changes_summary.append(f"Recurrence rule updated. New rule: {current_recurrence}") # Relies on Recurrence.__str__/__repr__
         changes_made = True # Set master flag


    # --- Update Habit Tracking ---
    original_habit = original_task_data['habit_tracking']
    current_habit = copy.deepcopy(getattr(task_to_edit, 'habit_tracking', None))
    habit_changed = False # Tracks if the habit object itself was modified

    if args.remove_habit_tracking:
        if current_habit is not None:
            print("Removing habit tracking.")
            current_habit = None
            habit_changed = True
    else:
        # Collect potential updates only if clear flag is not set
        habit_updates = {}
        if args.habit_goal_type is not None:
            habit_updates['goal_type'] = args.habit_goal_type
        if args.habit_target_value is not None:
             if args.habit_target_value >= 0: # Basic validation
                 habit_updates['target_value'] = args.habit_target_value
             else:
                  print("Error: Habit target value must be non-negative.", file=sys.stderr)
                  sys.exit(1)
        # TODO: Add args/logic for habit start/end dates if needed

        if habit_updates:
             if current_habit is None:
                 # Don't implicitly create habit tracking on edit.
                 # User should use 'add --habit' or a dedicated command/flag for that.
                 print("Error: Cannot update habit details (--habit-goal-type, --habit-target-value) for a task that is not currently a habit.", file=sys.stderr)
                 print("Hint: Use 'add --habit ...' or a future 'task set-habit' command.", file=sys.stderr)
                 sys.exit(1)
             else:
                 print("Updating habit tracking details.")
                 updated_fields = []
                 potential_goal_type = habit_updates.get('goal_type', current_habit.goal_type)
                 potential_target_value = habit_updates.get('target_value', current_habit.target_value)

                 # Validate target value requirement based on potential new goal type *before* applying
                 if potential_goal_type in [HabitGoalType.WEEKLY_TIMES, HabitGoalType.MONTHLY_VALUE] and potential_target_value is None:
                     print(f"Error: Habit goal type '{potential_goal_type}' requires --habit-target-value.", file=sys.stderr)
                     sys.exit(1)
                 # Optional: Warn/clear target value if goal type *doesn't* require it?
                 elif potential_goal_type == HabitGoalType.DAILY_COMPLETION and potential_target_value is not None:
                      print(f"Warning: --habit-target-value is typically not used with goal type '{potential_goal_type}'. It will be stored but may not be used.")


                 for field, value in habit_updates.items():
                     if getattr(current_habit, field, None) != value:
                         setattr(current_habit, field, value)
                         updated_fields.append(field)
                         habit_changed = True

    # Finalize habit changes (compare final state to original deep copy)
    # Assumes HabitTracking dataclass has a working __eq__ method
    if current_habit != original_habit:
        task_to_edit.habit_tracking = current_habit # Assign the modified/new/None object
        changes_summary.append(f"Habit tracking updated. New details: {current_habit}") # Relies on HabitTracking.__str__/__repr__
        changes_made = True # Set master flag


    # 4. Save Changes if any were made
    if changes_made:
        # --- Save via Service ---
        try:
            print(f"Saving changes for task '{task_id}' via task_service...")
            task_service.save_task(task_to_edit)
            print(f"Task '{task_id}' ({getattr(task_to_edit, 'name', '')}) updated successfully (via service).")
            print("-" * 20)
            print("Summary of changes applied:")
            for change in changes_summary:
                print(f"  - {change}")
            print("-" * 20)
        except TypeError as e: # Catch type errors from service validation
             print(f"Error: {e}", file=sys.stderr)
             sys.exit(1)
        except AttributeError:
             print("Error: Task service does not have 'save_task' method.", file=sys.stderr) # Should exist based on services.py
             sys.exit(1)
        except Exception as e:
            print(f"Error saving updated task via service: {e}", file=sys.stderr)
            # TODO: Consider informing the user that in-memory changes were not persisted.
            sys.exit(1)
    else:
        print("No changes specified or provided values matched existing task attributes. Nothing to update.")


# --- Command Registration ---
def register_task_commands(subparsers: argparse._SubParsersAction):
    """Adds task-related commands to the main CLI parser."""

    # --- Add Task Command Parser ---
    add_parser = subparsers.add_parser("add", help="Add a new task")
    add_parser.add_argument("title", help="The title of the task (mandatory)")
    add_parser.add_argument("-d", "--description", help="Rich text description of the task")
    add_parser.add_argument("-i", "--icon", help="Icon or emoji for the task (maps to Task.emoji)")
    add_parser.add_argument("-p", "--project", help="Name or ID of the project to assign the task to")
    add_parser.add_argument("-t", "--tags", nargs='+', help="List of tag names or IDs to associate")
    add_parser.add_argument("--due-date", help="Due date in YYYY-MM-DD format")
    add_parser.add_argument("--start-date", help="Start date in YYYY-MM-DD format (task hidden until then)")

    # Use actual Enum members for choices if available, otherwise use dummy strings
    importance_choices = [level for level in dir(ImportanceLevel) if not level.startswith('_') and level != 'NotSet'] if ImportanceLevel else []
    difficulty_choices = [level for level in dir(DifficultyLevel) if not level.startswith('_') and level != 'NotSet'] if DifficultyLevel else []
    duration_choices = [level for level in dir(DurationLevel) if not level.startswith('_') and level != 'NotSet'] if DurationLevel else []
    recurrence_freq_choices = [freq for freq in dir(RecurrenceFrequency) if not freq.startswith('_')] if RecurrenceFrequency else []
    weekday_choices = [day for day in dir(Weekday) if not day.startswith('_')] if Weekday else []
    habit_goal_choices = [goal for goal in dir(HabitGoalType) if not goal.startswith('_')] if HabitGoalType else [] # Choices for habit goal type

    add_parser.add_argument("--importance", choices=importance_choices, help="Importance level")
    add_parser.add_argument("--difficulty", choices=difficulty_choices, help="Difficulty level")
    add_parser.add_argument("--duration", choices=duration_choices, help="Estimated duration level")

    add_parser.add_argument("--dependencies", nargs='+', help="List of task IDs or titles that this task depends on")
    add_parser.add_argument("--subtasks", nargs='+', help="List of titles for subtasks to create under this task")

    # Map --starred and --frog conceptually if needed, though not direct Task fields yet
    add_parser.add_argument("--starred", action="store_true", help="Flag the task as starred (conceptual)")
    add_parser.add_argument("--frog", action="store_true", help="Flag the task to 'Eat That Frog' (conceptual)")
    add_parser.add_argument("-n", "--note", help="A general note for the task (conceptual)")

    # Recurrence Arguments based on new model
    add_parser.add_argument("--recurrence-frequency",
                            choices=recurrence_freq_choices,
                            help="Frequency of recurrence (e.g., daily, weekly)")
    add_parser.add_argument("--recurrence-interval", type=int, help="Interval for recurrence (default 1, e.g., every 2 weeks)")
    # start_date/end_date for recurrence might be added here or inferred
    add_parser.add_argument("--recurrence-days",
                            nargs='+',
                            choices=weekday_choices,
                            help="Days for weekly recurrence (e.g., Mon Wed Fri)")
    add_parser.add_argument("--recurrence-day-of-month", type=int, help="Day of the month for monthly recurrence (1-31)")
    # Add more recurrence args based on Recurrence model if needed

    # Habit Arguments
    add_parser.add_argument("--habit", action="store_true", help="Flag this task as a habit to enable tracking.")
    add_parser.add_argument("--habit-goal-type",
                            choices=habit_goal_choices,
                            help="The type of goal for habit tracking (e.g., daily_completion, weekly_times)")
    add_parser.add_argument("--habit-target-value", type=int, help="The target value for certain habit goal types (e.g., target number of times per week)")

    add_parser.set_defaults(func=handle_add_task) # Link 'add' command to its handler

    # --- Edit Task Command Parser ---
    edit_parser = subparsers.add_parser("edit", help="Edit an existing task or habit")
    edit_parser.add_argument("id_or_prefix", help="The full or partial unique ID of the task/habit to edit")

    # General Attributes
    edit_parser.add_argument("--title", help="Update the task title")
    edit_parser.add_argument("--description", help="Update the task description")
    edit_parser.add_argument("--icon", help="Update the task icon/emoji")
    edit_parser.add_argument("--project", help="Change the associated project (provide name or ID)")

    # Dates (Use empty string "" to clear)
    edit_parser.add_argument("--due-date", help="Update the due date (YYYY-MM-DD or '')")
    edit_parser.add_argument("--start-date", help="Update the start date (YYYY-MM-DD or '')")

    # Levels
    # Use actual Enum members for choices if available, otherwise use dummy strings
    importance_choices = [level for level in dir(ImportanceLevel) if not level.startswith('_') and level != 'NotSet'] if ImportanceLevel else []
    difficulty_choices = [level for level in dir(DifficultyLevel) if not level.startswith('_') and level != 'NotSet'] if DifficultyLevel else []
    duration_choices = [level for level in dir(DurationLevel) if not level.startswith('_') and level != 'NotSet'] if DurationLevel else []
    recurrence_freq_choices = [freq for freq in dir(RecurrenceFrequency) if not freq.startswith('_')] if RecurrenceFrequency else []
    weekday_choices = [day for day in dir(Weekday) if not day.startswith('_')] if Weekday else []
    habit_goal_choices = [goal for goal in dir(HabitGoalType) if not goal.startswith('_')] if HabitGoalType else [] # Choices for habit goal type

    edit_parser.add_argument("--importance", choices=importance_choices, help="Change importance level")
    edit_parser.add_argument("--difficulty", choices=difficulty_choices, help="Change difficulty level")
    edit_parser.add_argument("--duration", choices=duration_choices, help="Change duration level")

    # Tags (Mutually exclusive operations might be better handled in logic)
    edit_parser.add_argument("--add-tags", nargs='+', help="Add tags (provide names or IDs)")
    edit_parser.add_argument("--remove-tags", nargs='+', help="Remove tags (provide names or IDs)")
    edit_parser.add_argument("--set-tags", nargs='*', help="Replace all existing tags (provide names or IDs). Use without args to clear all tags.") # nargs='*' allows empty list

    # Dependencies (Mutually exclusive operations might be better handled in logic)
    edit_parser.add_argument("--add-dependencies", nargs='+', help="Add task dependencies (provide IDs)")
    edit_parser.add_argument("--remove-dependencies", nargs='+', help="Remove task dependencies (provide IDs)")
    edit_parser.add_argument("--set-dependencies", nargs='*', help="Replace all dependencies (provide IDs). Use without args to clear all dependencies.") # nargs='*'

    # TODO: Add arguments for recurrence editing (e.g., --recurrence-frequency, --recurrence-interval, --recurrence-days, --recurrence-day-of-month, --clear-recurrence)
    # Example recurrence args:
    edit_parser.add_argument("--recurrence-frequency", choices=recurrence_freq_choices, help="Change frequency of recurrence")
    edit_parser.add_argument("--recurrence-interval", type=int, help="Change interval for recurrence")
    edit_parser.add_argument("--recurrence-days", nargs='+', choices=weekday_choices, help="Change days for weekly recurrence")
    edit_parser.add_argument("--recurrence-day-of-month", type=int, help="Change day of month for monthly recurrence")
    edit_parser.add_argument("--clear-recurrence", action="store_true", help="Remove recurrence rules from the task")

    # TODO: Add arguments for habit editing (e.g., --habit-goal-type, --habit-target-value, --set-habit?, --remove-habit?)
    # Example habit args:
    edit_parser.add_argument("--habit-goal-type", choices=habit_goal_choices, help="Change the habit goal type")
    edit_parser.add_argument("--habit-target-value", type=int, help="Change the habit target value")
    # Maybe flags to add/remove habit status?
    # edit_parser.add_argument("--set-habit", action="store_true", help="Mark this task as a habit (requires goal type)") # Needs more thought
    edit_parser.add_argument("--remove-habit-tracking", action="store_true", help="Remove habit tracking from this task")

    # TODO: Add arguments for subtask management (e.g., --add-subtask "desc:status", --edit-subtask index "desc:status", --remove-subtask index)

    edit_parser.set_defaults(func=handle_edit_task) # Link 'edit' command to its handler


    # --- Add other task-related commands here (e.g., list, complete, delete) ---
    # ... existing placeholder comments ...

    # Placeholder for new model options # <-- This section seems out of place, maybe leftover? Should be removed or integrated.
    # importance: Optional[str] = typer.Option(None, help="Importance level (TRIVIAL, LOW, MEDIUM, HIGH, DEFCON)"), # These are Typer options, not argparse
    # difficulty: Optional[str] = typer.Option(None, help="Difficulty level (TRIVIAL, EASY, MEDIUM, HARD, HERCULEAN)"),
    # duration: Optional[str] = typer.Option(None, help="Duration level (TRIVIAL, SHORT, MEDIUM, LONG, ODYSSEYEN)"),
    # add_subtask: Optional[str] = typer.Option(None, "--add-subtask", help="Add a subtask (description:status, e.g., 'Outline:false')"),
    # recurrence_days_of_week: Optional[List[str]] = typer.Option(None, "--days-of-week", help="Days for weekly recurrence (e.g., Mon,Wed,Fri)"),
    # recurrence_day_of_month: Optional[int] = typer.Option(None, "--day-of-month", help="Day for monthly recurrence (1-31)"),
    # WEEKDAY_MAP = { # <-- This is implementation detail, shouldn't be in arg definition
    #     "mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6
    # } 