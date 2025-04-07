# data/abstraction.py
"""
Defines the abstract base class for data managers.
Ensures all data backends adhere to a common interface.
"""

from abc import ABC, abstractmethod
from core.models import User

# Define a default username for the single-user scenario for now
DEFAULT_USERNAME = "default_user"

class DataManager(ABC):
    """
    Abstract Base Class for data persistence operations.
    Defines the contract for loading and saving user data.
    """

    @abstractmethod
    def initialize(self):
        """
        Perform any necessary setup for the backend (e.g., create files/tables).
        This should be idempotent (safe to run multiple times).
        """
        pass

    @abstractmethod
    def load_user(self, username: str = DEFAULT_USERNAME) -> User | None:
        """
        Loads user data from the persistence layer.

        Args:
            username: The username of the user to load. Defaults to DEFAULT_USERNAME.

        Returns:
            A User object if found, otherwise None.
        """
        # Placeholder for future sync: Check for remote changes before loading
        pass

    @abstractmethod
    def save_user(self, user: User):
        """
        Saves user data to the persistence layer.

        Args:
            user: The User object to save.
        """
        # Placeholder for future sync: Push changes to remote after saving
        pass

    @abstractmethod
    def backend_type(self) -> str:
        """Returns the type of the backend (e.g., 'json', 'db')."""
        pass

