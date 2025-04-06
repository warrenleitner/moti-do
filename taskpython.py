import subprocess
import shlex
import json

class TaskWarriorError(Exception):
    """Custom exception for TaskWarrior errors."""
    def __init__(self, message, stderr=None):
        super().__init__(message)
        self.stderr = stderr

class TaskWarrior:
    """
    A Python passthrough interface for the Taskwarrior (task) bash command.

    This class provides methods to interact with Taskwarrior by wrapping
    its command-line functionalities described in the provided man page[cite: 1].
    """

    def _run_command(self, args):
        """Executes a Taskwarrior command and handles output/errors."""
        command = ['task'] + args
        try:
            # Using shlex.join for safer command string representation (for logging/debugging if needed)
            # print(f"Executing: {shlex.join(command)}") # Optional: for debugging
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                check=False # Don't raise CalledProcessError automatically
            )

            if result.returncode != 0:
                # Attempt to provide a more specific error from stderr if possible
                error_message = f"Taskwarrior command failed: {shlex.join(command)}\nError: {result.stderr.strip()}"
                raise TaskWarriorError(error_message, stderr=result.stderr)

            return result.stdout.strip()

        except FileNotFoundError:
            raise TaskWarriorError("Error: 'task' command not found. Is Taskwarrior installed and in your PATH?")
        except Exception as e:
            # Catch other potential exceptions during subprocess execution
            raise TaskWarriorError(f"An unexpected error occurred: {e}")

    def _build_filter_args(self, filters=None):
        """Builds filter arguments from a list or dictionary."""
        filter_args = []
        if filters:
            if isinstance(filters, list):
                filter_args.extend(filters)
            elif isinstance(filters, dict):
                for key, value in filters.items():
                    if value is True: # Handle boolean flags like +pending
                         filter_args.append(f"+{key}")
                    elif value is False: # Handle boolean flags like -waiting
                         filter_args.append(f"-{key}")
                    elif value is None: # Handle attributes without value like priority:
                         filter_args.append(f"{key}:")
                    else:
                         filter_args.append(f"{key}:{shlex.quote(str(value))}")
            else: # Assume string
                filter_args.append(filters)
        return filter_args

    def _build_mod_args(self, modifications=None):
        """Builds modification arguments."""
        mod_args = []
        if modifications:
             if isinstance(modifications, list):
                 mod_args.extend(modifications)
             elif isinstance(modifications, dict):
                 for key, value in modifications.items():
                     # Handle tags explicitly based on '+' or '-' prefix in key
                     if key.startswith('+') or key.startswith('-'):
                         mod_args.append(shlex.quote(str(key)))
                     elif value is None: # Handle attributes like priority:
                         mod_args.append(f"{key}:")
                     else: # Handle standard attributes like project:Home
                         mod_args.append(f"{key}:{shlex.quote(str(value))}")
             else: # Assume string description or annotation
                 mod_args.append(shlex.quote(str(modifications)))
        return mod_args


    # --- Read Commands ---

    def list_tasks(self, filters=None, report='list', limit=None):
        """
        Lists tasks based on filters and report type[cite: 67, 68, 69, 70].

        Args:
            filters (list | dict | str, optional): Filters to apply (e.g., ['project:Home', '+weekend'], {'project':'Home', 'due.before':'eom'}).
            report (str, optional): The report type (e.g., 'list', 'long', 'ls', 'minimal', 'all', 'next', 'ready'). Defaults to 'list'.
            limit (int | str, optional): Limit results to a number or 'page'[cite: 177].

        Returns:
            str: The output of the task report command.
        """
        args = self._build_filter_args(filters)
        if limit:
             args.append(f"limit:{limit}") # [cite: 177]
        args.append(report)
        return self._run_command(args)

    def get_task(self, task_id_or_uuid):
        """
        Gets detailed information for a specific task using the 'info' command[cite: 65].

        Args:
            task_id_or_uuid (str | int): The ID or UUID of the task.

        Returns:
            str: The detailed information output.
        """
        # Info command might export JSON, but let's stick to default text for simplicity
        return self._run_command([str(task_id_or_uuid), 'information']) #[cite: 65]

    def export_tasks(self, filters=None):
        """
        Exports tasks in JSON format[cite: 49].

        Args:
            filters (list | dict | str, optional): Filters to apply.

        Returns:
            list: A list of dictionaries, where each dictionary represents a task.
                  Returns an empty list if no tasks match.
        """
        args = self._build_filter_args(filters)
        args.append('export')
        json_output = self._run_command(args)
        # Handle case where export returns empty string or non-JSON output
        try:
             return json.loads(json_output) if json_output else []
        except json.JSONDecodeError as e:
             raise TaskWarriorError(f"Failed to decode JSON from task export: {e}\nOutput: {json_output}")

    def count_tasks(self, filters=None):
         """
         Displays only a count of tasks matching the filter[cite: 48].

         Args:
             filters (list | dict | str, optional): Filters to apply.

         Returns:
             int: The number of matching tasks.
         """
         args = self._build_filter_args(filters)
         args.append('count')
         output = self._run_command(args)
         try:
              # Task count output is just the number
              return int(output)
         except ValueError:
              raise TaskWarriorError(f"Could not parse count output: {output}")


    # --- Write Commands ---

    def add_task(self, description, modifications=None):
        """
        Adds a new task[cite: 81].

        Args:
            description (str): The task description.
            modifications (list | dict, optional): Modifications like project, tags, due date
                                                    (e.g., ['project:Work', '+urgent'], {'due':'tomorrow'}).

        Returns:
            str: The output message from task add (e.g., "Created task 1.").
        """
        args = ['add', description]
        args.extend(self._build_mod_args(modifications))
        return self._run_command(args)

    def log_task(self, description, modifications=None):
        """
        Logs a new task that is already completed[cite: 98].

        Args:
            description (str): The task description.
            modifications (list | dict, optional): Modifications like project, tags.

        Returns:
            str: The output message from task log.
        """
        args = ['log', description]
        args.extend(self._build_mod_args(modifications))
        return self._run_command(args)

    def modify_task(self, filters, modifications):
        """
        Modifies existing tasks matching the filters[cite: 99].

        Args:
            filters (list | dict | str): Filters to select tasks (e.g., '1', 'project:Home').
            modifications (list | dict | str): Changes to apply (e.g., ['priority:H', '-weekend'], {'due': 'eow'}, '/old/new/g').

        Returns:
            str: The output message from task modify.
        """
        args = self._build_filter_args(filters)
        args.append('modify')
        args.extend(self._build_mod_args(modifications))
        return self._run_command(args)

    def delete_task(self, filters):
        """
        Deletes tasks matching the filters[cite: 84].

        Args:
            filters (list | dict | str): Filters to select tasks to delete (e.g., '3', 'status:completed'). Requires confirmation by default.

        Returns:
            str: The output message from task delete. Needs 'rc.confirmation=off' or interactive handling.
                 Consider adding a 'force' flag if non-interactive deletion is needed.
        """
        args = self._build_filter_args(filters)
        args.append('delete')
        # Warning: delete usually requires confirmation. Non-interactive use might need rc.confirmation=off
        # or expect an error/prompt. Add 'rc.confirmation:no' or 'rc.confirmation=no' might work,
        # but safer to handle interactively or pre-configure taskrc.
        # For a pure passthrough, we execute and let it fail/prompt if confirmation is needed.
        return self._run_command(args)

    def mark_done(self, filters, modifications=None):
        """
        Marks tasks matching the filters as done[cite: 88].

        Args:
            filters (list | dict | str): Filters to select tasks.
            modifications (list | dict, optional): Optional modifications to apply upon completion.


        Returns:
            str: The output message from task done.
        """
        args = self._build_filter_args(filters)
        args.append('done')
        args.extend(self._build_mod_args(modifications))
        return self._run_command(args)

    def start_task(self, filters, modifications=None):
         """
         Marks tasks matching the filters as started[cite: 103].

         Args:
             filters (list | dict | str): Filters to select tasks.
             modifications (list | dict, optional): Optional modifications to apply upon start.

         Returns:
             str: The output message from task start.
         """
         args = self._build_filter_args(filters)
         args.append('start')
         args.extend(self._build_mod_args(modifications))
         return self._run_command(args)

    def stop_task(self, filters, modifications=None):
         """
         Removes the start time from tasks matching the filters[cite: 104].

         Args:
             filters (list | dict | str): Filters to select tasks.
             modifications (list | dict, optional): Optional modifications to apply upon stopping.

         Returns:
             str: The output message from task stop.
         """
         args = self._build_filter_args(filters)
         args.append('stop')
         args.extend(self._build_mod_args(modifications))
         return self._run_command(args)

    def annotate_task(self, filters, annotation):
        """
        Adds an annotation to tasks matching the filters[cite: 82].

        Args:
            filters (list | dict | str): Filters to select tasks.
            annotation (str): The annotation text to add.

        Returns:
            str: The output message from task annotate.
        """
        args = self._build_filter_args(filters)
        args.append('annotate')
        args.append(shlex.quote(annotation))
        return self._run_command(args)

    def denotate_task(self, filters, annotation_match):
        """
        Deletes annotations from tasks matching the filters[cite: 85, 86].

        Args:
            filters (list | dict | str): Filters to select tasks.
            annotation_match (str): Text to match against existing annotations for deletion.

        Returns:
            str: The output message from task denotate.
        """
        args = self._build_filter_args(filters)
        args.append('denotate')
        args.append(shlex.quote(annotation_match))
        return self._run_command(args)


    # --- Miscellaneous Commands ---

    def sync(self):
        """
        Synchronizes data with the Taskserver, if configured[cite: 130].

        Returns:
            str: The output message from task sync.
        """
        return self._run_command(['sync'])

    def get_config(self, name=None):
        """
        Shows configuration settings[cite: 126]. If name is provided, shows only matching settings[cite: 127].

        Args:
            name (str, optional): A substring to filter configuration variable names.

        Returns:
            str: The output of the 'show' command.
        """
        args = ['show']
        if name:
            args.append(name)
        return self._run_command(args)

    def set_config(self, name, value=None):
         """
         Sets or removes a configuration variable in the .taskrc file[cite: 107, 108, 109].

         Args:
             name (str): The name of the configuration variable.
             value (str, optional): The value to set. If '', it sets a blank value.
                                    If None, it removes the variable[cite: 107].

         Returns:
             str: The output message from the task config command. Needs confirmation handling.
         """
         args = ['config', name]
         if value is not None:
             args.append(value)
         # Warning: config usually requires confirmation. Non-interactive use might need rc.confirmation=off
         # or expect an error/prompt.
         return self._run_command(args)


    def undo(self):
        """
        Reverts the most recent action[cite: 135].

        Returns:
            str: The output message from task undo. Needs confirmation handling.
        """
        # Warning: undo usually requires confirmation.
        return self._run_command(['undo'])

    def get_version(self):
         """
         Gets the Taskwarrior version number[cite: 136].

         Returns:
             str: The Taskwarrior version string.
         """
         return self._run_command(['--version']) #[cite: 28]

