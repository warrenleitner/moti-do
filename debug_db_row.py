import json
import os
import sqlite3
import tempfile
from pathlib import Path

# Create temp dir
tmp = Path(tempfile.mkdtemp())
db_path = tmp / "test.db"

# Init database
conn = sqlite3.connect(str(db_path))
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Create tables
cursor.execute("CREATE TABLE users (username TEXT PRIMARY KEY, total_xp INTEGER)")
cursor.execute(
    """CREATE TABLE tasks (
    id TEXT,
    user_username TEXT,
    description TEXT,
    priority TEXT,
    difficulty TEXT,
    duration TEXT,
    is_complete INTEGER,
    creation_date TEXT,
    due_date TEXT,
    start_date TEXT,
    title TEXT,
    icon TEXT,
    tags TEXT,
    project TEXT,
    subtasks TEXT,
    dependencies TEXT
)"""
)

# Insert data
cursor.execute("INSERT INTO users VALUES (?, ?)", ("test_user", 0))
cursor.execute(
    """INSERT INTO tasks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
    (
        "test-id",
        "test_user",
        "Test Task",
        "Low",
        "Trivial",
        "Miniscule",
        0,
        "2023-01-01 12:00:00",
        "invalid-date-format",
        None,
        None,
        None,
        "[]",
        None,
        "[]",
        "[]",
    ),
)

conn.commit()

# Query back
cursor.execute("SELECT * FROM tasks WHERE id = ?", ("test-id",))
row = cursor.fetchone()
print(f"due_date value: {row['due_date']!r}")
print(f"due_date in row.keys(): {'due_date' in row.keys()}")
print(f"due_date bool: {bool(row['due_date'])}")

# Test the condition from database_manager
print(f"\nTesting 'in' operator:")
print(f'"due_date" in row: {"due_date" in row}')
print(f'"due_date" in row.keys(): {"due_date" in row.keys()}')

if "due_date" in row and row["due_date"]:
    print("Condition PASSED - would try to parse")
    from datetime import datetime

    try:
        due_date = datetime.strptime(row["due_date"], "%Y-%m-%d %H:%M:%S")
        print(f"Parsed successfully: {due_date}")
    except ValueError as e:
        print(f"ValueError caught: {e}")
else:
    print("Condition FAILED - would skip parsing")

conn.close()
