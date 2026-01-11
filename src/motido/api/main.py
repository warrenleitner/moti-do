# motido/api/main.py
# pylint: disable=redefined-outer-name,import-outside-toplevel,wrong-import-position
"""
Main FastAPI application for Moti-Do.
"""

import os
from datetime import date, timedelta
from time import perf_counter

from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from motido.api.deps import CurrentUser, ManagerDep
from motido.api.middleware.rate_limit import RateLimitMiddleware
from motido.api.routers import auth, tasks, user, views
from motido.api.schemas import AdvanceRequest, SystemStatus
from motido.core import scoring

# Create FastAPI app
app = FastAPI(
    title="Moti-Do API",
    description="Backend API for the Moti-Do task and habit tracker",
    version="0.3.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Configure CORS - restrictive in production, permissive in development
is_production = os.getenv("VERCEL_ENV") == "production"

if is_production:  # pragma: no cover
    # Production: Only allow your Vercel domain
    allowed_origins = [
        "https://moti-do-v2.vercel.app",  # Add your actual Vercel domain
        # Add any custom domains here
    ]
else:
    # Development: Allow local development
    allowed_origins = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Add rate limiting for login endpoint (5 attempts per 5 minutes)
app.add_middleware(RateLimitMiddleware, max_requests=5, window_seconds=300)


# Include routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(views.router, prefix="/api")


# === System endpoints ===


@app.get("/api/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.3.0"}


@app.get("/api/health/db")
async def db_health_check(manager: ManagerDep) -> dict:
    """
    Database health check endpoint.
    Verifies that the database is accessible and properly initialized.
    """
    # The ManagerDep dependency calls initialize() which creates tables if needed
    # Try to load a user to verify the database is truly accessible
    _ = manager.load_user("_health_check_")  # Will return None, but verifies DB works
    return {"status": "healthy", "database": "connected"}


@app.get("/api/system/status", response_model=SystemStatus)
async def get_system_status(user: CurrentUser) -> SystemStatus:
    """Get system status including date processing state."""
    current = date.today()
    # pending_days = 0 means "up to date" (last_processed_date is yesterday or today)
    # You can't process today until it's over, so yesterday is the max processable date
    pending_days = max(0, (current - user.last_processed_date).days - 1)

    return SystemStatus(
        last_processed_date=user.last_processed_date,
        current_date=current,
        vacation_mode=user.vacation_mode,
        pending_days=pending_days,
    )


@app.post("/api/system/advance", response_model=SystemStatus)
async def advance_date(
    request: AdvanceRequest,
    user: CurrentUser,
    manager: ManagerDep,
) -> SystemStatus:
    """
    Advance the processed date, running any pending operations.
    """
    current = date.today()

    if request.to_date:
        target_date = request.to_date
    elif request.days:
        target_date = user.last_processed_date + timedelta(days=request.days)
    else:
        target_date = current

    # Don't advance past today
    target_date = min(target_date, current)

    # Serverless safety: cap work per request to reduce timeout risk.
    # Client can call repeatedly until pending_days == 0.
    max_days = int(os.getenv("ADVANCE_DATE_MAX_DAYS", "31"))
    if max_days > 0:
        max_target_date = user.last_processed_date + timedelta(days=max_days)
        target_date = min(target_date, max_target_date)

    start_time = perf_counter()

    # Process each day
    config = scoring.load_scoring_config()
    processing_date = user.last_processed_date
    days_processed = 0

    while processing_date < target_date:
        processing_date += timedelta(days=1)
        # Update date BEFORE penalties so all saves during apply_penalties have correct date
        user.last_processed_date = processing_date
        days_processed += 1

        if not user.vacation_mode:
            # Apply penalties for overdue tasks
            scoring.apply_penalties(
                user,
                manager,
                processing_date,
                config,
                user.tasks,
                persist=False,
            )

    save_progress = getattr(manager, "save_user_progress", None)
    if callable(save_progress):
        save_progress(user)
    else:
        manager.save_user(user)

    elapsed_ms = int((perf_counter() - start_time) * 1000)
    print(
        f"advance_date: processed={days_processed} days, "
        f"target={target_date.isoformat()}, elapsed_ms={elapsed_ms}"
    )

    # pending_days = 0 means "up to date" (last_processed_date is yesterday or today)
    pending_days = max(0, (current - user.last_processed_date).days - 1)
    return SystemStatus(
        last_processed_date=user.last_processed_date,
        current_date=current,
        vacation_mode=user.vacation_mode,
        pending_days=pending_days,
    )


@app.post("/api/system/vacation")
async def toggle_vacation_mode(
    enable: bool,
    user: CurrentUser,
    manager: ManagerDep,
) -> dict:
    """Toggle vacation mode on or off."""
    user.vacation_mode = enable
    manager.save_user(user)
    return {"vacation_mode": user.vacation_mode}


# Entry point for running with uvicorn
def run_server(
    host: str = "127.0.0.1", port: int = 8000, reload: bool = True
) -> None:  # pragma: no cover
    """Run the API server."""
    import uvicorn

    uvicorn.run(
        "motido.api.main:app",
        host=host,
        port=port,
        reload=reload,
    )


if __name__ == "__main__":  # pragma: no cover
    run_server()
