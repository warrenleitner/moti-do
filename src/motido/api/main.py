# motido/api/main.py
# pylint: disable=redefined-outer-name,import-outside-toplevel
"""
Main FastAPI application for Moti-Do.
"""

from datetime import date, timedelta

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from motido.api.deps import CurrentUser, ManagerDep
from motido.api.routers import auth, tasks, user, views
from motido.api.schemas import AdvanceRequest, SystemStatus

# Create FastAPI app
app = FastAPI(
    title="Moti-Do API",
    description="Backend API for the Moti-Do task and habit tracker",
    version="0.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev server
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Include routers with /api prefix
app.include_router(auth.router, prefix="/api")
app.include_router(tasks.router, prefix="/api")
app.include_router(user.router, prefix="/api")
app.include_router(views.router, prefix="/api")


# === System endpoints ===


@app.get("/api/health")
async def health_check() -> dict:
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


@app.get("/api/system/status", response_model=SystemStatus)
async def get_system_status(user: CurrentUser) -> SystemStatus:
    """Get system status including date processing state."""
    current = date.today()
    pending_days = (current - user.last_processed_date).days

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

    # Process each day
    from motido.core.scoring import apply_penalties, load_scoring_config

    config = load_scoring_config()
    processing_date = user.last_processed_date

    while processing_date < target_date:
        processing_date += timedelta(days=1)

        if not user.vacation_mode:
            # Apply penalties for overdue tasks
            apply_penalties(user, manager, processing_date, config, user.tasks)

        user.last_processed_date = processing_date

    manager.save_user(user)

    pending_days = (current - user.last_processed_date).days
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
