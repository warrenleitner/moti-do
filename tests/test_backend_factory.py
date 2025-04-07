import unittest
from unittest.mock import patch, MagicMock

# Import the factory function and the classes it might return
from src.motido.data.backend_factory import get_data_manager
from src.motido.data.json_manager import JsonDataManager
from src.motido.data.database_manager import DatabaseDataManager
from src.motido.data.abstraction import DataManager # Import the base class for type checking


class TestBackendFactory(unittest.TestCase):
    """Tests for the data manager factory function."""

    @patch('src.motido.data.backend_factory.load_config')
    @patch('src.motido.data.backend_factory.JsonDataManager')
    @patch('src.motido.data.backend_factory.DatabaseDataManager') # Keep this mocked
    @patch('src.motido.data.backend_factory.print') # Mock print
    def test_get_data_manager_json_backend(self, mock_print, mock_db_manager, mock_json_manager, mock_load_config):
        """Test factory returns JsonDataManager for 'json' config."""
        # Configure mocks
        mock_load_config.return_value = {"backend": "json"}
        mock_json_instance = MagicMock(spec=JsonDataManager)
        mock_json_manager.return_value = mock_json_instance

        # Call the factory
        manager = get_data_manager()

        # Assertions
        mock_load_config.assert_called_once()
        mock_json_manager.assert_called_once()
        mock_db_manager.assert_not_called()
        self.assertIsInstance(manager, JsonDataManager)
        self.assertEqual(manager, mock_json_instance)
        mock_print.assert_called_once_with("Using JSON backend.")

    @patch('src.motido.data.backend_factory.load_config')
    @patch('src.motido.data.backend_factory.JsonDataManager') # Keep this mocked
    @patch('src.motido.data.backend_factory.DatabaseDataManager')
    @patch('src.motido.data.backend_factory.print') # Mock print
    def test_get_data_manager_db_backend(self, mock_print, mock_db_manager, mock_json_manager, mock_load_config):
        """Test factory returns DatabaseDataManager for 'db' config."""
        # Configure mocks
        mock_load_config.return_value = {"backend": "db"}
        mock_db_instance = MagicMock(spec=DatabaseDataManager)
        mock_db_manager.return_value = mock_db_instance

        # Call the factory
        manager = get_data_manager()

        # Assertions
        mock_load_config.assert_called_once()
        mock_db_manager.assert_called_once()
        mock_json_manager.assert_not_called()
        self.assertIsInstance(manager, DatabaseDataManager)
        self.assertEqual(manager, mock_db_instance)
        mock_print.assert_called_once_with("Using Database (SQLite) backend.")

    @patch('src.motido.data.backend_factory.load_config')
    @patch('src.motido.data.backend_factory.JsonDataManager')
    @patch('src.motido.data.backend_factory.DatabaseDataManager') # Keep this mocked
    @patch('src.motido.data.backend_factory.print') # Mock print
    def test_get_data_manager_default_backend(self, mock_print, mock_db_manager, mock_json_manager, mock_load_config):
        """Test factory defaults to JsonDataManager when backend key is missing."""
        # Configure mocks
        mock_load_config.return_value = {} # Simulate missing key
        mock_json_instance = MagicMock(spec=JsonDataManager)
        mock_json_manager.return_value = mock_json_instance

        # Call the factory
        manager = get_data_manager()

        # Assertions
        mock_load_config.assert_called_once()
        mock_json_manager.assert_called_once()
        mock_db_manager.assert_not_called()
        self.assertIsInstance(manager, JsonDataManager)
        self.assertEqual(manager, mock_json_instance)
        mock_print.assert_called_once_with("Using JSON backend.") # Check default message

    @patch('src.motido.data.backend_factory.load_config')
    @patch('src.motido.data.backend_factory.JsonDataManager')
    @patch('src.motido.data.backend_factory.DatabaseDataManager')
    @patch('src.motido.data.backend_factory.print') # Mock print
    def test_get_data_manager_unknown_backend(self, mock_print, mock_db_manager, mock_json_manager, mock_load_config):
        """Test factory raises ValueError for unknown backend type."""
        # Configure mocks
        unknown_backend_type = "invalid_backend"
        mock_load_config.return_value = {"backend": unknown_backend_type}

        # Call the factory and assert exception
        with self.assertRaises(ValueError) as cm:
            get_data_manager()

        self.assertEqual(
            str(cm.exception),
            f"Unknown backend type configured: '{unknown_backend_type}'"
        )

        # Assertions
        mock_load_config.assert_called_once()
        mock_json_manager.assert_not_called()
        mock_db_manager.assert_not_called()
        mock_print.assert_not_called() # No backend message should be printed


if __name__ == '__main__':
    unittest.main() 