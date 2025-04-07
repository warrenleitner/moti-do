import unittest
import uuid
from src.motido.core.utils import generate_id

class TestUtils(unittest.TestCase):
    """Tests for core utility functions."""

    def test_generate_id_returns_string(self):
        """Test that generate_id returns a string."""
        new_id = generate_id()
        self.assertIsInstance(new_id, str)

    def test_generate_id_format(self):
        """Test that generate_id returns a string in UUID format."""
        new_id = generate_id()
        # Basic check for UUID format (length 36, dashes in correct places)
        self.assertEqual(len(new_id), 36)
        self.assertEqual(new_id[8], '-')
        self.assertEqual(new_id[13], '-')
        self.assertEqual(new_id[18], '-')
        self.assertEqual(new_id[23], '-')
        # More robust check: try parsing it as a UUID
        try:
            uuid.UUID(new_id, version=4)
        except ValueError:
            self.fail("generate_id did not return a valid UUID v4 string")

    def test_generate_id_uniqueness(self):
        """Test that subsequent calls to generate_id return different IDs."""
        id1 = generate_id()
        id2 = generate_id()
        self.assertNotEqual(id1, id2)

if __name__ == '__main__':
    unittest.main() 