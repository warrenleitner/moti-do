"""
Module: moti-do.library.services
Description: Defines service classes that act as an intermediary layer between
             application logic and data persistence repositories.
             These services use the repository interfaces to manage data models.
"""

from typing import List, Optional

# Import repository interfaces and data models
from .repository import ITaskRepository, ITagRepository, IProjectRepository, IUserRepository
from .task import Task, Tag, Project, User


class TaskService:
    """
    Service layer for managing Task entities.
    It uses an ITaskRepository implementation to interact with the data store.
    """
    def __init__(self, task_repository: ITaskRepository):
        """
        Initializes the TaskService with a specific task repository implementation.

        Args:
            task_repository: An object implementing the ITaskRepository interface.
        """
        if not isinstance(task_repository, ITaskRepository):
            raise TypeError("task_repository must implement ITaskRepository")
        self._repository = task_repository

    def get_task_by_id(self, task_id: str) -> Optional[Task]:
        """
        Retrieves a task by its ID.

        Args:
            task_id: The ID of the task to retrieve.

        Returns:
            The Task object if found, otherwise None.
        """
        return self._repository.get_by_id(task_id)

    def get_all_tasks(self) -> List[Task]:
        """
        Retrieves all tasks.

        Returns:
            A list of all Task objects.
        """
        return self._repository.get_all()

    def save_task(self, task: Task) -> None:
        """
        Saves (creates or updates) a task.

        Args:
            task: The Task object to save.
        """
        # Add potential business logic here before saving, e.g., validation
        if not isinstance(task, Task):
            raise TypeError("entity must be an instance of Task")
        # Potentially update the 'updated_at' timestamp here
        # task.updated_at = datetime.now()
        self._repository.save(task)

    def delete_task(self, task_id: str) -> None:
        """
        Deletes a task by its ID.

        Args:
            task_id: The ID of the task to delete.
        """
        # Add potential business logic here, e.g., checking dependencies
        self._repository.delete(task_id)

    # Add other task-specific service methods as needed, e.g.:
    # def get_tasks_by_status(self, status: str) -> List[Task]: ...
    # def complete_task(self, task_id: str) -> None: ...


class TagService:
    """Service layer for managing Tag entities."""
    def __init__(self, tag_repository: ITagRepository):
        if not isinstance(tag_repository, ITagRepository):
            raise TypeError("tag_repository must implement ITagRepository")
        self._repository = tag_repository

    def get_tag_by_id(self, tag_id: str) -> Optional[Tag]:
        return self._repository.get_by_id(tag_id)

    def get_all_tags(self) -> List[Tag]:
        return self._repository.get_all()

    def save_tag(self, tag: Tag) -> None:
        if not isinstance(tag, Tag):
            raise TypeError("entity must be an instance of Tag")
        self._repository.save(tag)

    def delete_tag(self, tag_id: str) -> None:
        self._repository.delete(tag_id)


class ProjectService:
    """Service layer for managing Project entities."""
    def __init__(self, project_repository: IProjectRepository):
        if not isinstance(project_repository, IProjectRepository):
            raise TypeError("project_repository must implement IProjectRepository")
        self._repository = project_repository

    def get_project_by_id(self, project_id: str) -> Optional[Project]:
        return self._repository.get_by_id(project_id)

    def get_all_projects(self) -> List[Project]:
        return self._repository.get_all()

    def save_project(self, project: Project) -> None:
        if not isinstance(project, Project):
            raise TypeError("entity must be an instance of Project")
        self._repository.save(project)

    def delete_project(self, project_id: str) -> None:
        self._repository.delete(project_id)


class UserService:
    """
    Service layer for managing User entities.
    It uses an IUserRepository implementation to interact with the data store.
    """
    def __init__(self, user_repository: IUserRepository):
        """
        Initializes the UserService with a specific user repository implementation.

        Args:
            user_repository: An object implementing the IUserRepository interface.
        """
        if not isinstance(user_repository, IUserRepository):
            raise TypeError("user_repository must implement IUserRepository")
        self._repository = user_repository

    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """
        Retrieves a user by their ID.

        Args:
            user_id: The ID of the user to retrieve.

        Returns:
            The User object if found, otherwise None.
        """
        return self._repository.get_by_id(user_id)

    def get_user_by_name(self, name: str) -> Optional[User]:
        """
        Retrieves a user by their name.

        Args:
            name: The name of the user.

        Returns:
            The User object if found, otherwise None.
        """
        return self._repository.get_by_name(name)

    def get_all_users(self) -> List[User]:
        """
        Retrieves all users.

        Returns:
            A list of all User objects.
        """
        return self._repository.get_all()

    def save_user(self, user: User) -> None:
        """
        Saves (creates or updates) a user.
        Note: How nested entities (tasks, tags, projects) are handled depends
        on the repository implementation. This service assumes the repository
        handles the persistence of the User object itself.

        Args:
            user: The User object to save.
        """
        if not isinstance(user, User):
            raise TypeError("entity must be an instance of User")
        # Potentially update the 'last_update' timestamp here
        # user.last_update = datetime.now()
        self._repository.save(user)

    def delete_user(self, user_id: str) -> None:
        """
        Deletes a user by their ID.

        Args:
            user_id: The ID of the user to delete.
        """
        self._repository.delete(user_id)

    # --- Composite Operations ---
    # These methods demonstrate how services can combine repository calls

    # def get_user_tasks(self, user_id: str, task_service: TaskService) -> Optional[List[Task]]:
    #     """Gets all tasks associated with a specific user."""
    #     user = self.get_user_by_id(user_id)
    #     if not user:
    #         return None
    #     # This assumes the User object loaded by get_user_by_id doesn't contain
    #     # full Task objects, but maybe just IDs. If the User object contains
    #     # full Task objects, this logic changes.
    #     # A more robust approach might involve a specific repository method
    #     # like task_repository.get_tasks_by_user_id(user_id)
    #
    #     # Example assuming User.tasks holds Task objects directly (less likely with strict separation)
    #     # return user.tasks
    #
    #     # Example assuming we need to fetch tasks based on IDs stored elsewhere or via relationship
    #     # This depends heavily on how relationships are managed by repositories
    #     # For now, let's assume a method exists or needs to be added to TaskService/Repo
    #     # return task_service.get_tasks_for_user(user_id) # Hypothetical method
    #     print("Warning: get_user_tasks logic depends on relationship management strategy.")
    #     return [] # Placeholder 