# data/database_manager.py
"""
Implementation of the DataManager interface using SQLite database storage.
"""

import json
import os
import sqlite3
from datetime import date, datetime
from typing import Optional

from motido.core.models import (
    Difficulty,
    Duration,
    Priority,
    Project,
    RecurrenceType,
    Tag,
    Task,
    User,
)
from motido.core.utils import (
    parse_difficulty_safely,
    parse_duration_safely,
    parse_priority_safely,
)

from .abstraction import DEFAULT_USERNAME, DataManager
from .config import get_config_path  # Needed to place DB file near config

DB_NAME = "motido.db"


class DatabaseDataManager(DataManager):
    """Manages data persistence using an SQLite database."""

    def __init__(self) -> None:
        """Initializes the Database data manager."""
        self._db_path = self._get_db_path()
        # Initialize connection and cursor attributes for _connect/_close methods
        self.conn: Optional[sqlite3.Connection] = None
        self.cursor: Optional[sqlite3.Cursor] = None

    def _get_db_path(self) -> str:
        """Constructs the full path to the SQLite database file."""
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        data_dir_path = os.path.join(project_root, "data")
        return os.path.join(data_dir_path, DB_NAME)

    def _ensure_data_dir_exists(self) -> None:
        """Creates the data directory if it doesn't exist."""
        os.makedirs(os.path.dirname(self._db_path), exist_ok=True)

    def _get_connection(self) -> sqlite3.Connection:
        """Establishes a connection to the SQLite database."""
        self._ensure_data_dir_exists()
        try:
            # isolation_level=None enables autocommit mode for simplicity here
            # In a larger app, explicit transaction management is better
            conn = sqlite3.connect(self._db_path, isolation_level=None)
            conn.row_factory = sqlite3.Row  # Return rows as dict-like objects
            return conn
        except sqlite3.Error as e:
            print(f"Error connecting to database '{self._db_path}': {e}")
            raise  # Re-raise the exception to signal connection failure

    def _create_tables(self, conn: sqlite3.Connection) -> None:
        """Creates the necessary database tables if they don't exist."""
        try:
            cursor = conn.cursor()
            # User table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY,
                    total_xp INTEGER NOT NULL DEFAULT 0,
                    last_processed_date TEXT NOT NULL DEFAULT (date('now')),
                    vacation_mode INTEGER NOT NULL DEFAULT 0
                )
            """
            )
            # Task table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    text_description TEXT,
                    priority TEXT NOT NULL DEFAULT 'Low',
                    difficulty TEXT NOT NULL DEFAULT 'Trivial',
                    duration TEXT NOT NULL DEFAULT 'Minuscule',
                    is_complete INTEGER NOT NULL DEFAULT 0,
                    creation_date TEXT,
                    due_date TEXT,
                    start_date TEXT,
                    icon TEXT,
                    tags TEXT,
                    project TEXT,
                    subtasks TEXT,
                    dependencies TEXT,
                    history TEXT,
                    user_username TEXT NOT NULL,
                    is_habit INTEGER NOT NULL DEFAULT 0,
                    recurrence_rule TEXT,
                    recurrence_type TEXT,
                    streak_current INTEGER NOT NULL DEFAULT 0,
                    streak_best INTEGER NOT NULL DEFAULT 0,
                    parent_habit_id TEXT,
                    FOREIGN KEY (user_username) REFERENCES users (username)
                        ON DELETE CASCADE ON UPDATE CASCADE
                )
            """
            )

            # Migration: Add new columns if they don't exist
            # SQLite doesn't support IF NOT EXISTS for ADD COLUMN, so we try and ignore error
            new_columns = [
                ("is_habit", "INTEGER NOT NULL DEFAULT 0"),
                ("recurrence_rule", "TEXT"),
                ("recurrence_type", "TEXT"),
                ("streak_current", "INTEGER NOT NULL DEFAULT 0"),
                ("streak_best", "INTEGER NOT NULL DEFAULT 0"),
                ("parent_habit_id", "TEXT"),
            ]

            for col_name, col_def in new_columns:
                try:
                    cursor.execute(f"ALTER TABLE tasks ADD COLUMN {col_name} {col_def}")
                except sqlite3.OperationalError:
                    # Column likely already exists
                    pass

            # Migration: Add vacation_mode to users if missing
            try:
                cursor.execute(
                    "ALTER TABLE users ADD COLUMN vacation_mode INTEGER NOT NULL DEFAULT 0"
                )
            except sqlite3.OperationalError:
                pass  # Column likely already exists

            # Migration: Add defined_tags and defined_projects to users if missing
            user_columns = [
                ("defined_tags", "TEXT"),  # JSON array of tag objects
                ("defined_projects", "TEXT"),  # JSON array of project objects
            ]
            for col_name, col_def in user_columns:  # pragma: no cover
                try:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {col_name} {col_def}")
                except sqlite3.OperationalError:
                    pass  # Column likely already exists

            conn.commit()  # Commit table creation
            print("Database tables checked/created successfully.")
        except sqlite3.Error as e:
            print(f"Error creating database tables: {e}")

    def initialize(self) -> None:
        """Initializes the database by creating tables if needed."""
        print(f"Initializing database at: {self._db_path}")
        try:
            with self._get_connection() as conn:
                self._create_tables(conn)
        except sqlite3.Error as e:
            print(f"Database initialization failed: {e}")

    def load_user(
        self, username: str = DEFAULT_USERNAME
    ) -> (
        User | None
    ):  # pylint: disable=too-many-locals,too-many-branches,too-many-statements
        """Loads user data and their tasks from the database."""
        # Placeholder for future sync: Check for remote changes before loading
        print(f"Loading user '{username}' from motido.database...")
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()

                # Check if user exists and get user data
                cursor.execute(
                    "SELECT username, total_xp, last_processed_date, vacation_mode, "
                    "defined_tags, defined_projects FROM users WHERE username = ?",
                    (username,),
                )
                user_row = cursor.fetchone()

                if not user_row:
                    print(f"User '{username}' not found in database.")
                    # Optionally create user here:
                    # self._ensure_user_exists(conn, username)
                    # return User(username=username)
                    return None

                # Get total_xp from user row
                total_xp = user_row["total_xp"] if "total_xp" in user_row.keys() else 0

                # Get last_processed_date from user row
                last_processed_str = (
                    user_row["last_processed_date"]
                    if "last_processed_date" in user_row.keys()
                    else None
                )
                if last_processed_str:
                    last_processed = date.fromisoformat(last_processed_str)
                else:
                    last_processed = date.today()

                # Load tasks for the user
                cursor.execute(
                    "SELECT id, title, text_description, priority, difficulty, duration, "
                    "is_complete, creation_date, due_date, start_date, icon, tags, "
                    "project, subtasks, dependencies, history, is_habit, recurrence_rule, "
                    "recurrence_type, streak_current, streak_best, parent_habit_id FROM tasks "
                    "WHERE user_username = ?",
                    (username,),
                )
                task_rows = cursor.fetchall()
                tasks = []
                for row in task_rows:
                    # Convert priority string to enum
                    priority_str = (
                        row["priority"]
                        if "priority" in row.keys()
                        else Priority.LOW.value
                    )
                    priority = parse_priority_safely(priority_str, row["id"])

                    # Convert difficulty string to enum
                    difficulty_str = (
                        row["difficulty"]
                        if "difficulty" in row.keys()
                        else Difficulty.TRIVIAL.value
                    )
                    difficulty = parse_difficulty_safely(difficulty_str, row["id"])

                    # Convert duration string to enum
                    duration_str = (
                        row["duration"]
                        if "duration" in row.keys()
                        else Duration.MINUSCULE.value
                    )
                    duration = parse_duration_safely(duration_str, row["id"])

                    # Get is_complete (stored as INTEGER: 0 or 1)
                    is_complete = (
                        bool(row["is_complete"])
                        if "is_complete" in row.keys()
                        else False
                    )

                    # Get creation_date from row or use current time if not present
                    creation_date = datetime.now()
                    if "creation_date" in row.keys() and row["creation_date"]:
                        try:
                            creation_date = datetime.strptime(
                                row["creation_date"], "%Y-%m-%d %H:%M:%S"
                            )
                        except ValueError:
                            print(
                                f"Warning: Invalid creation_date format for task {row['id']}, using current time."
                            )

                    # Get due_date and start_date
                    due_date = None
                    if "due_date" in row.keys() and row["due_date"]:
                        try:
                            due_date = datetime.strptime(
                                row["due_date"], "%Y-%m-%d %H:%M:%S"
                            )
                        except ValueError:
                            print(
                                f"Warning: Invalid due_date format for task {row['id']}, ignoring."
                            )

                    start_date = None
                    if "start_date" in row.keys() and row["start_date"]:
                        try:
                            start_date = datetime.strptime(
                                row["start_date"], "%Y-%m-%d %H:%M:%S"
                            )
                        except ValueError:
                            print(
                                f"Warning: Invalid start_date format for task {row['id']}, ignoring."
                            )

                    # Deserialize JSON fields (tags, subtasks, dependencies)
                    tags = []
                    if "tags" in row.keys() and row["tags"]:
                        try:
                            tags = json.loads(row["tags"])
                        except json.JSONDecodeError:
                            print(
                                f"Warning: Invalid JSON in tags for task {row['id']}, using empty list."
                            )

                    subtasks = []
                    if "subtasks" in row.keys() and row["subtasks"]:
                        try:
                            subtasks = json.loads(row["subtasks"])
                        except json.JSONDecodeError:
                            print(
                                f"Warning: Invalid JSON in subtasks for task {row['id']}, using empty list."
                            )

                    dependencies = []
                    if "dependencies" in row.keys() and row["dependencies"]:
                        try:
                            dependencies = json.loads(row["dependencies"])
                        except json.JSONDecodeError:
                            print(
                                f"Warning: Invalid JSON in dependencies for task {row['id']}, using empty list."
                            )

                    history = []
                    if "history" in row.keys() and row["history"]:
                        try:
                            history = json.loads(row["history"])
                        except json.JSONDecodeError:
                            print(
                                f"Warning: Invalid JSON in history for task {row['id']}, using empty list."
                            )

                    # Handle migration from old 'description' column to new 'title' column
                    title = row["title"] if "title" in row.keys() else None
                    if not title:
                        # Migrate old data if description column exists
                        title = (  # pragma: no cover
                            row["description"]
                            if "description" in row.keys()
                            else "Untitled Task"
                        )

                    text_description = (
                        row["text_description"]
                        if "text_description" in row.keys()
                        else None
                    )

                    # Parse recurrence type
                    recurrence_type_str = (
                        row["recurrence_type"]
                        if "recurrence_type" in row.keys()
                        else None
                    )
                    recurrence_type = None
                    if recurrence_type_str:
                        try:
                            recurrence_type = RecurrenceType(recurrence_type_str)
                        except ValueError:
                            pass

                    task = Task(
                        id=row["id"],
                        title=title,
                        text_description=text_description,
                        creation_date=creation_date,
                        priority=priority,
                        difficulty=difficulty,
                        duration=duration,
                        is_complete=is_complete,
                        due_date=due_date,
                        start_date=start_date,
                        icon=row["icon"] if "icon" in row.keys() else None,
                        tags=tags,
                        project=row["project"] if "project" in row.keys() else None,
                        subtasks=subtasks,
                        dependencies=dependencies,
                        history=history,
                        is_habit=(
                            bool(row["is_habit"]) if "is_habit" in row.keys() else False
                        ),
                        recurrence_rule=(
                            row["recurrence_rule"]
                            if "recurrence_rule" in row.keys()
                            else None
                        ),
                        recurrence_type=recurrence_type,
                        streak_current=(
                            row["streak_current"]
                            if "streak_current" in row.keys()
                            else 0
                        ),
                        streak_best=(
                            row["streak_best"] if "streak_best" in row.keys() else 0
                        ),
                        parent_habit_id=(
                            row["parent_habit_id"]
                            if "parent_habit_id" in row.keys()
                            else None
                        ),
                    )
                    tasks.append(task)

                # Deserialize defined tags
                defined_tags: list[Tag] = []
                if "defined_tags" in user_row.keys() and user_row["defined_tags"]:
                    try:
                        tags_data = json.loads(user_row["defined_tags"])
                        defined_tags = [
                            Tag(
                                id=t.get("id", ""),
                                name=t.get("name", "Unknown"),
                                color=t.get("color", "#808080"),
                            )
                            for t in tags_data
                        ]
                    except json.JSONDecodeError:
                        pass  # Use empty list

                # Deserialize defined projects
                defined_projects: list[Project] = []
                if (
                    "defined_projects" in user_row.keys()
                    and user_row["defined_projects"]
                ):
                    try:
                        projects_data = json.loads(user_row["defined_projects"])
                        defined_projects = [
                            Project(
                                id=p.get("id", ""),
                                name=p.get("name", "Unknown"),
                                color=p.get("color", "#4A90D9"),
                            )
                            for p in projects_data
                        ]
                    except json.JSONDecodeError:
                        pass  # Use empty list

                user = User(
                    username=username,
                    total_xp=total_xp,
                    tasks=tasks,
                    last_processed_date=last_processed,
                    vacation_mode=(
                        bool(user_row["vacation_mode"])
                        if "vacation_mode" in user_row.keys()
                        else False
                    ),
                    defined_tags=defined_tags,
                    defined_projects=defined_projects,
                )
                print(f"User '{username}' loaded successfully with {len(tasks)} tasks.")
                return user

        except sqlite3.Error as e:
            print(f"Error loading user '{username}' from motido.database: {e}")
            return None

    def _ensure_user_exists(self, conn: sqlite3.Connection, user: User) -> None:
        """Ensures the user exists in the users table, inserting if necessary."""
        try:
            cursor = conn.cursor()
            # Serialize defined_tags and defined_projects as JSON
            defined_tags_json = (
                json.dumps(
                    [
                        {"id": t.id, "name": t.name, "color": t.color}
                        for t in user.defined_tags
                    ]
                )
                if user.defined_tags
                else None
            )
            defined_projects_json = (
                json.dumps(
                    [
                        {"id": p.id, "name": p.name, "color": p.color}
                        for p in user.defined_projects
                    ]
                )
                if user.defined_projects
                else None
            )
            # Use INSERT OR IGNORE to avoid errors if user already exists
            sql = (
                "INSERT OR IGNORE INTO users "
                "(username, total_xp, last_processed_date, vacation_mode, defined_tags, defined_projects) "
                "VALUES (?, ?, ?, ?, ?, ?)"
            )
            cursor.execute(
                sql,
                (
                    user.username,
                    user.total_xp,
                    user.last_processed_date.isoformat(),
                    1 if user.vacation_mode else 0,
                    defined_tags_json,
                    defined_projects_json,
                ),
            )
            # No commit needed due to autocommit (isolation_level=None)
        except sqlite3.Error as e:
            print(f"Error ensuring user '{user.username}' exists: {e}")
            # Decide how to handle this - maybe raise an exception?

    def save_user(self, user: User) -> None:
        """Saves the user and their tasks to the database."""
        print(f"Saving user '{user.username}' to database...")
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()

                # Ensure the user exists in the users table
                self._ensure_user_exists(conn, user)

                # Serialize defined_tags and defined_projects as JSON
                defined_tags_json = (
                    json.dumps(
                        [
                            {"id": t.id, "name": t.name, "color": t.color}
                            for t in user.defined_tags
                        ]
                    )
                    if user.defined_tags
                    else None
                )
                defined_projects_json = (
                    json.dumps(
                        [
                            {"id": p.id, "name": p.name, "color": p.color}
                            for p in user.defined_projects
                        ]
                    )
                    if user.defined_projects
                    else None
                )

                # Update user's total_xp, last_processed_date, vacation_mode, and registries
                cursor.execute(
                    "UPDATE users SET total_xp = ?, last_processed_date = ?, vacation_mode = ?, "
                    "defined_tags = ?, defined_projects = ? WHERE username = ?",
                    (
                        user.total_xp,
                        user.last_processed_date.isoformat(),
                        1 if user.vacation_mode else 0,
                        defined_tags_json,
                        defined_projects_json,
                        user.username,
                    ),
                )

                # Strategy: Delete existing tasks for the user and insert current ones.
                # This is simpler than diffing but less efficient for large datasets.
                # For a production app, consider updating existing/deleting
                # removed/inserting new.
                cursor.execute(
                    "DELETE FROM tasks WHERE user_username = ?", (user.username,)
                )
                print(f"Deleted existing tasks for '{user.username}'.")

                # Prepare task data for batch insertion
                tasks_to_insert = [
                    (
                        task.id,
                        task.title,
                        task.text_description,
                        task.priority.value,
                        task.difficulty.value,
                        task.duration.value,
                        1 if task.is_complete else 0,
                        (
                            task.creation_date.strftime("%Y-%m-%d %H:%M:%S")
                            if task.creation_date
                            else None
                        ),
                        (
                            task.due_date.strftime("%Y-%m-%d %H:%M:%S")
                            if task.due_date
                            else None
                        ),
                        (
                            task.start_date.strftime("%Y-%m-%d %H:%M:%S")
                            if task.start_date
                            else None
                        ),
                        task.icon,
                        json.dumps(task.tags) if task.tags else None,
                        task.project,
                        json.dumps(task.subtasks) if task.subtasks else None,
                        json.dumps(task.dependencies) if task.dependencies else None,
                        json.dumps(task.history) if task.history else None,
                        user.username,
                        1 if task.is_habit else 0,
                        task.recurrence_rule,
                        task.recurrence_type.value if task.recurrence_type else None,
                        task.streak_current,
                        task.streak_best,
                        task.parent_habit_id,
                    )
                    for task in user.tasks
                ]

                # Insert new tasks if any exist
                if tasks_to_insert:
                    cursor.executemany(
                        "INSERT INTO tasks (id, title, text_description, priority, difficulty, "
                        "duration, is_complete, creation_date, due_date, start_date, "
                        "icon, tags, project, subtasks, dependencies, history, user_username, "
                        "is_habit, recurrence_rule, recurrence_type, streak_current, streak_best, "
                        "parent_habit_id) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        tasks_to_insert,
                    )
                    print(
                        f"Inserted {len(tasks_to_insert)} tasks for '{user.username}'."
                    )
                else:
                    print(f"No tasks to insert for '{user.username}'.")

                # No explicit commit needed due to autocommit (isolation_level=None)
                print(f"User '{user.username}' saved successfully.")
                # Placeholder for future sync: Push changes to remote after saving

        except sqlite3.Error as e:
            print(f"Error saving user '{user.username}' to database: {e}")

    def backend_type(self) -> str:
        """Returns the backend type."""
        return "db"

    def _connect(self) -> None:
        """Connects to the SQLite database."""
        # Place DB in the same directory as the config file
        # (within the package data dir)
        db_dir = os.path.dirname(get_config_path())
        db_path = os.path.join(db_dir, DB_NAME)
        print(f"DB Path: {db_path}")
        self.conn = sqlite3.connect(db_path)
        self.cursor = self.conn.cursor()

    def _close(self) -> None:
        """Closes the database connection."""
        if self.conn:
            self.conn.commit()  # Ensure changes are saved before closing
            self.conn.close()
            self.conn = None
            self.cursor = None
