# data/database_manager.py
"""
Implementation of the DataManager interface using SQLite database storage.
"""

import os
import sqlite3
from typing import List, Optional, Tuple

from motido.core.models import Task, User

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
            # User table (simple for now)
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS users (
                    username TEXT PRIMARY KEY
                )
            """
            )
            # Task table
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS tasks (
                    id TEXT PRIMARY KEY,
                    description TEXT NOT NULL,
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

    def load_user(self, username: str = DEFAULT_USERNAME) -> User | None:
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

                # Load tasks for the user
                cursor.execute(
                    "SELECT id, description FROM tasks WHERE user_username = ?",
                    (username,),
                )
                task_rows = cursor.fetchall()
                tasks = [
                    Task(id=row["id"], description=row["description"])
                    for row in task_rows
                ]

                user = User(username=username, tasks=tasks)
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
                "INSERT OR IGNORE INTO users (username) VALUES (?)", (username,)
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

                # Strategy: Delete existing tasks for the user and insert current ones.
                # This is simpler than diffing but less efficient for large datasets.
                # For a production app, consider updating existing/deleting
                # removed/inserting new.
                cursor.execute(
                    "DELETE FROM tasks WHERE user_username = ?", (user.username,)
                )
                print(f"Deleted existing tasks for '{user.username}'.")

                # Prepare task data for batch insertion
                tasks_to_insert: List[Tuple[str, str, str]] = [
                    (task.id, task.description, user.username) for task in user.tasks
                ]

                # Insert new tasks if any exist
                if tasks_to_insert:
                    cursor.executemany(
                        "INSERT INTO tasks (id, description, user_username) "
                        "VALUES (?, ?, ?)",
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
