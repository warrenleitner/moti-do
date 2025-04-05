"""
Module: moti-do.library.repository
Description: Defines abstract base classes (interfaces) for data persistence repositories.
This module provides the abstraction layer for CRUD operations on Moti-Do data models,
allowing different storage backends (e.g., JSON, database) to be plugged in.
"""

import abc
from typing import TypeVar, Generic, List, Optional

# Import the data models - adjust path if necessary
from .task import Task, Tag, Project, User

# Generic Type Variable for the entity type handled by a repository
T = TypeVar('T')
# Generic Type Variable for the entity's ID type (typically string)
K = TypeVar('K', bound=str) # Assuming IDs are strings based on task.py

class IRepository(Generic[T, K], metaclass=abc.ABCMeta):
    """
    Abstract base class for a generic repository defining common CRUD operations.
    """

    @abc.abstractmethod
    def get_by_id(self, id: K) -> Optional[T]:
        """
        Retrieves an entity by its unique identifier.

        Args:
            id: The unique identifier of the entity.

        Returns:
            The entity if found, otherwise None.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def get_all(self) -> List[T]:
        """
        Retrieves all entities of this type.

        Returns:
            A list of all entities.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def save(self, entity: T) -> None:
        """
        Saves (creates or updates) an entity in the repository.
        Implementations should handle whether this is an insert or update.

        Args:
            entity: The entity to save.
        """
        raise NotImplementedError

    @abc.abstractmethod
    def delete(self, id: K) -> None:
        """
        Deletes an entity by its unique identifier.

        Args:
            id: The unique identifier of the entity to delete.
        """
        raise NotImplementedError


# --- Specific Repository Interfaces ---

class ITaskRepository(IRepository[Task, str], metaclass=abc.ABCMeta):
    """Abstract repository interface specifically for Task entities."""
    # Can add Task-specific methods here if needed, e.g., find_by_status
    pass


class ITagRepository(IRepository[Tag, str], metaclass=abc.ABCMeta):
    """Abstract repository interface specifically for Tag entities."""
    pass


class IProjectRepository(IRepository[Project, str], metaclass=abc.ABCMeta):
    """Abstract repository interface specifically for Project entities."""
    pass


class IUserRepository(IRepository[User, str], metaclass=abc.ABCMeta):
    """
    Abstract repository interface specifically for User entities.
    Note: Implementations will need to decide how to handle nested entities
    (tasks, tags, projects) within the User object during save/load operations.
    A simple approach might load only the User object itself, requiring
    separate repository calls for related data. A more complex one might
    handle the entire user aggregate.
    """

    @abc.abstractmethod
    def get_by_name(self, name: str) -> Optional[User]:
        """
        Retrieves a user by their name (assuming names are unique or the first match).

        Args:
            name: The name of the user.

        Returns:
            The user if found, otherwise None.
        """
        raise NotImplementedError

    # Consider adding methods like load_full_user(id: str) -> Optional[User]
    # if deep loading is a common requirement.
