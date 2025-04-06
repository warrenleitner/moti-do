import os
import json
from pathlib import Path
import sys
from typing import Dict, Any, Optional, Literal
from datetime import datetime

# Add library path to sys.path if necessary (adjust based on project structure)
# This assumes the cli directory is at the same level as the library directory
project_root = Path(__file__).parent.parent
# Check if the path is already in sys.path to avoid duplicates
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
    print(f"Added {project_root} to sys.path") # Debug print

# Import necessary components from the library
# Using try-except for robustness if library structure changes or is not fully available
try:
    from library.datatypes import Task, Tag, Project, User
    print("Successfully imported models from library.datatypes") # Debug print
except ImportError:
    print("Warning: Could not import models from library.datatypes. Using dummy classes.")
    # Define dummy classes if import fails, allowing CLI core logic to proceed somewhat
    class Task: pass
    class Tag: pass
    class Project: pass
    class User: pass

# Import repository interfaces/implementations would go here if needed directly
# e.g., from library.repository import ITaskRepository, ...
# e.g., from library.persistence.json_repo import JsonTaskRepository, ...

# Constants for default configurations
DEFAULT_STORAGE_TYPE: Literal['json', 'database'] = 'json'
DEFAULT_JSON_DIR_NAME = ".moti-do-data"
DEFAULT_DB_FILE_NAME = "moti-do.db"
DEFAULT_USER_FILE = "user.json" # For JSON storage
DEFAULT_TASKS_FILE = "tasks.json"
DEFAULT_TAGS_FILE = "tags.json"
DEFAULT_PROJECTS_FILE = "projects.json"

def _validate_json_data(data: Any, expected_type_name: str, is_list: bool = True) -> bool:
    """Basic validation for loaded JSON data (placeholder)."""
    if is_list:
        if not isinstance(data, list):
            print(f"Error: Expected a list for {expected_type_name}, got {type(data)}.")
            return False
        # Could add checks for dict items within the list later
    else: # Expecting a single object (dict)
        if not isinstance(data, dict):
             print(f"Error: Expected a dictionary object for {expected_type_name}, got {type(data)}.")
             return False
    # Add more specific validation based on dataclass fields if needed
    # e.g., check for required keys, types using model.__annotations__
    print(f"Data validation passed for {expected_type_name} (basic check).")
    return True

def _initialize_json_storage(storage_path: Path) -> Dict[str, Any]:
    """Initializes JSON storage, loads data, or creates placeholders."""
    print(f"Initializing JSON storage at: {storage_path}")
    data = {'user': {}, 'tasks': [], 'tags': [], 'projects': []} # Default empty structures
    config_files = {
        'user': storage_path / DEFAULT_USER_FILE,
        'tasks': storage_path / DEFAULT_TASKS_FILE,
        'tags': storage_path / DEFAULT_TAGS_FILE,
        'projects': storage_path / DEFAULT_PROJECTS_FILE,
    }
    # Map keys to expected type names and whether it should be a list
    model_info = {
        'user': {'name': 'User', 'is_list': False},
        'tasks': {'name': 'Task', 'is_list': True},
        'tags': {'name': 'Tag', 'is_list': True},
        'projects': {'name': 'Project', 'is_list': True}
    }

    try:
        storage_path.mkdir(parents=True, exist_ok=True)
        print(f"Ensured storage directory exists: {storage_path}")
    except OSError as e:
        print(f"Error: Could not create storage directory {storage_path}: {e}")
        raise # Critical error, cannot proceed

    for key, file_path in config_files.items():
        info = model_info[key]
        expected_type_name = info['name']
        is_list = info['is_list']
        default_value = [] if is_list else {}

        if file_path.exists() and file_path.stat().st_size > 0:
            print(f"Attempting to load existing data from {file_path}...")
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    loaded_data = json.load(f)

                # Basic Validation
                if _validate_json_data(loaded_data, expected_type_name, is_list):
                     data[key] = loaded_data # Store raw loaded data
                     count = len(loaded_data) if is_list else 1
                     print(f"Successfully loaded and validated {count} {key} item(s).")
                else:
                    print(f"Warning: Validation failed for {file_path}. Creating placeholder.")
                    data[key] = default_value
                    # Overwrite invalid file with placeholder
                    with open(file_path, 'w', encoding='utf-8') as f:
                        json.dump(data[key], f, indent=4)

            except json.JSONDecodeError:
                print(f"Error: Could not decode JSON from {file_path}. File might be corrupted.")
                print("Creating empty placeholder file.")
                data[key] = default_value
                # Overwrite corrupted file
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data[key], f, indent=4)
            except Exception as e:
                print(f"Error loading {file_path}: {e}. Creating placeholder.")
                data[key] = default_value
                # Overwrite file that caused error
                with open(file_path, 'w', encoding='utf-8') as f:
                     json.dump(data[key], f, indent=4)
        else:
            print(f"No existing data found at {file_path} or file is empty. Creating placeholder file.")
            data[key] = default_value
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    json.dump(data[key], f, indent=4)
                print(f"Created placeholder file: {file_path}")
            except OSError as e:
                print(f"Error: Could not create placeholder file {file_path}: {e}")
                raise # Treat inability to write as critical

    return data # Return raw loaded data

