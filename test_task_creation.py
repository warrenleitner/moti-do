#!/usr/bin/env python3
"""Test script to verify TaskFormScreen fix."""

from datetime import datetime

from motido.cli.tui import TaskFormScreen
from motido.core.models import Difficulty, Duration, Priority

print("=== TaskFormScreen Creation Test ===\n")

# Test creating new TaskFormScreen without task (should work now)
try:
    form_screen = TaskFormScreen()
    print("✅ TaskFormScreen() - Success!")
    print(f"   is_edit: {form_screen.is_edit}")
    print(f"   _edit_task: {form_screen._edit_task}")
except Exception as e:
    print(f"❌ TaskFormScreen() - Failed: {e}")

# Test creating TaskFormScreen with task
try:
    from motido.core.models import Task

    test_task = Task(
        description="Test task",
        priority=Priority.HIGH,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.SHORT,
        creation_date=datetime.now(),
    )

    form_screen_edit = TaskFormScreen(test_task)
    print("\n✅ TaskFormScreen(task) - Success!")
    print(f"   is_edit: {form_screen_edit.is_edit}")
    print(f"   _edit_task description: {form_screen_edit._edit_task.description}")
    print(f"   _edit_task priority: {form_screen_edit._edit_task.priority.value}")
except Exception as e:
    print(f"\n❌ TaskFormScreen(task) - Failed: {e}")

print("\n=== Test Complete ===")
