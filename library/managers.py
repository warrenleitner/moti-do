"""
Module: moti-do.library.managers
Description: Contains manager classes responsible for CRUD operations
             and business logic related to the core data models.
"""

from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime

# Import core data models - Assuming they are in library.task
# Adjust the import path if the structure is different
try:
    from .task import Task, Habit, Tag, Project, User, ChangeTracker
except ImportError:
    # Fallback for direct script execution or different structure
    from task import Task, Habit, Tag, Project, User, ChangeTracker


class TaskManager:
    """
    Manages CRUD operations and related logic for Task and Habit objects
    within a User's data.
    """

    def _find_task_index(self, user: User, task_id: str) -> Optional[int]:
        """Helper to find the index of a task by ID."""
        for i, task in enumerate(user.tasks):
            if task.id == task_id:
                return i
        return None

    def _record_change(self, task: Task, field_name: str, old_value: Any, new_value: Any):
        """Records a change in the task's change tracker."""
        change = {
            "timestamp": datetime.now(),
            "field": field_name,
            "old_value": old_value,
            "new_value": new_value,
        }
        task.change_tracker.changes.append(change)

    def add_task(self, user: User, task_data: Dict[str, Any]) -> Task:
        """
        Creates a new Task instance and adds it to the user's task list.

        Args:
            user: The User object whose task list will be modified.
            task_data: A dictionary containing the initial data for the task.
                       'name' is required. Other fields are optional.

        Returns:
            The newly created Task object.

        Raises:
            ValueError: If 'name' is not provided in task_data.
        """
        if 'name' not in task_data or not task_data['name']:
            raise ValueError("Task name is required.")

        # Handle potential Habit creation if specific fields are present
        # For now, focusing on Task
        # TODO: Add logic to differentiate between Task and Habit creation

        # Ensure ID is unique if provided, otherwise generate one
        task_id = task_data.get('id', str(uuid.uuid4()))
        if self._find_task_index(user, task_id) is not None:
             # Simple collision handling - append a short unique string
             # In a real system, might need a more robust check or strategy
             task_id = f"{task_id}-{uuid.uuid4().hex[:4]}"
             task_data['id'] = task_id # Update data if ID was regenerated

        new_task = Task(**task_data) # Create Task instance from provided data
        user.tasks.append(new_task)
        # TODO: Update related Tags/Projects if task_data includes tag_ids/project_id

        # Record creation as a special change event? Optional.
        # self._record_change(new_task, 'status', None, new_task.status)

        return new_task

    def get_task(self, user: User, task_id: str) -> Optional[Task]:
        """
        Retrieves a task by its ID from the user's task list.

        Args:
            user: The User object containing the tasks.
            task_id: The unique identifier of the task to retrieve.

        Returns:
            The Task object if found, otherwise None.
        """
        index = self._find_task_index(user, task_id)
        if index is not None:
            return user.tasks[index]
        return None

    def update_task(self, user: User, task_id: str, update_data: Dict[str, Any]) -> Optional[Task]:
        """
        Updates an existing task with new data.

        Args:
            user: The User object containing the task.
            task_id: The ID of the task to update.
            update_data: A dictionary containing the fields and their new values.
                         Cannot update 'id' or 'created_date'.

        Returns:
            The updated Task object if found and updated, otherwise None.
        """
        index = self._find_task_index(user, task_id)
        if index is None:
            return None

        task_to_update = user.tasks[index]

        # Prevent updating immutable fields
        update_data.pop('id', None)
        update_data.pop('created_date', None)
        update_data.pop('change_tracker', None) # Changes are recorded, not overwritten

        for field, new_value in update_data.items():
            if hasattr(task_to_update, field):
                old_value = getattr(task_to_update, field)
                if old_value != new_value:
                    setattr(task_to_update, field, new_value)
                    self._record_change(task_to_update, field, old_value, new_value)
                    # TODO: Handle updates to relationships (tag_ids, project_id)
            else:
                # Optionally log a warning for unknown fields
                print(f"Warning: Field '{field}' not found on Task object.")

        # Update the last_update timestamp for the user
        user.last_update = datetime.now()

        return task_to_update

    def delete_task(self, user: User, task_id: str) -> bool:
        """
        Deletes a task from the user's task list.

        Args:
            user: The User object containing the task.
            task_id: The ID of the task to delete.

        Returns:
            True if the task was found and deleted, False otherwise.
        """
        index = self._find_task_index(user, task_id)
        if index is not None:
            deleted_task = user.tasks.pop(index)
            # TODO: Remove task_id from related Tags/Projects
            # TODO: Handle dependencies (dependency_ids, dependent_ids) - complex!
            user.last_update = datetime.now()
            return True
        return False

    def get_all_tasks(self, user: User) -> List[Task]:
        """
        Retrieves all tasks (including Habits) for the user.

        Args:
            user: The User object.

        Returns:
            A list of all Task and Habit objects belonging to the user.
        """
        return user.tasks


