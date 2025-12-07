# motido/api/deps.py
"""
FastAPI dependencies for authentication and data access.
"""

import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext

from motido.core.models import User
from motido.data.abstraction import DEFAULT_USERNAME, DataManager
from motido.data.backend_factory import get_data_manager

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 1 week

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_manager() -> DataManager:
    """Get the data manager instance."""
    manager = get_data_manager()
    manager.initialize()
    return manager


def get_user(manager: DataManager = Depends(get_manager)) -> User:
    """
    Get the current user.
    For now, this is a single-user app, so we just load the default user.
    """
    user = manager.load_user(DEFAULT_USERNAME)
    if user is None:
        # Create a new user if none exists
        user = User(username=DEFAULT_USERNAME)
        manager.save_user(user)
    return user


def save_user(user: User, manager: DataManager = Depends(get_manager)) -> None:
    """Save the user data."""
    manager.save_user(user)


# Type aliases for dependency injection
ManagerDep = Annotated[DataManager, Depends(get_manager)]
UserDep = Annotated[User, Depends(get_user)]


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> dict | None:
    """Verify a JWT token and return its payload."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None


async def get_current_user_optional(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    manager: ManagerDep,
) -> User | None:
    """
    Get the current authenticated user (optional).
    Returns None if not authenticated.
    """
    if token is None:
        return None

    payload = verify_token(token)
    if payload is None:
        return None

    username: str = payload.get("sub", DEFAULT_USERNAME)
    user = manager.load_user(username)
    return user


async def get_current_user(
    token: Annotated[str | None, Depends(oauth2_scheme)],
    manager: ManagerDep,
) -> User:
    """
    Get the current authenticated user (required).
    For development, allows unauthenticated access with default user.
    """
    # In development mode, allow access without authentication
    if os.getenv("MOTIDO_DEV_MODE", "true").lower() == "true":
        user = manager.load_user(DEFAULT_USERNAME)
        if user is None:
            user = User(username=DEFAULT_USERNAME)
            manager.save_user(user)
        return user

    # In production, require authentication
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username: str = payload.get("sub", DEFAULT_USERNAME)
    user = manager.load_user(username)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return user


# Type alias for authenticated user dependency
CurrentUser = Annotated[User, Depends(get_current_user)]


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)


def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)