def _initialize_db_storage(storage_path: Path) -> Dict[str, Any]:
    """Initializes Database storage, creates schema if needed (Simulated)."""
    print(f"Initializing Database storage at: {storage_path}")
    print("Note: Database storage initialization is currently simulated.")

    try:
        # Ensure parent directory exists if db path includes directories
        storage_path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Ensured parent directory exists: {storage_path.parent}")

        # Simulate connecting and schema creation
        # In a real scenario, use sqlite3 or an ORM like SQLAlchemy
        print(f"Simulating connection to SQLite database: {storage_path}...")
        # conn = sqlite3.connect(storage_path)
        # cursor = conn.cursor()
        # Example schema creation (adapt based on actual models)
        # cursor.execute("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, active_since TEXT, last_update TEXT)")
        # cursor.execute("CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, name TEXT, ..., status TEXT, project_id TEXT, FOREIGN KEY(project_id) REFERENCES projects(id))")
        # cursor.execute("CREATE TABLE IF NOT EXISTS tags (id TEXT PRIMARY KEY, name TEXT, ...)")
        # cursor.execute("CREATE TABLE IF NOT EXISTS projects (id TEXT PRIMARY KEY, name TEXT, ...)")
        # cursor.execute("CREATE TABLE IF NOT EXISTS task_tags (task_id TEXT, tag_id TEXT, PRIMARY KEY (task_id, tag_id), FOREIGN KEY(task_id) REFERENCES tasks(id), FOREIGN KEY(tag_id) REFERENCES tags(id))")
        # ... etc. ...
        # conn.commit()
        # conn.close()
        print(f"Database file checked/created (simulated) at {storage_path}.")
        print("Schema checked/created (simulated).")

        # For DB storage, repositories handle data access.
        # Return an empty data structure to indicate readiness.
        return {'user': {}, 'tasks': [], 'tags': [], 'projects': []}
    except OSError as e:
        print(f"Error ensuring directory/file structure for database at {storage_path}: {e}")
        raise
    except Exception as e:
        # Catch other potential errors during simulated setup
        print(f"Error during simulated database initialization for {storage_path}: {e}")
        raise # Re-raise the exception to signal failure