class TagManager:
    """
    Manages CRUD operations for Tag objects within a User's data.
    """

    def _find_tag_index(self, user: User, tag_id: str) -> Optional[int]:
        """Helper to find the index of a tag by ID."""
        for i, tag in enumerate(user.tags):
            if tag.id == tag_id:
                return i
        return None

    def add_tag(self, user: User, tag_data: Dict[str, Any]) -> Tag:
        """
        Creates a new Tag instance and adds it to the user's tag list.

        Args:
            user: The User object whose tag list will be modified.
            tag_data: A dictionary containing the initial data for the tag.
                       'name' is required. Other fields like 'emoji', 'color',
                       'description' are optional.

        Returns:
            The newly created Tag object.

        Raises:
            ValueError: If 'name' is not provided in tag_data.
        """
        if 'name' not in tag_data or not tag_data['name']:
            raise ValueError("Tag name is required.")

        # Ensure ID is unique if provided, otherwise generate one
        tag_id = tag_data.get('id', str(uuid.uuid4()))
        if self._find_tag_index(user, tag_id) is not None:
             tag_id = f"{tag_id}-{uuid.uuid4().hex[:4]}"
             tag_data['id'] = tag_id

        # Ensure task_ids is a list if provided, default to empty list
        tag_data['task_ids'] = tag_data.get('task_ids', [])

        new_tag = Tag(**tag_data)
        user.tags.append(new_tag)
        user.last_update = datetime.now()

        # TODO: Update tasks if task_ids were provided during creation?

        return new_tag

    def get_tag(self, user: User, tag_id: str) -> Optional[Tag]:
        """
        Retrieves a tag by its ID from the user's tag list.

        Args:
            user: The User object containing the tags.
            tag_id: The unique identifier of the tag to retrieve.

        Returns:
            The Tag object if found, otherwise None.
        """
        index = self._find_tag_index(user, tag_id)
        if index is not None:
            return user.tags[index]
        return None

    def update_tag(self, user: User, tag_id: str, update_data: Dict[str, Any]) -> Optional[Tag]:
        """
        Updates an existing tag with new data.

        Args:
            user: The User object containing the tag.
            tag_id: The ID of the tag to update.
            update_data: A dictionary containing the fields and their new values.
                         Cannot update 'id'. 'task_ids' requires careful handling.

        Returns:
            The updated Tag object if found and updated, otherwise None.
        """
        index = self._find_tag_index(user, tag_id)
        if index is None:
            return None

        tag_to_update = user.tags[index]

        # Prevent updating immutable fields
        update_data.pop('id', None)

        # Special handling for task_ids - avoid direct overwrite? Or manage relationships?
        # For basic CRUD, we allow overwrite for now.
        # TODO: Implement relationship management logic if needed.
        if 'task_ids' in update_data and not isinstance(update_data['task_ids'], list):
            # Ensure task_ids is always a list
             print("Warning: 'task_ids' provided is not a list. Ignoring update for this field.")
             update_data.pop('task_ids')


        for field, new_value in update_data.items():
            if hasattr(tag_to_update, field):
                # No change tracking needed for Tags/Projects currently
                setattr(tag_to_update, field, new_value)
            else:
                print(f"Warning: Field '{field}' not found on Tag object.")

        user.last_update = datetime.now()
        return tag_to_update

    def delete_tag(self, user: User, tag_id: str) -> bool:
        """
        Deletes a tag from the user's tag list.

        Args:
            user: The User object containing the tag.
            tag_id: The ID of the tag to delete.

        Returns:
            True if the tag was found and deleted, False otherwise.
        """
        index = self._find_tag_index(user, tag_id)
        if index is not None:
            deleted_tag = user.tags.pop(index)
            # TODO: Remove this tag_id from all associated tasks in user.tasks
            user.last_update = datetime.now()
            return True
        return False

    def get_all_tags(self, user: User) -> List[Tag]:
        """
        Retrieves all tags for the user.

        Args:
            user: The User object.

        Returns:
            A list of all Tag objects belonging to the user.
        """
        return user.tags


