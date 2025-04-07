import unittest
import json
import os
from unittest.mock import patch, mock_open, MagicMock

# Import functions from the module we are testing
from motido.data import config as config_module

# Define constants used in the module for easier mocking/verification
CONFIG_FILENAME = config_module.CONFIG_FILENAME
DEFAULT_BACKEND = config_module.DEFAULT_BACKEND
MOCK_CONFIG_PATH = f"/fake/dir/{CONFIG_FILENAME}" # A predictable path for testing

class TestConfig(unittest.TestCase):
    """Tests for configuration loading and saving."""

    # --- Tests for get_config_path ---

    @patch('motido.data.config.os.path.dirname')
    @patch('motido.data.config.os.path.abspath')
    def test_get_config_path_structure(self, mock_abspath, mock_dirname):
        """Test that get_config_path returns the expected path format."""
        mock_dirname.return_value = "/fake/package/data"
        # The input to abspath doesn't matter much here as dirname is mocked
        mock_abspath.return_value = "/fake/package/data/config.py"

        expected_path = os.path.join("/fake/package/data", CONFIG_FILENAME)
        actual_path = config_module.get_config_path()

        self.assertEqual(actual_path, expected_path)
        self.assertTrue(actual_path.endswith(CONFIG_FILENAME))

    # --- Tests for load_config ---

    @patch('motido.data.config.get_config_path', return_value=MOCK_CONFIG_PATH)
    @patch('motido.data.config.os.path.exists', return_value=False)
    def test_load_config_file_not_exists(self, mock_exists, mock_get_path):
        """Test loading config when the file doesn't exist."""
        config = config_module.load_config()
        self.assertEqual(config, {"backend": DEFAULT_BACKEND})
        mock_exists.assert_called_once_with(MOCK_CONFIG_PATH)

    @patch('motido.data.config.get_config_path', return_value=MOCK_CONFIG_PATH)
    @patch('motido.data.config.os.path.exists', return_value=True)
    def test_load_config_valid_json_backend(self, mock_exists, mock_get_path):
        """Test loading a valid config with 'json' backend."""
        mock_file_content = json.dumps({"backend": "json"})
        m_open = mock_open(read_data=mock_file_content)
        with patch('builtins.open', m_open):
            config = config_module.load_config()
            self.assertEqual(config, {"backend": "json"})
            m_open.assert_called_once_with(MOCK_CONFIG_PATH, 'r', encoding='utf-8')

    @patch('motido.data.config.get_config_path', return_value=MOCK_CONFIG_PATH)
    @patch('motido.data.config.os.path.exists', return_value=True)
    def test_load_config_valid_db_backend(self, mock_exists, mock_get_path):
        """Test loading a valid config with 'db' backend."""
        mock_file_content = json.dumps({"backend": "db"})
        m_open = mock_open(read_data=mock_file_content)
        with patch('builtins.open', m_open):
            config = config_module.load_config()
            self.assertEqual(config, {"backend": "db"})

    @patch('motido.data.config.get_config_path', return_value=MOCK_CONFIG_PATH)
    @patch('motido.data.config.os.path.exists', return_value=True)
    @patch('motido.data.config.print') # Mock print to check warning
    def test_load_config_invalid_json(self, mock_print, mock_exists, mock_get_path):
        """Test loading config with invalid JSON content."""
        m_open = mock_open()
        # Simulate JSONDecodeError by having json.load raise it
        with patch('builtins.open', m_open), \
             patch('json.load', side_effect=json.JSONDecodeError("Expecting value", "doc", 0)):
            config = config_module.load_config()
            self.assertEqual(config, {"backend": DEFAULT_BACKEND})
            mock_print.assert_called_once()
            self.assertIn("Error loading config file", mock_print.call_args[0][0])

    @patch('motido.data.config.get_config_path', return_value=MOCK_CONFIG_PATH)
    @patch('motido.data.config.os.path.exists', return_value=True)
    @patch('motido.data.config.print') # Mock print to check warning
    def test_load_config_missing_backend_key(self, mock_print, mock_exists, mock_get_path):
        """Test loading config with missing 'backend' key."""
        mock_file_content = json.dumps({"other_key": "value"})
        m_open = mock_open(read_data=mock_file_content)
        with patch('builtins.open', m_open):
            config = config_module.load_config()
            self.assertEqual(config, {"backend": DEFAULT_BACKEND})
            mock_print.assert_called_once()
            self.assertIn("Warning: Invalid backend", mock_print.call_args[0][0]) # Check warning

    @patch('motido.data.config.get_config_path', return_value=MOCK_CONFIG_PATH)
    @patch('motido.data.config.os.path.exists', return_value=True)
    @patch('motido.data.config.print') # Mock print to check warning
    def test_load_config_invalid_backend_value(self, mock_print, mock_exists, mock_get_path):
        """Test loading config with an invalid value for 'backend'."""
        mock_file_content = json.dumps({"backend": "unsupported_backend"})
        m_open = mock_open(read_data=mock_file_content)
        with patch('builtins.open', m_open):
            config = config_module.load_config()
            self.assertEqual(config, {"backend": DEFAULT_BACKEND})
            mock_print.assert_called_once()
            self.assertIn("Warning: Invalid backend 'unsupported_backend'", mock_print.call_args[0][0])

    @patch('motido.data.config.get_config_path', return_value=MOCK_CONFIG_PATH)
    @patch('motido.data.config.os.path.exists', return_value=True)
    @patch('motido.data.config.print') # Mock print to check error
    def test_load_config_io_error(self, mock_print, mock_exists, mock_get_path):
        """Test loading config when an IOError occurs."""
        m_open = mock_open()
        # Simulate IOError on open
        m_open.side_effect = IOError("Permission denied")
        with patch('builtins.open', m_open):
            config = config_module.load_config()
            self.assertEqual(config, {"backend": DEFAULT_BACKEND})
            mock_print.assert_called_once()
            self.assertIn("Error loading config file", mock_print.call_args[0][0])
            self.assertIn("Permission denied", mock_print.call_args[0][0])


    # --- Tests for save_config ---

    @patch('motido.data.config.get_config_path', return_value=MOCK_CONFIG_PATH)
    @patch('json.dump')
    @patch('motido.data.config.print') # Mock print to check message
    def test_save_config_success(self, mock_print, mock_json_dump, mock_get_path):
        """Test successfully saving the configuration."""
        config_to_save = {"backend": "db", "extra": "data"}
        m_open = mock_open()
        with patch('builtins.open', m_open):
            config_module.save_config(config_to_save)

        mock_get_path.assert_called_once()
        m_open.assert_called_once_with(MOCK_CONFIG_PATH, 'w', encoding='utf-8')
        mock_json_dump.assert_called_once_with(config_to_save, m_open(), indent=4)
        mock_print.assert_called_once()
        self.assertIn(f"Configuration saved to {MOCK_CONFIG_PATH}", mock_print.call_args[0][0])


    @patch('motido.data.config.get_config_path', return_value=MOCK_CONFIG_PATH)
    @patch('motido.data.config.print') # Mock print to check error
    def test_save_config_io_error(self, mock_print, mock_get_path):
        """Test saving config when an IOError occurs."""
        config_to_save = {"backend": "json"}
        m_open = mock_open()
        # Simulate IOError on open
        m_open.side_effect = IOError("Disk full")
        with patch('builtins.open', m_open):
             # We don't need to patch json.dump because open fails first
            config_module.save_config(config_to_save)

        mock_get_path.assert_called_once()
        m_open.assert_called_once_with(MOCK_CONFIG_PATH, 'w', encoding='utf-8')
        mock_print.assert_called_once()
        self.assertIn("Error saving config file", mock_print.call_args[0][0])
        self.assertIn("Disk full", mock_print.call_args[0][0])


if __name__ == '__main__':
    unittest.main() 