def initialize_cli(
    storage_type: Optional[Literal['json', 'database']] = None,
    storage_location: Optional[str] = None
) -> Dict[str, Any]:
    """
    Configures the Moti-Do CLI application storage and loads initial data.

    Handles storage type selection, directory/file configuration, data loading/validation,
    and placeholder creation.

    Args:
        storage_type: The storage type ('json' or 'database'). Prompts if None.
        storage_location: The path for storage (directory for json, file for db). Uses default if None.

    Returns:
        A dictionary containing the application's configuration:
        {
            'storage_type': str,
            'storage_path': Path,
            'repositories': Dict[str, Any], # Instantiated repository objects
            'settings': Dict[str, Any] # Other initial settings
        }
    Raises:
        SystemExit: If critical initialization steps fail.
    """
    print("--- Moti-Do CLI Initialization ---")

    # 1. Determine Storage Type
    valid_storage_types = ['json', 'database']
    if storage_type is None:
        while True:
            prompt = f"Choose storage type ({'/'.join(valid_storage_types)}) [default: {DEFAULT_STORAGE_TYPE}]: "
            choice = input(prompt).lower().strip()
            if not choice:
                storage_type = DEFAULT_STORAGE_TYPE
                print(f"Using default storage type: {storage_type}")
                break
            if choice in valid_storage_types:
                storage_type = choice
                print(f"Selected storage type: {storage_type}")
                break
            else:
                print(f"Invalid choice. Please enter one of {valid_storage_types}.")
    elif storage_type not in valid_storage_types:
         print(f"Warning: Invalid storage_type '{storage_type}' provided. Using default '{DEFAULT_STORAGE_TYPE}'.")
         storage_type = DEFAULT_STORAGE_TYPE
    else:
        print(f"Using provided storage type: {storage_type}")


    # 2. Determine Storage Location
    resolved_storage_path: Path
    is_default_location = False
    if storage_location:
        # Use Path for robust path handling, resolve to absolute path
        resolved_storage_path = Path(storage_location).resolve()
        print(f"Using provided storage location: {resolved_storage_path}")
    else:
        is_default_location = True
        # Default location: ~/.moti-do-data for json dir, or ~/.moti-do-data/moti-do.db for db file
        default_base_dir = Path.home() / DEFAULT_JSON_DIR_NAME
        if storage_type == 'json':
            resolved_storage_path = default_base_dir
        else: # database
            resolved_storage_path = default_base_dir / DEFAULT_DB_FILE_NAME
        print(f"Using default storage location: {resolved_storage_path}")


    # 3 & 4. Initialize Storage Backend (Path Validation, Placeholder/Load)
    # This step primarily ensures the path is valid and creates placeholders/schema if needed.
    # Actual data loading will be handled by repositories later.
    try:
        if storage_type == 'json':
            # Ensure the target path is suitable for directory storage
            if resolved_storage_path.exists() and not resolved_storage_path.is_dir():
                 # If user provided a file path for json, raise error.
                 # If default path somehow became a file, raise error.
                 raise ValueError(f"JSON storage path conflicts with an existing file: {resolved_storage_path}")
            # Create directory if it doesn't exist
            resolved_storage_path.mkdir(parents=True, exist_ok=True)
            print(f"JSON storage directory ensured: {resolved_storage_path}")
            # We can optionally check/create default files here, or let repositories handle it.
            # Let's check/create the core files for clarity.
            _ = _initialize_json_storage(resolved_storage_path) # Ensures files exist

        elif storage_type == 'database':
             # Ensure the target path is suitable for a file-based database
             if resolved_storage_path.is_dir():
                 # If user provided a directory path for db, raise error.
                 # If default path somehow became a directory, raise error.
                 raise ValueError(f"Database storage path conflicts with an existing directory: {resolved_storage_path}")
             # Ensure parent directory exists
             resolved_storage_path.parent.mkdir(parents=True, exist_ok=True)
             # Simulate connection & schema creation (actual creation would happen here)
             _ = _initialize_db_storage(resolved_storage_path) # Ensures DB file can be created/accessed

        print("Storage backend initialized successfully.")

    except (OSError, ValueError, Exception) as e:
        print(f"Critical Error: Storage initialization failed for path '{resolved_storage_path}'.")
        print(f"Error details: {e}")
        print("Application cannot start. Please check permissions or the specified path.")
        sys.exit(1) # Exit if critical initialization fails

    # --------------------------------------------------------------------
    # --- Repository Initialization (Crucial Step) ---
    # --------------------------------------------------------------------
    # Now that storage path is confirmed, initialize the appropriate repositories.
    # This is where the actual data access layer is set up.
    repositories = {}
    try:
        if storage_type == 'json':
            print("Initializing JSON repositories...")
            # Placeholder: Replace with actual JSON repository imports and instantiation
            # from library.persistence.json_repo import JsonUserRepository, JsonTaskRepository, JsonTagRepository, JsonProjectRepository
            # repositories['user'] = JsonUserRepository(resolved_storage_path / DEFAULT_USER_FILE)
            # repositories['task'] = JsonTaskRepository(resolved_storage_path / DEFAULT_TASKS_FILE)
            # repositories['tag'] = JsonTagRepository(resolved_storage_path / DEFAULT_TAGS_FILE)
            # repositories['project'] = JsonProjectRepository(resolved_storage_path / DEFAULT_PROJECTS_FILE)
            print("(Using placeholder repositories for JSON)")
            class PlaceholderRepo:
                def __init__(self, path): self.path = path
                def get_all(self): print(f"Simulated get_all from {self.path}"); return []
                def save(self, item): print(f"Simulated save to {self.path}")
                # Add other necessary methods matching IRepository interfaces
            repositories['user'] = PlaceholderRepo(resolved_storage_path / DEFAULT_USER_FILE)
            repositories['task'] = PlaceholderRepo(resolved_storage_path / DEFAULT_TASKS_FILE)
            repositories['tag'] = PlaceholderRepo(resolved_storage_path / DEFAULT_TAGS_FILE)
            repositories['project'] = PlaceholderRepo(resolved_storage_path / DEFAULT_PROJECTS_FILE)

        elif storage_type == 'database':
            print("Initializing Database repositories...")
            # Placeholder: Replace with actual DB repository imports and instantiation
            # from library.persistence.db_repo import DbUserRepository, DbTaskRepository, DbTagRepository, DbProjectRepository
            # repositories['user'] = DbUserRepository(resolved_storage_path) # Pass DB path/connection string
            # repositories['task'] = DbTaskRepository(resolved_storage_path)
            # repositories['tag'] = DbTagRepository(resolved_storage_path)
            # repositories['project'] = DbProjectRepository(resolved_storage_path)
            print("(Using placeholder repositories for Database)")
            class PlaceholderDbRepo:
                def __init__(self, db_path): self.db_path = db_path
                def get_all(self): print(f"Simulated get_all from DB {self.db_path}"); return []
                def save(self, item): print(f"Simulated save to DB {self.db_path}")
                # Add other necessary methods matching IRepository interfaces
            repositories['user'] = PlaceholderDbRepo(resolved_storage_path)
            repositories['task'] = PlaceholderDbRepo(resolved_storage_path)
            repositories['tag'] = PlaceholderDbRepo(resolved_storage_path)
            repositories['project'] = PlaceholderDbRepo(resolved_storage_path)

        print("Repositories initialized.")

    except ImportError as e:
        print(f"Critical Error: Failed to import necessary repository classes.")
        print(f"Error details: {e}")
        print("Please ensure the 'library.persistence' modules are correctly structured.")
        sys.exit(1)
    except Exception as e:
        print(f"Critical Error: Failed to instantiate repositories.")
        print(f"Error details: {e}")
        sys.exit(1)


    # 5. Initial Settings (Example)
    # These could be loaded from a config file or set as defaults
    initial_settings = {
        "default_sort_order": "due_date", # Example: 'priority', 'name', 'created_at'
        "notifications_enabled": False,   # For potential future desktop notifications
        "display_mode": "compact",      # Example: 'compact' vs 'detailed' task view
        # Add other user-configurable settings here
    }
    print("Loaded initial application settings.")
    # In a real app, you might try loading these from a user config file first


    # 6. Return Configuration Bundle
    # Note: Returning instantiated repositories is often more useful than raw loaded data.
    config = {
        'storage_type': storage_type,
        'storage_path': resolved_storage_path, # The actual path being used
        'repositories': repositories,         # Ready-to-use repository objects
        'settings': initial_settings
    }

    print("--- Initialization Complete ---")
    return config

