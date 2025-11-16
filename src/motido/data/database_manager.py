# data/database_manager.py
"""
Implementation of the DataManager interface using SQLite database storage.
"""

import json
import os
import sqlite3
from datetime import datetime
from typing import Optional

from motido.core.models import Difficulty, Duration, Priority, Task, User
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
                    total_xp INTEGER NOT NULL DEFAULT 0
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
                    duration TEXT NOT NULL DEFAULT 'Miniscule',
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
                    FOREIGN KEY (user_username) REFERENCES users (username)
                        ON DELETE CASCADE ON UPDATE CASCADE
                )
            """
            )
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

                # Check if user exists
                cursor.execute(
                    "SELECT username FROM users WHERE username = ?", (username,)
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

                # Load tasks for the user
                cursor.execute(
                    "SELECT id, title, text_description, priority, difficulty, duration, "
                    "is_complete, creation_date, due_date, start_date, icon, tags, "
                    "project, subtasks, dependencies, history FROM tasks "
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
                        else Duration.MINISCULE.value
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
                    )
                    tasks.append(task)

                user = User(username=username, total_xp=total_xp, tasks=tasks)
                print(f"User '{username}' loaded successfully with {len(tasks)} tasks.")
                return user

        except sqlite3.Error as e:
            print(f"Error loading user '{username}' from motido.database: {e}")
            return None

    def _ensure_user_exists(self, conn: sqlite3.Connection, username: str) -> None:
        """Ensures the user exists in the users table, inserting if necessary."""
        try:
            cursor = conn.cursor()
            # Use INSERT OR IGNORE to avoid errors if user already exists
            cursor.execute(
                "INSERT OR IGNORE INTO users (username, total_xp) VALUES (?, ?)",
                (username, 0),
            )
            # No commit needed due to autocommit (isolation_level=None)
        except sqlite3.Error as e:
            print(f"Error ensuring user '{username}' exists: {e}")
            # Decide how to handle this - maybe raise an exception?

    def save_user(self, user: User) -> None:
        """Saves the user and their tasks to the database."""
        print(f"Saving user '{user.username}' to database...")
        try:
            with self._get_connection() as conn:
                cursor = conn.cursor()

                # Ensure the user exists in the users table
                self._ensure_user_exists(conn, user.username)

                # Update user's total_xp
                cursor.execute(
                    "UPDATE users SET total_xp = ? WHERE username = ?",
                    (user.total_xp, user.username),
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
                    )
                    for task in user.tasks
                ]

                # Insert new tasks if any exist
                if tasks_to_insert:
                    cursor.executemany(
                        "INSERT INTO tasks (id, title, text_description, priority, difficulty, "
                        "duration, is_complete, creation_date, due_date, start_date, "
                        "icon, tags, project, subtasks, dependencies, history, user_username) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
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