class ProjectManager:
    """
    Manages CRUD operations for Project objects within a User's data.
    """

    def _find_project_index(self, user: User, project_id: str) -> Optional[int]:
        """Helper to find the index of a project by ID."""
        for i, project in enumerate(user.projects):
            if project.id == project_id:
                return i
        return None

    def add_project(self, user: User, project_data: Dict[str, Any]) -> Project:
        """
        Creates a new Project instance and adds it to the user's project list.

        Args:
            user: The User object whose project list will be modified.
            project_data: A dictionary containing the initial data for the project.
                         'name' is required. Optional fields include 'emoji', 'color',
                         'description'.

        Returns:
            The newly created Project object.

        Raises:
            ValueError: If 'name' is not provided in project_data.
        """
        if 'name' not in project_data or not project_data['name']:
            raise ValueError("Project name is required.")

        # Ensure ID is unique if provided, otherwise generate one
        project_id = project_data.get('id', str(uuid.uuid4()))
        if self._find_project_index(user, project_id) is not None:
             project_id = f"{project_id}-{uuid.uuid4().hex[:4]}"
             project_data['id'] = project_id

        # Ensure task_ids is a list if provided, default to empty list
        project_data['task_ids'] = project_data.get('task_ids', [])

        new_project = Project(**project_data)
        user.projects.append(new_project)
        user.last_update = datetime.now()

        # TODO: Update tasks if task_ids were provided during creation?

        return new_project

    def get_project(self, user: User, project_id: str) -> Optional[Project]:
        """
        Retrieves a project by its ID from the user's project list.

        Args:
            user: The User object containing the projects.
            project_id: The unique identifier of the project to retrieve.

        Returns:
            The Project object if found, otherwise None.
        """
        index = self._find_project_index(user, project_id)
        if index is not None:
            return user.projects[index]
        return None

    def update_project(self, user: User, project_id: str, update_data: Dict[str, Any]) -> Optional[Project]:
        """
        Updates an existing project with new data.

        Args:
            user: The User object containing the project.
            project_id: The ID of the project to update.
            update_data: A dictionary containing the fields and their new values.
                         Cannot update 'id'. 'task_ids' requires careful handling.

        Returns:
            The updated Project object if found and updated, otherwise None.
        """
        index = self._find_project_index(user, project_id)
        if index is None:
            return None

        project_to_update = user.projects[index]

        # Prevent updating immutable fields
        update_data.pop('id', None)

        # Special handling for task_ids
        # TODO: Implement relationship management logic if needed.
        if 'task_ids' in update_data and not isinstance(update_data['task_ids'], list):
             print("Warning: 'task_ids' provided is not a list. Ignoring update for this field.")
             update_data.pop('task_ids')

        for field, new_value in update_data.items():
            if hasattr(project_to_update, field):
                setattr(project_to_update, field, new_value)
            else:
                print(f"Warning: Field '{field}' not found on Project object.")

        user.last_update = datetime.now()
        return project_to_update

    def delete_project(self, user: User, project_id: str) -> bool:
        """
        Deletes a project from the user's project list.

        Args:
            user: The User object containing the project.
            project_id: The ID of the project to delete.

        Returns:
            True if the project was found and deleted, False otherwise.
        """
        index = self._find_project_index(user, project_id)
        if index is not None:
            deleted_project = user.projects.pop(index)
            # TODO: Remove this project_id from all associated tasks in user.tasks
            #       Set task.project_id to None for these tasks.
            user.last_update = datetime.now()
            return True
        return False

    def get_all_projects(self, user: User) -> List[Project]:
        """
        Retrieves all projects for the user.

        Args:
            user: The User object.

        Returns:
            A list of all Project objects belonging to the user.
        """
        return user.projects

# Example Usage for ProjectManager (Illustrative)
# if __name__ == '__main__':
#     # Assume user, TaskManager, TagManager exist from previous examples
#     project_manager = ProjectManager()
#
#     # Add project
#     proj1_data = {"name": "Backend Refactor", "emoji": "🏗️"}
#     proj1 = project_manager.add_project(user, proj1_data)
#     print(f"\nAdded Project: {proj1.id} - {proj1.name}")
#
#     proj2_data = {"name": "UI Design", "color": "Cyan"}
#     proj2 = project_manager.add_project(user, proj2_data)
#     print(f"Added Project: {proj2.id} - {proj2.name}")
#
#     # Get project
#     retrieved_proj = project_manager.get_project(user, proj1.id)
#     if retrieved_proj:
#         print(f"Retrieved Project: {retrieved_proj.id} - {retrieved_proj.name}")
#
#     # Update project
#     update_proj_info = {"description": "Improve UI/UX based on feedback"}
#     updated_proj = project_manager.update_project(user, proj2.id, update_proj_info)
#     if updated_proj:
#         print(f"Updated Project: {updated_proj.id} - Description set.")
#
#     # Get all projects
#     all_projects = project_manager.get_all_projects(user)
#     print("\nAll Projects:")
#     for proj in all_projects:
#         print(f"- {proj.id}: {proj.name}")
#
#     # Delete project
#     deleted = project_manager.delete_project(user, proj1.id)
#     print(f"\nDeleted Project {proj1.id}? {deleted}")
#
#     # Verify deletion
#     all_projects_after_delete = project_manager.get_all_projects(user)
#     print("\nAll Projects After Deletion:")
#     for proj in all_projects_after_delete:
#         print(f"- {proj.id}: {proj.name}")
#
#     print(f"\nUser last updated: {user.last_update}")


