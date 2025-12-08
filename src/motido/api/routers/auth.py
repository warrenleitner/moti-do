"""
Authentication endpoints for login and registration.
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from motido.api.deps import (
    CurrentUser,
    ManagerDep,
    create_access_token,
    hash_password,
    verify_password,
)
from motido.api.schemas import (
    PasswordChangeRequest,
    TokenResponse,
    UserRegisterRequest,
)
from motido.core.models import User
from motido.data.abstraction import DEFAULT_USERNAME

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse)
async def login(
    manager: ManagerDep,
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> TokenResponse:
    """
    Login endpoint - validates username/password and returns JWT token.

    For single-user deployment, username should be DEFAULT_USERNAME.
    """
    # Load user from database
    user = manager.load_user(form_data.username)

    # Validate user exists
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate password exists (user has been registered)
    if not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not registered. Please set a password first.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Verify password
    if not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create JWT token
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(days=7),
    )

    return TokenResponse(access_token=access_token, token_type="bearer")


@router.post("/register", response_model=TokenResponse)
async def register(
    request: UserRegisterRequest,
    manager: ManagerDep,
) -> TokenResponse:
    """
    Registration endpoint for single-user setup.

    Only allows registration if:
    1. Username is DEFAULT_USERNAME (enforces single-user)
    2. User doesn't have a password set yet (first-time setup)
    """
    # Enforce single-user constraint
    if request.username != DEFAULT_USERNAME:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Only username '{DEFAULT_USERNAME}' is allowed for single-user deployment",
        )

    # Load or create user
    user = manager.load_user(request.username)
    if not user:
        user = User(username=request.username)

    # Check if already registered
    if user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already registered. Please login instead.",
        )

    # Hash and store password (Pydantic already validated min_length=8)
    user.password_hash = hash_password(request.password)
    manager.save_user(user)

    # Create JWT token
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=timedelta(days=7),
    )

    return TokenResponse(access_token=access_token, token_type="bearer")


@router.post("/change-password", response_model=dict)
async def change_password(
    request: PasswordChangeRequest,
    user: CurrentUser,
    manager: ManagerDep,
) -> dict:
    """
    Change password for authenticated user.
    """
    # Verify current password
    if not user.password_hash or not verify_password(
        request.current_password, user.password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Current password is incorrect",
        )

    # Update password (Pydantic already validated min_length=8)
    user.password_hash = hash_password(request.new_password)
    manager.save_user(user)

    return {"message": "Password changed successfully"}
