"""
Simple rate limiting middleware for login endpoint.
"""

import time
from collections import defaultdict
from typing import Callable

from fastapi import Request, Response, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class RateLimitMiddleware(BaseHTTPMiddleware):  # pylint: disable=too-few-public-methods
    """
    Rate limiting middleware to prevent brute force attacks.

    Limits login attempts per IP address.
    """

    def __init__(
        self, app: "FastAPI", max_requests: int = 5, window_seconds: int = 300  # type: ignore[name-defined]
    ) -> None:
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: dict[str, list[float]] = defaultdict(list)

    async def dispatch(  # type: ignore[override]
        self, request: Request, call_next: Callable
    ) -> Response:
        # Only rate limit login endpoint
        if request.url.path != "/api/auth/login":
            return await call_next(request)  # type: ignore[no-any-return]

        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Clean old requests outside window
        current_time = time.time()
        self.requests[client_ip] = [
            req_time
            for req_time in self.requests[client_ip]
            if current_time - req_time < self.window_seconds
        ]

        # Check rate limit
        if len(self.requests[client_ip]) >= self.max_requests:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "detail": f"Too many login attempts. Please try again in {self.window_seconds} seconds."
                },
            )

        # Record this request
        self.requests[client_ip].append(current_time)

        return await call_next(request)  # type: ignore[no-any-return]
