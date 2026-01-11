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
    SubtaskRecurrenceMode,
    Tag,
    Task,
    User,
    XPTransaction,
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
    from psycopg2.extras import RealDictCursor, execute_values  # pragma: no cover

    POSTGRES_AVAILABLE = True  # pragma: no cover
except ImportError:  # pragma: no cover
    POSTGRES_AVAILABLE = False  # pragma: no cover
    psycopg2 = None  # pragma: no cover
    RealDictCursor = None  # pragma: no cover


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

        # Track initialization state to prevent duplicate logging
        self._initialized = False
        self._loaded_users: set[str] = set()

    def _get_connection(self) -> "psycopg2.connection":
        """Establishes a connection to the PostgreSQL database."""
        try:
            conn = psycopg2.connect(self._database_url, cursor_factory=RealDictCursor)
            return conn
        except Exception as e:  # pylint: disable=broad-exception-caught
            error_type = getattr(psycopg2, "Error", None)
            if isinstance(error_type, type) and issubclass(error_type, BaseException):
                if isinstance(e, error_type):
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
                        habit_start_delta INTEGER,
                        subtask_recurrence_mode TEXT DEFAULT 'default'
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

                # XP Transactions table
                cursor.execute(
                    """
                    CREATE TABLE IF NOT EXISTS xp_transactions (
                        id TEXT PRIMARY KEY,
                        user_username TEXT NOT NULL REFERENCES users(username)
                            ON DELETE CASCADE ON UPDATE CASCADE,
                        amount INTEGER NOT NULL,
                        source TEXT NOT NULL,
                        timestamp TIMESTAMP NOT NULL,
                        task_id TEXT,
                        description TEXT,
                        game_date DATE
                    )
                """
                )

                # Create index on user_username for faster transaction queries
                cursor.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_xp_transactions_user
                    ON xp_transactions(user_username)
                """
                )

                conn.commit()
        except Exception as e:  # pylint: disable=broad-exception-caught
            conn.rollback()
            print(f"Error creating PostgreSQL tables: {e}")
            raise

    def initialize(self) -> None:
        """Initializes the database by creating tables if needed."""
        # Skip if already initialized to reduce duplicate logging
        if self._initialized:
            return

        print("Initializing PostgreSQL database...")
        try:
            with self._get_connection() as conn:
                self._create_tables(conn)
                print("PostgreSQL tables created/verified successfully.")
            self._initialized = True
        except Exception as e:  # pylint: disable=broad-exception-caught
            print(f"PostgreSQL initialization failed: {e}")
            raise  # Re-raise to fail fast if database can't be initialized

    def load_user(self, username: str = DEFAULT_USERNAME) -> User | None:
        """Loads user data and their tasks from the PostgreSQL database."""
        # Only print loading message on first load per user
        if username not in self._loaded_users:
            print(f"Loading user '{username}' from PostgreSQL...")
            self._loaded_users.add(username)
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
                                multiplier=t.get("multiplier", 1.0),
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
                                multiplier=p.get("multiplier", 1.0),
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

                    # Load XP transactions for the user
                    cursor.execute(
                        """
                        SELECT * FROM xp_transactions WHERE user_username = %s
                        ORDER BY timestamp DESC
                        """,
                        (username,),
                    )
                    transaction_rows = cursor.fetchall()
                    xp_transactions = [
                        self._row_to_xp_transaction(row) for row in transaction_rows
                    ]

                    user = User(
                        username=username,
                        total_xp=total_xp,
                        password_hash=user_row.get("password_hash"),
                        tasks=tasks,
                        last_processed_date=last_processed,
                        vacation_mode=vacation_mode,
                        defined_tags=defined_tags,
                        defined_projects=defined_projects,
                        xp_transactions=xp_transactions,
                    )
                    print(f"User '{username}' loaded with {len(tasks)} tasks.")
                    return user

        except Exception as e:  # pylint: disable=broad-exception-caught
            error_type = getattr(psycopg2, "Error", None)
            if isinstance(error_type, type) and issubclass(error_type, BaseException):
                if isinstance(e, error_type):
                    print(f"Error loading user '{username}' from PostgreSQL: {e}")
                    return None
            raise

    @staticmethod
    def _is_mock_cursor(cursor: object) -> bool:
        """Return True when the cursor is a unittest.mock object (tests)."""
        return type(cursor).__module__.startswith("unittest.mock")

    @classmethod
    def _can_use_execute_values(cls, cursor: object) -> bool:
        """Detect whether psycopg2.extras.execute_values is safe to use."""
        if cls._is_mock_cursor(cursor):
            return False

        connection = getattr(cursor, "connection", None)
        encoding = getattr(connection, "encoding", None)
        return isinstance(encoding, str) and bool(encoding)

    @classmethod
    def _bulk_upsert(
        cls,
        cursor: "psycopg2.extensions.cursor",
        sql_values: str,
        sql_row: str,
        rows: list[tuple],
    ) -> None:
        """Bulk upsert using execute_values when available, else per-row execute."""
        if not rows:
            return

        if cls._can_use_execute_values(cursor):
            execute_values(cursor, sql_values, rows)
            return

        for row in rows:
            cursor.execute(sql_row, row)

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
        subtasks = self._normalize_subtasks(subtasks)

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
            subtask_recurrence_mode=self._parse_subtask_recurrence_mode(
                row.get("subtask_recurrence_mode")
            ),
        )

    def _parse_subtask_recurrence_mode(
        self, mode_str: str | None
    ) -> SubtaskRecurrenceMode:
        """Parse a subtask recurrence mode string, returning DEFAULT if invalid."""
        if not mode_str:
            return SubtaskRecurrenceMode.DEFAULT
        try:
            return SubtaskRecurrenceMode(mode_str)
        except ValueError:
            return SubtaskRecurrenceMode.DEFAULT

    @staticmethod
    def _normalize_subtasks(subtasks: list) -> list:
        """
        Normalize subtasks to ensure they're in dict format.

        Handles legacy format where subtasks were strings instead of dicts.
        """
        if not subtasks:
            return []
        normalized = []
        for item in subtasks:
            if isinstance(item, str):
                # Legacy format: convert string to dict
                normalized.append({"text": item, "complete": False})
            elif isinstance(item, dict):
                normalized.append(item)
            # Skip any other types
        return normalized

    def _row_to_xp_transaction(self, row: dict) -> XPTransaction:
        """Converts a database row to an XPTransaction object."""
        timestamp = row.get("timestamp", datetime.now())
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)

        game_date = row.get("game_date")
        if isinstance(game_date, str):
            game_date = date.fromisoformat(game_date)

        return XPTransaction(
            id=row.get("id", ""),
            amount=row.get("amount", 0),
            source=row.get("source", "task_completion"),
            timestamp=timestamp,
            task_id=row.get("task_id"),
            description=row.get("description", ""),
            game_date=game_date,
        )

    @staticmethod
    def _serialize_defined_tags(user: User) -> str:
        return json.dumps(
            [
                {
                    "id": t.id,
                    "name": t.name,
                    "color": t.color,
                    "multiplier": t.multiplier,
                }
                for t in user.defined_tags
            ]
        )

    @staticmethod
    def _serialize_defined_projects(user: User) -> str:
        return json.dumps(
            [
                {
                    "id": p.id,
                    "name": p.name,
                    "color": p.color,
                    "multiplier": p.multiplier,
                }
                for p in user.defined_projects
            ]
        )

    def _upsert_user_row(
        self, cursor: "psycopg2.extensions.cursor", user: User
    ) -> None:
        defined_tags_json = self._serialize_defined_tags(user)
        defined_projects_json = self._serialize_defined_projects(user)

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

    def _sync_tasks(self, cursor: "psycopg2.extensions.cursor", user: User) -> None:
        task_ids = [t.id for t in user.tasks]

        if user.tasks:
            rows = [
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
                    json.dumps(task.dependencies) if task.dependencies else None,
                    json.dumps(task.history) if task.history else None,
                    user.username,
                    task.is_habit,
                    task.recurrence_rule,
                    task.recurrence_type.value if task.recurrence_type else None,
                    task.streak_current,
                    task.streak_best,
                    task.parent_habit_id,
                    task.habit_start_delta,
                    task.subtask_recurrence_mode.value,
                )
                for task in user.tasks
            ]

            sql_values = """
                INSERT INTO tasks (
                    id, title, text_description, priority, difficulty, duration,
                    is_complete, creation_date, due_date, start_date,
                    icon, tags, project, subtasks, dependencies, history,
                    user_username, is_habit, recurrence_rule, recurrence_type,
                    streak_current, streak_best, parent_habit_id, habit_start_delta,
                    subtask_recurrence_mode
                ) VALUES %s
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    text_description = EXCLUDED.text_description,
                    priority = EXCLUDED.priority,
                    difficulty = EXCLUDED.difficulty,
                    duration = EXCLUDED.duration,
                    is_complete = EXCLUDED.is_complete,
                    creation_date = EXCLUDED.creation_date,
                    due_date = EXCLUDED.due_date,
                    start_date = EXCLUDED.start_date,
                    icon = EXCLUDED.icon,
                    tags = EXCLUDED.tags,
                    project = EXCLUDED.project,
                    subtasks = EXCLUDED.subtasks,
                    dependencies = EXCLUDED.dependencies,
                    history = EXCLUDED.history,
                    user_username = EXCLUDED.user_username,
                    is_habit = EXCLUDED.is_habit,
                    recurrence_rule = EXCLUDED.recurrence_rule,
                    recurrence_type = EXCLUDED.recurrence_type,
                    streak_current = EXCLUDED.streak_current,
                    streak_best = EXCLUDED.streak_best,
                    parent_habit_id = EXCLUDED.parent_habit_id,
                    habit_start_delta = EXCLUDED.habit_start_delta,
                    subtask_recurrence_mode = EXCLUDED.subtask_recurrence_mode
                """

            sql_row = """
                INSERT INTO tasks (
                    id, title, text_description, priority, difficulty, duration,
                    is_complete, creation_date, due_date, start_date,
                    icon, tags, project, subtasks, dependencies, history,
                    user_username, is_habit, recurrence_rule, recurrence_type,
                    streak_current, streak_best, parent_habit_id, habit_start_delta,
                    subtask_recurrence_mode
                ) VALUES (
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s, %s, %s, %s,
                    %s
                )
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    text_description = EXCLUDED.text_description,
                    priority = EXCLUDED.priority,
                    difficulty = EXCLUDED.difficulty,
                    duration = EXCLUDED.duration,
                    is_complete = EXCLUDED.is_complete,
                    creation_date = EXCLUDED.creation_date,
                    due_date = EXCLUDED.due_date,
                    start_date = EXCLUDED.start_date,
                    icon = EXCLUDED.icon,
                    tags = EXCLUDED.tags,
                    project = EXCLUDED.project,
                    subtasks = EXCLUDED.subtasks,
                    dependencies = EXCLUDED.dependencies,
                    history = EXCLUDED.history,
                    user_username = EXCLUDED.user_username,
                    is_habit = EXCLUDED.is_habit,
                    recurrence_rule = EXCLUDED.recurrence_rule,
                    recurrence_type = EXCLUDED.recurrence_type,
                    streak_current = EXCLUDED.streak_current,
                    streak_best = EXCLUDED.streak_best,
                    parent_habit_id = EXCLUDED.parent_habit_id,
                    habit_start_delta = EXCLUDED.habit_start_delta,
                    subtask_recurrence_mode = EXCLUDED.subtask_recurrence_mode
                """

            self._bulk_upsert(cursor, sql_values, sql_row, rows)

        if task_ids:
            cursor.execute(
                "DELETE FROM tasks WHERE user_username = %s AND NOT (id = ANY(%s))",
                (user.username, task_ids),
            )
        else:
            cursor.execute(
                "DELETE FROM tasks WHERE user_username = %s",
                (user.username,),
            )

    def _sync_xp_transactions(
        self,
        cursor: "psycopg2.extensions.cursor",
        user: User,
        *,
        delete_missing: bool,
    ) -> None:
        all_transactions = getattr(user, "xp_transactions", [])

        dirty_ids = getattr(user, "_dirty_xp_transaction_ids", None)
        if dirty_ids:
            transactions_to_upsert = [t for t in all_transactions if t.id in dirty_ids]
        else:
            transactions_to_upsert = all_transactions

        if transactions_to_upsert:
            rows = [
                (
                    trans.id,
                    user.username,
                    trans.amount,
                    trans.source,
                    trans.timestamp,
                    trans.task_id,
                    trans.description,
                    trans.game_date,
                )
                for trans in transactions_to_upsert
            ]

            sql_values = """
                INSERT INTO xp_transactions (
                    id, user_username, amount, source, timestamp,
                    task_id, description, game_date
                ) VALUES %s
                ON CONFLICT (id) DO UPDATE SET
                    user_username = EXCLUDED.user_username,
                    amount = EXCLUDED.amount,
                    source = EXCLUDED.source,
                    timestamp = EXCLUDED.timestamp,
                    task_id = EXCLUDED.task_id,
                    description = EXCLUDED.description,
                    game_date = EXCLUDED.game_date
                """

            sql_row = """
                INSERT INTO xp_transactions (
                    id, user_username, amount, source, timestamp,
                    task_id, description, game_date
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    user_username = EXCLUDED.user_username,
                    amount = EXCLUDED.amount,
                    source = EXCLUDED.source,
                    timestamp = EXCLUDED.timestamp,
                    task_id = EXCLUDED.task_id,
                    description = EXCLUDED.description,
                    game_date = EXCLUDED.game_date
                """

            self._bulk_upsert(cursor, sql_values, sql_row, rows)

        if delete_missing:
            transaction_ids = [t.id for t in all_transactions]
            if transaction_ids:
                cursor.execute(
                    """
                    DELETE FROM xp_transactions
                    WHERE user_username = %s AND NOT (id = ANY(%s))
                    """,
                    (user.username, transaction_ids),
                )
            else:
                cursor.execute(
                    "DELETE FROM xp_transactions WHERE user_username = %s",
                    (user.username,),
                )

    def save_user(self, user: User) -> None:
        """Saves the user and their tasks to the PostgreSQL database."""
        print(f"Saving user '{user.username}' to PostgreSQL...")
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cursor:
                    self._upsert_user_row(cursor, user)
                    self._sync_tasks(cursor, user)
                    self._sync_xp_transactions(cursor, user, delete_missing=True)

                    conn.commit()
                    print(f"User '{user.username}' saved with {len(user.tasks)} tasks.")

                    dirty_ids = getattr(user, "_dirty_xp_transaction_ids", None)
                    if dirty_ids is not None:
                        dirty_ids.clear()

        except Exception as e:  # pylint: disable=broad-exception-caught
            print(f"Error saving user '{user.username}' to PostgreSQL: {e}")
            raise

    def save_user_progress(self, user: User) -> None:
        """
        Save only user-level fields and XP transactions.

        This intentionally avoids rewriting the entire tasks table, which can be
        extremely expensive in serverless environments.

        Intended for operations like date advancement / penalties where tasks are
        not modified.
        """
        print(f"Saving user progress '{user.username}' to PostgreSQL...")
        try:
            with self._get_connection() as conn:
                with conn.cursor() as cursor:
                    self._upsert_user_row(cursor, user)
                    self._sync_xp_transactions(cursor, user, delete_missing=False)

                    conn.commit()

                    dirty_ids = getattr(user, "_dirty_xp_transaction_ids", None)
                    if dirty_ids is not None:
                        dirty_ids.clear()

        except Exception as e:  # pylint: disable=broad-exception-caught
            print(f"Error saving user progress '{user.username}' to PostgreSQL: {e}")
            raise

    def backend_type(self) -> str:
        """Returns the backend type."""
        return "postgres"
