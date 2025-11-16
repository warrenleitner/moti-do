#!/usr/bin/env python3
"""Debug script to check saved task data."""

from motido.data.abstraction import DEFAULT_USERNAME
from motido.data.backend_factory import get_data_manager

print("=== Debug Saved Tasks ===\n")

# Load the data manager
data_manager = get_data_manager()

try:
    # Load the user
    user = data_manager.load_user(DEFAULT_USERNAME)

    if user and user.tasks:
        print(f"Found {len(user.tasks)} tasks for user {user.username}:")

        for i, task in enumerate(user.tasks):
            print(f"\nTask {i+1}:")
            print(f"  ID: {task.id}")
            print(f"  Description: {task.description}")
            print(f"  Priority: {task.priority} (type: {type(task.priority)})")
            print(f"  Difficulty: {task.difficulty} (type: {type(task.difficulty)})")
            print(f"  Duration: {task.duration} (type: {type(task.duration)})")
            print(f"  Complete: {task.is_complete}")
            print(f"  Creation: {task.creation_date}")

            # Check the enum values and display properties
            print(f"  Priority value: '{task.priority.value}'")
            print(f"  Priority emoji: '{task.priority.emoji()}'")
            print(f"  Difficulty value: '{task.difficulty.value}'")
            print(f"  Difficulty emoji: '{task.difficulty.emoji()}'")
            print(f"  Duration value: '{task.duration.value}'")
            print(f"  Duration emoji: '{task.duration.emoji()}'")
    else:
        print("No tasks found or user doesn't exist")

except Exception as e:
    print(f"Error loading tasks: {e}")