# Example Usage Block (for testing purposes)
# if __name__ == "__main__":
#     print(" * "*20 + " Running Example Initializations " + " * "*20)
#
#     # --- Test Case 1: Default JSON ---
#     print(">>> TEST 1: Default JSON Initialization (will prompt user)")
#     # To run this test without prompts, comment out the input() lines in initialize_cli
#     # or provide default arguments: initialize_cli(storage_type='json')
#     try:
#          # You might need to manually enter 'json' or just press Enter if running interactively
#          config1 = initialize_cli()
#          print("Config 1 Result:", config1)
#          # Example: Access a repository
#          if 'task' in config1['repositories']:
#              print("Simulating task repo usage:")
#              tasks = config1['repositories']['task'].get_all()
#              # config1['repositories']['task'].save({"id": "1", "name": "Test Task"})
#     except SystemExit:
#          print("Initialization failed for Test 1.")
#     except Exception as e:
#          print(f"An unexpected error occurred during Test 1: {e}")
#
#     # --- Test Case 2: Explicit JSON Path ---
#     print(">>> TEST 2: Explicit JSON Initialization")
#     temp_json_path = "./temp_moti_json_data"
#     print(f"(Using path: {temp_json_path})")
#     try:
#         config2 = initialize_cli(storage_type='json', storage_location=temp_json_path)
#         print("Config 2 Result:", config2)
#         # Clean up the temporary directory afterwards if desired
#         # import shutil
#         # shutil.rmtree(temp_json_path, ignore_errors=True)
#         # print(f"Cleaned up {temp_json_path}")
#     except SystemExit:
#          print("Initialization failed for Test 2.")
#     except Exception as e:
#          print(f"An unexpected error occurred during Test 2: {e}")
#
#
#     # --- Test Case 3: Explicit Database Path ---
#     print(">>> TEST 3: Explicit Database Initialization")
#     temp_db_path = "./temp_moti_db_data/main_test.db"
#     print(f"(Using path: {temp_db_path})")
#     try:
#         config3 = initialize_cli(storage_type='database', storage_location=temp_db_path)
#         print("Config 3 Result:", config3)
#         # Clean up the temporary file/dir afterwards if desired
#         # temp_db_path_obj = Path(temp_db_path)
#         # if temp_db_path_obj.exists(): temp_db_path_obj.unlink()
#         # if temp_db_path_obj.parent.exists() and not any(temp_db_path_obj.parent.iterdir()):
#         #      temp_db_path_obj.parent.rmdir()
#         # print(f"Cleaned up {temp_db_path}")
#     except SystemExit:
#          print("Initialization failed for Test 3.")
#     except Exception as e:
#          print(f"An unexpected error occurred during Test 3: {e}")
#
#
#     # --- Test Case 4: Invalid Storage Type Provided ---
#     print(">>> TEST 4: Invalid Storage Type (should default)")
#     try:
#         config4 = initialize_cli(storage_type='xml', storage_location='./temp_moti_data_xml')
#         print("Config 4 Result:", config4)
#         # Clean up
#         # import shutil
#         # shutil.rmtree('./temp_moti_data_xml', ignore_errors=True)
#     except SystemExit:
#          print("Initialization failed for Test 4.")
#     except Exception as e:
#          print(f"An unexpected error occurred during Test 4: {e}")
#
#     print("" + " * "*20 + " Example Initializations Finished " + " * "*20)
