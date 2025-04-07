import uuid

import pytest

from motido.core.utils import generate_id


def test_generate_id_returns_string() -> None:
    """Test that generate_id returns a string."""
    new_id = generate_id()
    assert isinstance(new_id, str)


def test_generate_id_format() -> None:
    """Test that generate_id returns a string in UUID format."""
    new_id = generate_id()
    # Basic check for UUID format (length 36, dashes in correct places)
    assert len(new_id) == 36
    assert new_id[8] == "-"
    assert new_id[13] == "-"
    assert new_id[18] == "-"
    assert new_id[23] == "-"
    # More robust check: try parsing it as a UUID
    uuid.UUID(new_id, version=4)  # This will raise ValueError if invalid


def test_generate_id_uniqueness() -> None:
    """Test that subsequent calls to generate_id return different IDs."""
    id1 = generate_id()
    id2 = generate_id()
    assert id1 != id2
