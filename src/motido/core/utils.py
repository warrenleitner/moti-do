# core/utils.py
"""
Core utility functions. Currently minimal.
Could include things like validation, formatting, etc. later.
"""

# This file is intentionally simple for now.
# We could add helper functions here as the application grows.


def generate_id() -> str:
    """Generates a unique ID string."""
    import uuid

    return str(uuid.uuid4())
