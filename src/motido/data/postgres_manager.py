# data/postgres_manager.py
# pylint: disable=too-many-locals
"""
Implementation of the DataManager interface using PostgreSQL database storage.
Designed for use with Vercel Postgres.
"""

import json
import os
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

# Try to import psycopg2, but allow graceful fallback
try:
    import psycopg2  # pragma: no cover
    from psycopg2.extras import RealDictCursor  # pragma: no cover

    POSTGRES_AVAILABLE = True  # pragma: no cover
except ImportError:
    POSTGRES_AVAILABLE = False
    psycopg2 = None  # type: ignore
    RealDictCursor = None  # type: ignore


class PostgresDataManager(DataManager):
    """Manages data persistence using a PostgreSQL database (Vercel Postgres)."""

    def __init__(self, database_url: Optional[str] = None) -> None:
        """
        Initializes the PostgreSQL data manager.

        Args:
            database_url: PostgreSQL connection URL. If not provided,
                         reads from DATABASE_URL environment variable.
        """
        if not POSTGRES_AVAILABLE:
            raise ImportError(
                "psycopg2 is not installed. Install it with: pip install psycopg2-binary"
            )

        self._database_url = database_url or os.getenv("DATABASE_URL")
        if not self._database_url:
            raise ValueError(
                "DATABASE_URL environment variable is required for PostgreSQL backend"
            )

    def _get_connection(self) -> "psycopg2.connection":
        """Establishes a connection to the PostgreSQL database."""
        try:
            conn = psycopg2.connect(self._database_url, cursor_factory=RealDictCursor)
            return conn
        except psycopg2.Error as e:
            print(f"Error connecting to PostgreSQL database: {e}")
            raise

    def _create_tables(self, conn: "psycopg2.connection") -> None:
        """Creates the necessary database tables if they don't exist."""
        try:
            with conn.cursor() as cursor:
                # User table
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS users (
                        username TEXT PRIMARY KEY,
                        total_xp INTEGER NOT NULL DEFAULT 0,
                        password_hash TEXT,
                        last_processed_date DATE NOT NULL DEFAULT CURRENT_DATE,
                        vacation_mode BOOLEAN NOT NULL DEFAULT FALSE,
                        defined_tags JSONB,
                        defined_projects JSONB
                    )
                """
                )

                # Migration: Add password_hash column if it doesn't exist
                # This handles upgrading existing databases
                cursor.execute(
                    """
                    DO $$
                    BEGIN
                        IF NOT EXISTS (
                            SELECT 1 FROM information_schema.columns
                            WHERE table_name = 'users' AND column_name = 'password_hash'
                        ) THEN
                            ALTER TABLE users ADD COLUMN password_hash TEXT;
                        END IF;
                    END $$;
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
                        is_complete BOOLEAN NOT NULL DEFAULT FALSE,
                        creation_date TIMESTAMP,
                        due_date TIMESTAMP,
                        start_date TIMESTAMP,
                        completion_date TIMESTAMP,
                        icon TEXT,
                        tags JSONB,
                        project TEXT,
                        subtasks JSONB,
                        dependencies JSONB,
                        history JSONB,
                        user_username TEXT NOT NULL REFERENCES users(username)
                            ON DELETE CASCADE ON UPDATE CASCADE,
                        is_habit BOOLEAN NOT NULL DEFAULT FALSE,
                        recurrence_rule TEXT,
                        recurrence_type TEXT,
                        streak_current INTEGER NOT NULL DEFAULT 0,
                        streak_best INTEGER NOT NULL DEFAULT 0,
                        parent_habit_id TEXT,
                        habit_start_delta INTEGER
                    )
                """
                )

                # Create index on user_username for faster queries
                cursor.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_tasks_user
                    ON tasks(user_username)
                """
                )

                conn.commit()
                print("PostgreSQL tables checked/created successfully.")
        except psycopg2.Error as e:
            conn.rollback()
            print(f"Error creating PostgreSQL tables: {e}")
            raise

    def initialize(self) -> None:
        """Initializes the database by creating tables if needed."""
        print("Initializing PostgreSQL database...")
        try:
            with self._get_connection() as conn:
                self._create_tables(conn)
        except psycopg2.Error as e:
            print(f"PostgreSQL initialization failed: {e}")

    def load_user(self, username: str = DEFAULT_USERNAME) -> User | None:
        """Loads user data and their tasks from the PostgreSQL database."""
        print(f"Loading user '{username}' from PostgreSQL...")
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cursor:
                    # Get user data
                    cursor.execute(
                        """
                        SELECT username, total_xp, password_hash, last_processed_date, vacation_mode,
                               defined_tags, defined_projects
                        FROM users WHERE username = %s
                        """,
                        (username,),
                    )
                    user_row = cursor.fetchone()

                    if not user_row:
                        print(f"User '{username}' not found in PostgreSQL.")
                        return None

                    # Parse user data
                    total_xp = user_row.get("total_xp", 0)
                    last_processed = user_row.get("last_processed_date", date.today())
                    if isinstance(last_processed, str):
                        last_processed = date.fromisoformat(last_processed)
                    vacation_mode = user_row.get("vacation_mode", False)

                    # Parse defined tags
                    defined_tags: list[Tag] = []
                    tags_data = user_row.get("defined_tags")
                    if tags_data:
                        if isinstance(tags_data, str):  # pragma: no cover
                            tags_data = json.loads(tags_data)  # pragma: no cover
                        defined_tags = [
                            Tag(
                                id=t.get("id", ""),
                                name=t.get("name", "Unknown"),
                                color=t.get("color", "#808080"),
                            )
                            for t in tags_data
                        ]

                    # Parse defined projects
                    defined_projects: list[Project] = []
                    projects_data = user_row.get("defined_projects")
                    if projects_data:
                        if isinstance(projects_data, str):  # pragma: no cover
                            projects_data = json.loads(
                                projects_data
                            )  # pragma: no cover
                        defined_projects = [
                            Project(
                                id=p.get("id", ""),
                                name=p.get("name", "Unknown"),
                                color=p.get("color", "#4A90D9"),
                            )
                            for p in projects_data
                        ]

                    # Load tasks for the user
                    cursor.execute(
                        """
                        SELECT * FROM tasks WHERE user_username = %s
                        """,
                        (username,),
                    )
                    task_rows = cursor.fetchall()
                    tasks = [self._row_to_task(row) for row in task_rows]

                    user = User(
                        username=username,
                        total_xp=total_xp,
                        password_hash=user_row.get("password_hash"),
                        tasks=tasks,
                        last_processed_date=last_processed,
                        vacation_mode=vacation_mode,
                        defined_tags=defined_tags,
                        defined_projects=defined_projects,
                    )
                    print(f"User '{username}' loaded with {len(tasks)} tasks.")
                    return user

        except psycopg2.Error as e:
            print(f"Error loading user '{username}' from PostgreSQL: {e}")
            return None

    def _row_to_task(self, row: dict) -> Task:
        """Converts a database row to a Task object."""
        # Parse enums
        priority = parse_priority_safely(
            row.get("priority", Priority.LOW.value), row.get("id", "unknown")
        )
        difficulty = parse_difficulty_safely(
            row.get("difficulty", Difficulty.TRIVIAL.value), row.get("id", "unknown")
        )
        duration = parse_duration_safely(
            row.get("duration", Duration.MINUSCULE.value), row.get("id", "unknown")
        )

        # Parse dates
        creation_date = row.get("creation_date", datetime.now())
        if isinstance(creation_date, str):
            creation_date = datetime.fromisoformat(creation_date)

        due_date = row.get("due_date")
        if isinstance(due_date, str):
            due_date = datetime.fromisoformat(due_date)

        start_date = row.get("start_date")
        if isinstance(start_date, str):
            start_date = datetime.fromisoformat(start_date)

        # Parse JSONB fields
        tags = row.get("tags", [])
        if isinstance(tags, str):
            tags = json.loads(tags)

        subtasks = row.get("subtasks", [])
        if isinstance(subtasks, str):
            subtasks = json.loads(subtasks)

        dependencies = row.get("dependencies", [])
        if isinstance(dependencies, str):
            dependencies = json.loads(dependencies)

        history = row.get("history", [])
        if isinstance(history, str):
            history = json.loads(history)

        # Parse recurrence type
        recurrence_type = None
        recurrence_type_str = row.get("recurrence_type")
        if recurrence_type_str:
            try:
                recurrence_type = RecurrenceType(recurrence_type_str)
            except ValueError:  # pragma: no cover
                pass  # pragma: no cover

        return Task(
            id=row["id"],
            title=row.get("title", "Untitled"),
            text_description=row.get("text_description"),
            creation_date=creation_date,
            priority=priority,
            difficulty=difficulty,
            duration=duration,
            is_complete=row.get("is_complete", False),
            due_date=due_date,
            start_date=start_date,
            icon=row.get("icon"),
            tags=tags or [],
            project=row.get("project"),
            subtasks=subtasks or [],
            dependencies=dependencies or [],
            history=history or [],
            is_habit=row.get("is_habit", False),
            recurrence_rule=row.get("recurrence_rule"),
            recurrence_type=recurrence_type,
            streak_current=row.get("streak_current", 0),
            streak_best=row.get("streak_best", 0),
            parent_habit_id=row.get("parent_habit_id"),
            habit_start_delta=row.get("habit_start_delta"),
        )

    def save_user(self, user: User) -> None:
        """Saves the user and their tasks to the PostgreSQL database."""
        print(f"Saving user '{user.username}' to PostgreSQL...")
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cursor:
                    # Upsert user
                    defined_tags_json = json.dumps(
                        [
                            {"id": t.id, "name": t.name, "color": t.color}
                            for t in user.defined_tags
                        ]
                    )
                    defined_projects_json = json.dumps(
                        [
                            {"id": p.id, "name": p.name, "color": p.color}
                            for p in user.defined_projects
                        ]
                    )

                    cursor.execute(
                        """
                        INSERT INTO users (username, total_xp, password_hash, last_processed_date,
                                          vacation_mode, defined_tags, defined_projects)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                        ON CONFLICT (username) DO UPDATE SET
                            total_xp = EXCLUDED.total_xp,
                            password_hash = EXCLUDED.password_hash,
                            last_processed_date = EXCLUDED.last_processed_date,
                            vacation_mode = EXCLUDED.vacation_mode,
                            defined_tags = EXCLUDED.defined_tags,
                            defined_projects = EXCLUDED.defined_projects
                        """,
                        (
                            user.username,
                            user.total_xp,
                            user.password_hash,
                            user.last_processed_date.isoformat(),
                            user.vacation_mode,
                            defined_tags_json,
                            defined_projects_json,
                        ),
                    )

                    # Delete existing tasks and insert new ones
                    cursor.execute(
                        "DELETE FROM tasks WHERE user_username = %s",
                        (user.username,),
                    )

                    # Insert tasks
                    for task in user.tasks:  # pragma: no cover
                        cursor.execute(  # pragma: no cover
                            """
                            INSERT INTO tasks (
                                id, title, text_description, priority, difficulty, duration,
                                is_complete, creation_date, due_date, start_date,
                                icon, tags, project, subtasks, dependencies, history,
                                user_username, is_habit, recurrence_rule, recurrence_type,
                                streak_current, streak_best, parent_habit_id, habit_start_delta
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                                %s, %s, %s, %s, %s, %s, %s, %s
                            )
                            """,
                            (
                                task.id,
                                task.title,
                                task.text_description,
                                task.priority.value,
                                task.difficulty.value,
                                task.duration.value,
                                task.is_complete,
                                task.creation_date,
                                task.due_date,
                                task.start_date,
                                task.icon,
                                json.dumps(task.tags) if task.tags else None,
                                task.project,
                                json.dumps(task.subtasks) if task.subtasks else None,
                                (
                                    json.dumps(task.dependencies)
                                    if task.dependencies
                                    else None
                                ),
                                json.dumps(task.history) if task.history else None,
                                user.username,
                                task.is_habit,
                                task.recurrence_rule,
                                (
                                    task.recurrence_type.value
                                    if task.recurrence_type
                                    else None
                                ),
                                task.streak_current,
                                task.streak_best,
                                task.parent_habit_id,
                                task.habit_start_delta,
                            ),
                        )

                    conn.commit()
                    print(f"User '{user.username}' saved with {len(user.tasks)} tasks.")

        except psycopg2.Error as e:
            print(f"Error saving user '{user.username}' to PostgreSQL: {e}")
            raise

    def backend_type(self) -> str:
        """Returns the backend type."""
        return "postgres"
