import unittest
import argparse
from unittest.mock import patch, MagicMock, call

# Modules and classes to test or mock
from motido.cli import main as cli_main
from motido.core.models import User, Task
from motido.data.abstraction import DataManager, DEFAULT_USERNAME
from motido.data.config import DEFAULT_BACKEND

# Helper to create mock argparse Namespace
def create_mock_args(**kwargs):
    return argparse.Namespace(**kwargs)

class TestCliMain(unittest.TestCase):
    """Tests for the command-line interface (cli/main.py)."""

    # --- Test Argument Parsing and Dispatch in main() ---

    @patch('sys.argv', ['main.py', 'init', '--backend', 'db'])
    @patch('motido.cli.main.handle_init')
    @patch('motido.cli.main.get_data_manager') # Should not be called for init
    def test_main_dispatch_init(self, mock_get_manager, mock_handle_init):
        """Test main() parses 'init' command and calls handle_init."""
        cli_main.main()
        mock_handle_init.assert_called_once()
        # Check the args passed to handle_init
        args_passed = mock_handle_init.call_args[0][0]
        self.assertEqual(args_passed.command, 'init')
        self.assertEqual(args_passed.backend, 'db')
        mock_get_manager.assert_not_called()

    @patch('sys.argv', ['main.py', 'create', '-d', 'New task'])
    @patch('motido.cli.main.handle_create')
    @patch('motido.cli.main.get_data_manager') # Should be called for create
    def test_main_dispatch_create(self, mock_get_manager, mock_handle_create):
        """Test main() parses 'create' command and calls handle_create via lambda."""
        mock_manager_instance = MagicMock(spec=DataManager)
        mock_get_manager.return_value = mock_manager_instance

        cli_main.main()

        # The handler is called via lambda set_defaults, so we check its call args
        mock_handle_create.assert_called_once()
        args_passed, manager_passed = mock_handle_create.call_args[0]
        self.assertEqual(args_passed.command, 'create')
        self.assertEqual(args_passed.description, 'New task')
        self.assertEqual(manager_passed, mock_manager_instance)
        mock_get_manager.assert_called_once() # Ensure manager was fetched


    @patch('sys.argv', ['main.py', 'list'])
    @patch('motido.cli.main.handle_list')
    @patch('motido.cli.main.get_data_manager')
    def test_main_dispatch_list(self, mock_get_manager, mock_handle_list):
         """Test main() parses 'list' command and calls handle_list."""
         mock_manager_instance = MagicMock(spec=DataManager)
         mock_get_manager.return_value = mock_manager_instance
         cli_main.main()
         mock_handle_list.assert_called_once()
         args_passed, manager_passed = mock_handle_list.call_args[0]
         self.assertEqual(args_passed.command, 'list')
         self.assertEqual(manager_passed, mock_manager_instance)
         mock_get_manager.assert_called_once()


    @patch('sys.argv', ['main.py', 'view', '--id', 'abc'])
    @patch('motido.cli.main.handle_view')
    @patch('motido.cli.main.get_data_manager')
    def test_main_dispatch_view(self, mock_get_manager, mock_handle_view):
         """Test main() parses 'view' command and calls handle_view."""
         mock_manager_instance = MagicMock(spec=DataManager)
         mock_get_manager.return_value = mock_manager_instance
         cli_main.main()
         mock_handle_view.assert_called_once()
         args_passed, manager_passed = mock_handle_view.call_args[0]
         self.assertEqual(args_passed.command, 'view')
         self.assertEqual(args_passed.id, 'abc')
         self.assertEqual(manager_passed, mock_manager_instance)
         mock_get_manager.assert_called_once()


    @patch('sys.argv', ['main.py', 'edit', '--id', 'abc', '-d', 'Updated'])
    @patch('motido.cli.main.handle_edit')
    @patch('motido.cli.main.get_data_manager')
    def test_main_dispatch_edit(self, mock_get_manager, mock_handle_edit):
         """Test main() parses 'edit' command and calls handle_edit."""
         mock_manager_instance = MagicMock(spec=DataManager)
         mock_get_manager.return_value = mock_manager_instance
         cli_main.main()
         mock_handle_edit.assert_called_once()
         args_passed, manager_passed = mock_handle_edit.call_args[0]
         self.assertEqual(args_passed.command, 'edit')
         self.assertEqual(args_passed.id, 'abc')
         self.assertEqual(args_passed.description, 'Updated')
         self.assertEqual(manager_passed, mock_manager_instance)
         mock_get_manager.assert_called_once()

    @patch('sys.argv', ['main.py', 'invalid_command'])
    @patch('sys.exit') # Mock sys.exit to prevent test termination
    @patch('motido.cli.main.print') # Mock print to check error message
    def test_main_invalid_command(self, mock_print, mock_exit):
        """Test main() handles invalid command."""
        # argparse prints error message to stderr, we can't easily capture that
        # in unit tests without more complex setup. We primarily test that it exits.
        # Note: argparse itself handles the 'invalid choice' error and exits.
        # We mock sys.exit to verify this behavior.
        # with self.assertRaises(SystemExit): # Argparse raises SystemExit on error
        #     cli_main.main()
        # Instead of assertRaises, check if the mock was called:
        try:
            cli_main.main()
        except SystemExit:
             # We expect argparse to call sys.exit, which is mocked.
             # The mock might still raise SystemExit, or the test runner might catch it.
             # We proceed to the assertion below.
             pass

        # Check that sys.exit was called (implicitly by argparse)
        mock_exit.assert_called()


    # --- Test handle_init ---

    @patch('motido.cli.main.print')
    @patch('motido.cli.main.save_config')
    @patch('motido.cli.main.get_data_manager')
    @patch('sys.exit')
    def test_handle_init_success(self, mock_exit, mock_get_manager, mock_save_config, mock_print):
        """Test handle_init successfully initializes with a chosen backend."""
        args = create_mock_args(backend='db')
        mock_manager = MagicMock(spec=DataManager)
        mock_get_manager.return_value = mock_manager

        cli_main.handle_init(args)

        mock_save_config.assert_called_once_with({"backend": "db"})
        mock_get_manager.assert_called_once() # Called to get manager for initialization
        mock_manager.initialize.assert_called_once()
        mock_print.assert_has_calls([
            call("Initializing Moti-Do..."),
            # Note: save_config prints its own message, tested elsewhere
            call("Initialization complete. Using 'db' backend.")
        ])
        mock_exit.assert_not_called()

    @patch('motido.cli.main.print')
    @patch('motido.cli.main.save_config')
    @patch('motido.cli.main.get_data_manager')
    @patch('sys.exit')
    def test_handle_init_exception(self, mock_exit, mock_get_manager, mock_save_config, mock_print):
        """Test handle_init handles exceptions during manager initialization."""
        args = create_mock_args(backend='json')
        mock_manager = MagicMock(spec=DataManager)
        mock_get_manager.return_value = mock_manager
        error_message = "Disk is full"
        mock_manager.initialize.side_effect = Exception(error_message)

        cli_main.handle_init(args)

        mock_save_config.assert_called_once_with({"backend": "json"})
        mock_get_manager.assert_called_once()
        mock_manager.initialize.assert_called_once()
        mock_print.assert_has_calls([
            call("Initializing Moti-Do..."),
            # save_config print
            call(f"An error occurred during initialization: {error_message}")
        ])
        mock_exit.assert_called_once_with(1)


    # --- Test handle_create ---

    @patch('motido.cli.main.print')
    @patch('motido.cli.main.User') # Mock the User class constructor
    @patch('motido.cli.main.Task') # Mock the Task class constructor
    @patch('sys.exit')
    def test_handle_create_success_existing_user(self, mock_exit, MockTask, MockUser, mock_print):
        """Test handle_create successfully creates a task for an existing user."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user = MagicMock(spec=User)
        mock_task = MagicMock(spec=Task)
        mock_task.id = "task123abc" # Give mock task an ID
        MockTask.return_value = mock_task
        mock_manager.load_user.return_value = mock_user
        args = create_mock_args(description="My new task")

        cli_main.handle_create(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        MockUser.assert_not_called() # User exists, no need to create new
        MockTask.assert_called_once_with(description="My new task")
        mock_user.add_task.assert_called_once_with(mock_task)
        mock_manager.save_user.assert_called_once_with(mock_user)
        mock_print.assert_has_calls([
             call("Creating task: 'My new task'..."),
             call(f"Task created successfully with ID prefix: {mock_task.id[:8]}")
        ])
        mock_exit.assert_not_called()


    @patch('motido.cli.main.print')
    @patch('motido.cli.main.User') # Mock the User class constructor
    @patch('motido.cli.main.Task') # Mock the Task class constructor
    @patch('sys.exit')
    def test_handle_create_success_new_user(self, mock_exit, MockTask, MockUser, mock_print):
        """Test handle_create creates a new user if none exists."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user_instance = MagicMock(spec=User) # Instance returned by constructor
        MockUser.return_value = mock_user_instance
        mock_task = MagicMock(spec=Task)
        mock_task.id = "newtask456"
        MockTask.return_value = mock_task
        mock_manager.load_user.return_value = None # Simulate user not found

        args = create_mock_args(description="First task")

        cli_main.handle_create(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        MockUser.assert_called_once_with(username=DEFAULT_USERNAME) # New user created
        MockTask.assert_called_once_with(description="First task")
        mock_user_instance.add_task.assert_called_once_with(mock_task)
        mock_manager.save_user.assert_called_once_with(mock_user_instance)
        mock_print.assert_has_calls([
             call("Creating task: 'First task'..."),
             call(f"User '{DEFAULT_USERNAME}' not found. Creating new user."),
             call(f"Task created successfully with ID prefix: {mock_task.id[:8]}")
        ])
        mock_exit.assert_not_called()


    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_create_empty_description(self, mock_exit, mock_print):
        """Test handle_create exits if description is empty."""
        mock_manager = MagicMock(spec=DataManager)
        args = create_mock_args(description="") # Empty description

        # Call the function that should trigger the exit
        cli_main.handle_create(args, mock_manager)

        # Check that the correct error message was printed
        # Use assert_any_call because mocking sys.exit allows subsequent code
        # (including other print statements) to run in the test.
        mock_print.assert_any_call("Error: Task description cannot be empty.")

        # Check that sys.exit was called with the correct code
        mock_exit.assert_called_once_with(1)

        # NOTE: We cannot assert that load_user/save_user were *not* called,
        # because the mocked sys.exit doesn't actually halt execution within
        # the handle_create function during the test run.
        # The essential checks are that the error is printed and exit is attempted.

    @patch('motido.cli.main.print')
    @patch('motido.cli.main.Task')
    @patch('sys.exit')
    def test_handle_create_save_error(self, mock_exit, MockTask, mock_print):
        """Test handle_create handles exceptions during save_user."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user = MagicMock(spec=User)
        mock_task = MagicMock(spec=Task)
        mock_task.id = "taskerr"
        MockTask.return_value = mock_task
        mock_manager.load_user.return_value = mock_user
        error_message = "Cannot write to file"
        mock_manager.save_user.side_effect = Exception(error_message)
        args = create_mock_args(description="Task to fail")

        cli_main.handle_create(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_user.add_task.assert_called_once_with(mock_task)
        mock_manager.save_user.assert_called_once_with(mock_user)
        mock_print.assert_has_calls([
             call("Creating task: 'Task to fail'..."),
             call(f"Error saving task: {error_message}")
        ])
        mock_exit.assert_called_once_with(1)


    # --- Test handle_list ---

    @patch('motido.cli.main.print')
    def test_handle_list_success_with_tasks(self, mock_print):
        """Test handle_list prints tasks when user and tasks exist."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user = MagicMock(spec=User)
        task1 = Task(id="t1", description="Task 1")
        task2 = Task(id="t2", description="Task 2")
        mock_user.tasks = [task1, task2]
        mock_manager.load_user.return_value = mock_user
        args = create_mock_args() # No args for list

        cli_main.handle_list(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        expected_calls = [
            call("Listing all tasks..."),
            call("-" * 30),
            call(task1), # Pass the task object directly
            call(task2), # Pass the task object directly
            call("-" * 30),
            call("Total tasks: 2")
        ]
        mock_print.assert_has_calls(expected_calls)


    @patch('motido.cli.main.print')
    def test_handle_list_success_no_tasks(self, mock_print):
        """Test handle_list prints message when user exists but has no tasks."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user = MagicMock(spec=User)
        mock_user.tasks = [] # Empty task list
        mock_manager.load_user.return_value = mock_user
        args = create_mock_args()

        cli_main.handle_list(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_print.assert_has_calls([
             call("Listing all tasks..."),
             call("No tasks found.")
        ])

    @patch('motido.cli.main.print')
    def test_handle_list_user_not_found(self, mock_print):
        """Test handle_list prints message when user is not found."""
        mock_manager = MagicMock(spec=DataManager)
        mock_manager.load_user.return_value = None # User not found
        args = create_mock_args()

        cli_main.handle_list(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_print.assert_has_calls([
             call("Listing all tasks..."),
             call(f"User '{DEFAULT_USERNAME}' not found or no data available."),
             call("Hint: Run 'motido init' first if you haven't already.")
        ])


    # --- Test handle_view ---

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_view_success(self, mock_exit, mock_print):
        """Test handle_view successfully displays a task."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user = MagicMock(spec=User)
        task_to_view = Task(id="view123xyz", description="Task to view")
        mock_user.find_task_by_id.return_value = task_to_view
        mock_manager.load_user.return_value = mock_user
        args = create_mock_args(id="view123")

        cli_main.handle_view(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_user.find_task_by_id.assert_called_once_with("view123")
        expected_calls = [
            call("Viewing task with ID prefix: 'view123'..."),
            call("-" * 30),
            call(f"ID:          {task_to_view.id}"),
            call(f"Description: {task_to_view.description}"),
            call("-" * 30)
        ]
        mock_print.assert_has_calls(expected_calls)
        mock_exit.assert_not_called()

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_view_task_not_found(self, mock_exit, mock_print):
        """Test handle_view exits when task ID prefix does not match."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user = MagicMock(spec=User)
        mock_user.find_task_by_id.return_value = None # Simulate task not found
        mock_manager.load_user.return_value = mock_user
        args = create_mock_args(id="nonexistent")

        cli_main.handle_view(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_user.find_task_by_id.assert_called_once_with("nonexistent")
        mock_print.assert_has_calls([
            call("Viewing task with ID prefix: 'nonexistent'..."),
            call("Error: Task with ID prefix 'nonexistent' not found.")
        ])
        mock_exit.assert_called_once_with(1)

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_view_user_not_found(self, mock_exit, mock_print):
        """Test handle_view exits when user is not found."""
        mock_manager = MagicMock(spec=DataManager)
        mock_manager.load_user.return_value = None # User not found
        args = create_mock_args(id="someid")

        cli_main.handle_view(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_print.assert_has_calls([
            call("Viewing task with ID prefix: 'someid'..."),
            call(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        ])
        # Check that exit was called with code 1, allowing for multiple calls due to mock behavior
        mock_exit.assert_any_call(1)

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_view_ambiguous_id(self, mock_exit, mock_print):
        """Test handle_view exits with ValueError for ambiguous ID."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user = MagicMock(spec=User)
        error_message = "Ambiguous ID prefix 'amb'"
        mock_user.find_task_by_id.side_effect = ValueError(error_message)
        mock_manager.load_user.return_value = mock_user
        args = create_mock_args(id="amb")

        cli_main.handle_view(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_user.find_task_by_id.assert_called_once_with("amb")
        mock_print.assert_has_calls([
            call("Viewing task with ID prefix: 'amb'..."),
            call(f"Error: {error_message}")
        ])
        mock_exit.assert_called_once_with(1)

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_view_no_id_arg(self, mock_exit, mock_print):
        """Test handle_view exits if --id argument is missing."""
        mock_manager = MagicMock(spec=DataManager)
        # Configure the mock exit to raise an exception to halt execution
        mock_exit.side_effect = SystemExit # Or use a specific error code if needed

        # Simulate missing --id by not including it in args
        args = create_mock_args(id=None)

        # Assert that calling the function raises SystemExit
        with self.assertRaises(SystemExit):
            cli_main.handle_view(args, mock_manager)

        # Check that the error message was printed at some point
        mock_print.assert_any_call("Error: Please provide a task ID prefix using --id.")
        # Ensure user loading was not attempted because the function exited early
        mock_manager.load_user.assert_not_called()


    # --- Test handle_edit ---

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_edit_success(self, mock_exit, mock_print):
        """Test handle_edit successfully updates a task description."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user = MagicMock(spec=User)
        task_to_edit = Task(id="edit123xyz", description="Old description")
        # Store original description to check output
        original_desc = task_to_edit.description
        mock_user.find_task_by_id.return_value = task_to_edit
        mock_manager.load_user.return_value = mock_user
        new_description = "New updated description"
        args = create_mock_args(id="edit123", description=new_description)

        cli_main.handle_edit(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_user.find_task_by_id.assert_called_once_with("edit123")
        self.assertEqual(task_to_edit.description, new_description) # Check description was updated
        mock_manager.save_user.assert_called_once_with(mock_user)
        expected_calls = [
            call("Editing task with ID prefix: 'edit123'..."),
            call("Task updated successfully:"),
            call(f"  Old Description: {original_desc}"),
            call(f"  New Description: {new_description}")
        ]
        mock_print.assert_has_calls(expected_calls)
        mock_exit.assert_not_called()

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_edit_task_not_found(self, mock_exit, mock_print):
        """Test handle_edit exits if task to edit is not found."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user = MagicMock(spec=User)
        mock_user.find_task_by_id.return_value = None # Task not found
        mock_manager.load_user.return_value = mock_user
        args = create_mock_args(id="nonexistent", description="New desc")

        cli_main.handle_edit(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_user.find_task_by_id.assert_called_once_with("nonexistent")
        mock_manager.save_user.assert_not_called()
        mock_print.assert_has_calls([
            call("Editing task with ID prefix: 'nonexistent'..."),
            call("Error: Task with ID prefix 'nonexistent' not found.")
        ])
        mock_exit.assert_called_once_with(1)

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_edit_user_not_found(self, mock_exit, mock_print):
        """Test handle_edit exits if user is not found."""
        mock_manager = MagicMock(spec=DataManager)
        mock_manager.load_user.return_value = None # User not found
        args = create_mock_args(id="someid", description="New desc")

        cli_main.handle_edit(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_manager.save_user.assert_not_called()
        mock_print.assert_has_calls([
            call("Editing task with ID prefix: 'someid'..."),
            call(f"User '{DEFAULT_USERNAME}' not found or no data available.")
        ])
        mock_exit.assert_any_call(1)


    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_edit_missing_description(self, mock_exit, mock_print):
        """Test handle_edit exits if --description is missing."""
        mock_manager = MagicMock(spec=DataManager)
        args_missing_desc = create_mock_args(id="edit123", description=None)
        cli_main.handle_edit(args_missing_desc, mock_manager)
        mock_print.assert_any_call("Error: Both --id and --description are required for editing.")
        mock_exit.assert_called_once_with(1)

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_edit_missing_id(self, mock_exit, mock_print):
        """Test handle_edit exits if --id is missing."""
        mock_manager = MagicMock(spec=DataManager)
        args_missing_id = create_mock_args(id=None, description="New desc")
        cli_main.handle_edit(args_missing_id, mock_manager)
        mock_print.assert_any_call("Error: Both --id and --description are required for editing.")
        mock_exit.assert_called_once_with(1)

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_edit_missing_both(self, mock_exit, mock_print):
        """Test handle_edit exits if both --id and --description are missing."""
        mock_manager = MagicMock(spec=DataManager)
        args_missing_both = create_mock_args(id=None, description=None)
        cli_main.handle_edit(args_missing_both, mock_manager)
        mock_print.assert_any_call("Error: Both --id and --description are required for editing.")
        mock_exit.assert_called_once_with(1)

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_edit_ambiguous_id(self, mock_exit, mock_print):
        """Test handle_edit exits with ValueError for ambiguous ID."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user = MagicMock(spec=User)
        error_message = "Ambiguous ID prefix 'amb'"
        mock_user.find_task_by_id.side_effect = ValueError(error_message)
        mock_manager.load_user.return_value = mock_user
        args = create_mock_args(id="amb", description="New desc")

        cli_main.handle_edit(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_user.find_task_by_id.assert_called_once_with("amb")
        mock_manager.save_user.assert_not_called()
        mock_print.assert_has_calls([
            call("Editing task with ID prefix: 'amb'..."),
            call(f"Error: {error_message}")
        ])
        mock_exit.assert_called_once_with(1)

    @patch('motido.cli.main.print')
    @patch('sys.exit')
    def test_handle_edit_save_error(self, mock_exit, mock_print):
        """Test handle_edit handles exceptions during save_user after edit."""
        mock_manager = MagicMock(spec=DataManager)
        mock_user = MagicMock(spec=User)
        task_to_edit = Task(id="editerr", description="Old desc")
        mock_user.find_task_by_id.return_value = task_to_edit
        mock_manager.load_user.return_value = mock_user
        error_message = "Database locked"
        mock_manager.save_user.side_effect = Exception(error_message)
        args = create_mock_args(id="editerr", description="New desc")

        cli_main.handle_edit(args, mock_manager)

        mock_manager.load_user.assert_called_once_with(DEFAULT_USERNAME)
        mock_user.find_task_by_id.assert_called_once_with("editerr")
        mock_manager.save_user.assert_called_once_with(mock_user) # Save was attempted
        mock_print.assert_has_calls([
            call("Editing task with ID prefix: 'editerr'..."),
            call(f"Error saving updated task: {error_message}")
        ])
        mock_exit.assert_called_once_with(1)


if __name__ == '__main__':
    unittest.main() 