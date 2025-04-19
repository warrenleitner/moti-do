# core/utils.py
"""
Core utility functions. Currently minimal.
Could include things like validation, formatting, etc. later.
"""

import uuid

from motido.core.models import Priority

# This file is intentionally simple for now.
# We could add helper functions here as the application grows.


def generate_uuid() -> str:
    """Generate a random UUID string."""
    return str(uuid.uuid4())


def parse_priority_safely(priority_str: str, task_id: str | None = None) -> Priority:
    """
    Safely converts a string to a Priority enum value.

    Args:
        priority_str: The string representation of the priority
        task_id: Optional task ID for warning message context

    Returns:
        Priority enum value, or Priority.LOW if the string is invalid
    """
    try:
        return Priority(priority_str)
    except ValueError:
        # Handle case where stored priority is invalid
        task_context = f" in task {task_id}" if task_id else ""
        print(
            f"Warning: Invalid priority '{priority_str}'{task_context}. Using default."
        )
        return Priority.LOW