# Combine Example Usage (if running the file directly)
if __name__ == '__main__':
    user = User(name="Test User")
    task_manager = TaskManager()
    tag_manager = TagManager()
    project_manager = ProjectManager()

    # --- Task Example --- 
    print("--- Task Operations ---")
    task1_data = {"name": "Write documentation", "description": "Document the TaskManager class"}
    task1 = task_manager.add_task(user, task1_data)
    print(f"Added Task: {task1.id} - {task1.name}")
    task2_data = {"name": "Refactor code"}
    task2 = task_manager.add_task(user, task2_data)
    print(f"Added Task: {task2.id} - {task2.name}")
    retrieved_task = task_manager.get_task(user, task1.id)
    if retrieved_task: print(f"Retrieved Task: {retrieved_task.id} - {retrieved_task.name}")
    update_info = {"description": "Add examples to TaskManager docs", "status": "in progress"}
    updated_task = task_manager.update_task(user, task1.id, update_info)
    if updated_task: print(f"Updated Task: {updated_task.id} - Status: {updated_task.status}")
    all_tasks = task_manager.get_all_tasks(user)
    print("\nAll Tasks:")
    for task in all_tasks: print(f"- {task.id}: {task.name} ({task.status})")
    deleted_task = task_manager.delete_task(user, task2.id)
    print(f"\nDeleted Task {task2.id}? {deleted_task}")
    all_tasks_after_delete = task_manager.get_all_tasks(user)
    print("\nAll Tasks After Deletion:")
    for task in all_tasks_after_delete: print(f"- {task.id}: {task.name}")
    print(f"User last updated: {user.last_update}")

    # --- Tag Example --- 
    print("\n--- Tag Operations ---")
    tag1_data = {"name": "Work", "emoji": "💼"}
    tag1 = tag_manager.add_tag(user, tag1_data)
    print(f"Added Tag: {tag1.id} - {tag1.name}")
    tag2_data = {"name": "Personal", "color": "Blue"}
    tag2 = tag_manager.add_tag(user, tag2_data)
    print(f"Added Tag: {tag2.id} - {tag2.name}")
    retrieved_tag = tag_manager.get_tag(user, tag1.id)
    if retrieved_tag: print(f"Retrieved Tag: {retrieved_tag.id} - {retrieved_tag.name}")
    update_tag_info = {"color": "Purple", "description": "Tasks related to personal life"}
    updated_tag = tag_manager.update_tag(user, tag2.id, update_tag_info)
    if updated_tag: print(f"Updated Tag: {updated_tag.id} - Color: {updated_tag.color}")
    all_tags = tag_manager.get_all_tags(user)
    print("\nAll Tags:")
    for tag in all_tags: print(f"- {tag.id}: {tag.name}")
    deleted_tag = tag_manager.delete_tag(user, tag1.id)
    print(f"\nDeleted Tag {tag1.id}? {deleted_tag}")
    all_tags_after_delete = tag_manager.get_all_tags(user)
    print("\nAll Tags After Deletion:")
    for tag in all_tags_after_delete: print(f"- {tag.id}: {tag.name}")
    print(f"User last updated: {user.last_update}")

    # --- Project Example --- 
    print("\n--- Project Operations ---")
    proj1_data = {"name": "Backend Refactor", "emoji": "🏗️"}
    proj1 = project_manager.add_project(user, proj1_data)
    print(f"Added Project: {proj1.id} - {proj1.name}")
    proj2_data = {"name": "UI Design", "color": "Cyan"}
    proj2 = project_manager.add_project(user, proj2_data)
    print(f"Added Project: {proj2.id} - {proj2.name}")
    retrieved_proj = project_manager.get_project(user, proj1.id)
    if retrieved_proj: print(f"Retrieved Project: {retrieved_proj.id} - {retrieved_proj.name}")
    update_proj_info = {"description": "Improve UI/UX based on feedback"}
    updated_proj = project_manager.update_project(user, proj2.id, update_proj_info)
    if updated_proj: print(f"Updated Project: {updated_proj.id} - Description set.")
    all_projects = project_manager.get_all_projects(user)
    print("\nAll Projects:")
    for proj in all_projects: print(f"- {proj.id}: {proj.name}")
    deleted_proj = project_manager.delete_project(user, proj1.id)
    print(f"\nDeleted Project {proj1.id}? {deleted_proj}")
    all_projects_after_delete = project_manager.get_all_projects(user)
    print("\nAll Projects After Deletion:")
    for proj in all_projects_after_delete: print(f"- {proj.id}: {proj.name}")
    print(f"User last updated: {user.last_update}") 