# Example Usage (requires Taskwarrior installed):
# if __name__ == "__main__":
#     tw = TaskWarrior()
#     try:
#         print("--- TaskWarrior Python Interface Examples ---")
#
#         # Get version
#         print(f"Taskwarrior Version: {tw.get_version()}")
#
#         # Add a task
#         add_output = tw.add_task("Test task from Python", modifications={'project': 'Testing', '+py': None, 'due': 'tomorrow'})
#         print(f"Add Task Output: {add_output}")
#         # Extract ID (this is fragile, depends on output format)
#         try:
#            task_id = add_output.split(' ')[2].replace('.', '')
#         except IndexError:
#             print("Could not parse task ID from add output.")
#             task_id = None
#
#         # List tasks in the Testing project
#         print("\n--- Listing Testing project tasks ---")
#         print(tw.list_tasks(filters={'project': 'Testing'}))
#
#         if task_id:
#              # Modify the task
#              print(f"\n--- Modifying task {task_id} ---")
#              mod_output = tw.modify_task(task_id, modifications={'priority': 'H', '-py': None})
#              print(f"Modify Task Output: {mod_output}")
#
#              # Get task info
#              print(f"\n--- Info for task {task_id} ---")
#              print(tw.get_task(task_id))
#
#              # Annotate the task
#              print(f"\n--- Annotating task {task_id} ---")
#              anno_output = tw.annotate_task(task_id, "This is an annotation.")
#              print(f"Annotate Task Output: {anno_output}")
#
#               # Export the task as JSON
#              print(f"\n--- Exporting task {task_id} as JSON ---")
#              exported_task = tw.export_tasks(filters=task_id)
#              print(json.dumps(exported_task, indent=2))
#
#              # Mark task done
#              print(f"\n--- Marking task {task_id} done ---")
#              done_output = tw.mark_done(task_id)
#              print(f"Done Task Output: {done_output}")
#
#         # Count completed tasks in Testing project
#         print("\n--- Counting completed Testing tasks ---")
#         count = tw.count_tasks(filters={'project':'Testing', 'status':'completed'})
#         print(f"Count: {count}")
#
#         # Example of potential error (if task 999 doesn't exist)
#         # print("\n--- Example of non-existent task ---")
#         # try:
#         #    tw.get_task(999)
#         # except TaskWarriorError as e:
#         #    print(f"Caught expected error: {e}")
#         #    # print(f"Stderr: {e.stderr}") # Uncomment to see stderr details
#
#     except TaskWarriorError as e:
#         print(f"\nAn error occurred: {e}")
#     except Exception as e:
#          print(f"\nAn unexpected Python error occurred: {e}")