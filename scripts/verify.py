#!/usr/bin/env python3
"""verify.py

Unified verification runner.

Features:
- Quiet output: each step prints a one-line status; logs print only on failure.
- Fail-fast: stops at the first failing step.
- Checkpointed resume: on next run, resumes from the last failed step and
    loops back to complete the full suite before clearing the checkpoint.
- Config mismatch protection: if invocation differs from the checkpoint,
    the script refuses to resume unless --clear-checkpoint is provided.

Notes:
- Uses only the Python stdlib.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import tempfile
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Sequence

PROJECT_ROOT = Path(__file__).resolve().parents[1]
RUN_DIR = PROJECT_ROOT / ".run"
CHECKPOINT_FILE = RUN_DIR / "verify.checkpoint.json"
E2E_LOCK = RUN_DIR / "e2e.lock"
DEV_LOCK = RUN_DIR / "dev.lock"
BACKEND_LOG = RUN_DIR / "backend.log"
FRONTEND_LOG = RUN_DIR / "frontend.log"


class VerifyError(RuntimeError):
    """Raised when a step fails or verify cannot proceed."""


@dataclass(frozen=True)
class VerifyConfig:
    """Configuration that affects execution and checkpoint resume."""

    run_e2e: bool
    use_docker: bool
    keep_db: bool
    playwright_args: List[str]


@dataclass
class RuntimeState:
    """Tracks processes/resources started by this runner."""

    docker_started: bool = False
    backend_proc: Optional[subprocess.Popen[bytes]] = None
    frontend_proc: Optional[subprocess.Popen[bytes]] = None
    docker_compose_cmd: Optional[List[str]] = None


@dataclass(frozen=True)
class Step:
    """A single verification step."""

    step_id: str
    label: str

    def run(self, config: VerifyConfig, state: RuntimeState) -> None:
        raise NotImplementedError


@dataclass(frozen=True)
class CommandStep(Step):
    """Runs a shell command, capturing output and printing only on failure."""

    command: List[str]
    cwd: Path
    env: Optional[dict[str, str]] = None

    def run(self, config: VerifyConfig, state: RuntimeState) -> None:
        run_quiet_command(self.label, self.command, cwd=self.cwd, env=self.env)


@dataclass(frozen=True)
class FunctionStep(Step):
    """Runs a Python callable, capturing logs on failure."""

    func_name: str

    def run(self, config: VerifyConfig, state: RuntimeState) -> None:
        func = globals().get(self.func_name)
        if not callable(func):
            raise VerifyError(f"Unknown function step: {self.func_name}")
        run_quiet_function(self.label, lambda: func(config, state))


def now_iso() -> str:
    """Return UTC timestamp for checkpoint metadata."""

    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def print_status_start(label: str) -> None:
    """Print a single-line step start."""

    sys.stdout.write(f"→ {label}... ")
    sys.stdout.flush()


def print_status_ok() -> None:
    """Print step pass."""

    print("✅ Passed")


def print_status_fail() -> None:
    """Print step failure."""

    print("❌ Failed")


def run_quiet_command(
    label: str,
    command: Sequence[str],
    *,
    cwd: Path,
    env: Optional[dict[str, str]] = None,
) -> None:
    """Run a command with quiet output; print logs on failure."""

    print_status_start(label)

    merged_env = os.environ.copy()
    if env:
        merged_env.update(env)

    with tempfile.NamedTemporaryFile(mode="wb", delete=False) as tmp:
        log_path = Path(tmp.name)

    try:
        proc = subprocess.run(
            list(command),
            cwd=str(cwd),
            env=merged_env,
            stdout=log_path.open("wb"),
            stderr=subprocess.STDOUT,
            check=False,
        )
        if proc.returncode == 0:
            print_status_ok()
            return

        print_status_fail()
        print("====================================")
        sys.stdout.buffer.write(log_path.read_bytes())
        print("\n====================================")
        raise VerifyError(f"Step failed: {label}")
    finally:
        try:
            log_path.unlink(missing_ok=True)
        except Exception:
            pass


def run_quiet_function(label: str, func: Callable[[], None]) -> None:
    """Run a function quietly; print captured logs on failure."""

    print_status_start(label)

    with tempfile.NamedTemporaryFile(mode="w+", delete=False) as tmp:
        log_path = Path(tmp.name)

    try:
        old_stdout = sys.stdout
        old_stderr = sys.stderr
        with log_path.open("w", encoding="utf-8") as f:
            sys.stdout = f  # type: ignore[assignment]
            sys.stderr = f  # type: ignore[assignment]
            ok = True
            try:
                func()
            except Exception:
                ok = False
            finally:
                sys.stdout = old_stdout
                sys.stderr = old_stderr

        if ok:
            print_status_ok()
            return

        print_status_fail()
        print("====================================")
        print(log_path.read_text(encoding="utf-8"), end="")
        print("====================================")
        raise VerifyError(f"Step failed: {label}")
    finally:
        try:
            log_path.unlink(missing_ok=True)
        except Exception:
            pass


def choose_python_run() -> List[str]:
    """Return the prefix command for running Python tools."""

    if shutil_which("poetry"):
        return ["poetry", "run"]

    venv_python = PROJECT_ROOT / ".venv" / "bin" / "python"
    if venv_python.exists():
        return [str(venv_python), "-m"]

    return ["python3", "-m"]


def shutil_which(cmd: str) -> Optional[str]:
    """Simple shutil.which replacement (to avoid importing shutil)."""

    paths = os.environ.get("PATH", "").split(os.pathsep)
    for p in paths:
        candidate = Path(p) / cmd
        if candidate.exists() and os.access(candidate, os.X_OK):
            return str(candidate)
    return None


def detect_docker_compose() -> List[str]:
    """Detect a usable docker compose command."""

    candidates = [
        ["docker", "compose"],
        ["docker-compose"],
        ["/opt/homebrew/bin/docker-compose"],
    ]
    for cmd in candidates:
        try:
            subprocess.run(
                cmd + ["version"],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
            )
            return cmd
        except Exception:
            continue
    raise VerifyError("Docker Compose not found")


def ensure_run_dir() -> None:
    """Ensure .run directory exists."""

    RUN_DIR.mkdir(parents=True, exist_ok=True)


def write_checkpoint(
    *,
    failed_step_id: str,
    config: VerifyConfig,
) -> None:
    """Write checkpoint to disk."""

    ensure_run_dir()
    data = {
        "version": 2,
        "created_at": now_iso(),
        "failed_step_id": failed_step_id,
        "run_e2e": config.run_e2e,
        "use_docker": config.use_docker,
        "keep_db": config.keep_db,
        "playwright_args": list(config.playwright_args),
    }

    CHECKPOINT_FILE.write_text(
        json_dumps(data),
        encoding="utf-8",
    )


def load_checkpoint() -> dict:
    """Load checkpoint JSON."""

    try:
        raw = CHECKPOINT_FILE.read_text(encoding="utf-8")
        data = json_loads(raw)
    except FileNotFoundError:
        raise
    except Exception as e:
        raise VerifyError(f"Failed to read checkpoint: {e}") from e

    if data.get("version") != 2:
        raise VerifyError("Invalid checkpoint version. Re-run with --clear-checkpoint.")
    return data


def clear_checkpoint() -> None:
    """Remove checkpoint."""

    CHECKPOINT_FILE.unlink(missing_ok=True)


def require_checkpoint_match(
    *,
    checkpoint: dict,
    config: VerifyConfig,
) -> None:
    """Fail if config/script differs from checkpoint."""

    checkpoint_run_e2e = checkpoint.get("run_e2e")
    checkpoint_use_docker = checkpoint.get("use_docker")
    checkpoint_keep_db = checkpoint.get("keep_db")
    checkpoint_playwright_args = checkpoint.get("playwright_args")

    mismatch = (
        checkpoint_run_e2e != config.run_e2e
        or checkpoint_use_docker != config.use_docker
        or checkpoint_keep_db != config.keep_db
        or list(checkpoint_playwright_args or []) != list(config.playwright_args)
    )

    if not mismatch:
        return

    print("❌ Resume aborted: verify configuration changed since checkpoint")
    print(f"Checkpoint: {CHECKPOINT_FILE}")
    print(f"Created at: {checkpoint.get('created_at', 'unknown')}")
    print("")
    print("Differences (checkpoint vs current):")
    print(f"- run_e2e:     {checkpoint_run_e2e!r} vs {config.run_e2e!r}")
    print(f"- use_docker:  {checkpoint_use_docker!r} vs {config.use_docker!r}")
    print(f"- keep_db:     {checkpoint_keep_db!r} vs {config.keep_db!r}")
    print(
        f"- playwright_args: {' '.join(list(checkpoint_playwright_args or [])) or '<none>'} "
        f"vs {' '.join(config.playwright_args) or '<none>'}"
    )
    print("")
    print("Re-run with the original flags, or pass --clear-checkpoint.")
    raise VerifyError("Config mismatch")


def json_dumps(data: dict) -> str:
    """Serialize JSON with stable formatting."""

    import json

    return json.dumps(data, sort_keys=True, indent=2) + "\n"


def json_loads(text: str) -> dict:
    """Parse JSON."""

    import json

    return json.loads(text)


def e2e_preflight(config: VerifyConfig, state: RuntimeState) -> None:
    """Fail if dev.sh is running; create E2E lock."""

    ensure_run_dir()

    if DEV_LOCK.exists():
        try:
            pid = int(DEV_LOCK.read_text(encoding="utf-8").strip() or "0")
        except Exception:
            pid = 0

        if pid and process_alive(pid):
            raise VerifyError(
                f"dev.sh is currently running (PID: {pid}); stop it first"
            )
        DEV_LOCK.unlink(missing_ok=True)

    E2E_LOCK.write_text(str(os.getpid()), encoding="utf-8")


def e2e_setup_db(config: VerifyConfig, state: RuntimeState) -> None:
    """Start Docker Postgres (or prepare JSON storage) for E2E."""

    if not config.use_docker:
        os.environ["DATABASE_URL"] = ""
        json_users = (
            PROJECT_ROOT / "src" / "motido" / "data" / "motido_data" / "users.json"
        )
        json_users.unlink(missing_ok=True)
        return

    compose = detect_docker_compose()
    state.docker_compose_cmd = compose

    ensure_docker_running()

    # Reset DB state
    subprocess.run(
        compose + ["-f", "docker-compose.test.yml", "down", "-v"],
        cwd=str(PROJECT_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    subprocess.run(
        ["docker", "rm", "-f", "motido-test-db"],
        cwd=str(PROJECT_ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=False,
    )
    subprocess.run(
        compose + ["-f", "docker-compose.test.yml", "up", "-d"],
        cwd=str(PROJECT_ROOT),
        check=True,
    )
    state.docker_started = True

    wait_for_postgres_ready(
        container="motido-test-db",
        user="motido_test",
        dbname="motido_test",
        timeout_seconds=30,
    )


def ensure_docker_running() -> None:
    """Ensure docker daemon is available; try colima if present."""

    if not shutil_which("docker"):
        raise VerifyError("Docker is not installed")

    try:
        subprocess.run(
            ["docker", "info"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
        )
        return
    except Exception:
        pass

    if shutil_which("colima"):
        subprocess.run(["colima", "start"], check=False)

    subprocess.run(
        ["docker", "info"],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
        check=True,
    )


def wait_for_postgres_ready(
    *,
    container: str,
    user: str,
    dbname: str,
    timeout_seconds: int,
) -> None:
    """Wait until pg_isready succeeds inside the container."""

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        try:
            subprocess.run(
                [
                    "docker",
                    "exec",
                    container,
                    "pg_isready",
                    "-U",
                    user,
                    "-d",
                    dbname,
                ],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=True,
            )
            return
        except Exception:
            time.sleep(1)

    raise VerifyError("PostgreSQL failed to start")


def e2e_ensure_backend(config: VerifyConfig, state: RuntimeState) -> None:
    """Ensure backend is running on :8000."""

    if http_ok("http://localhost:8000/api/health"):
        return

    ensure_run_dir()

    cmd = choose_python_run() + [
        "uvicorn",
        "motido.api.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        "8000",
    ]

    with BACKEND_LOG.open("wb") as out:
        state.backend_proc = subprocess.Popen(
            cmd,
            cwd=str(PROJECT_ROOT),
            stdout=out,
            stderr=subprocess.STDOUT,
        )

    if not wait_for_http("http://localhost:8000/api/health", 30):
        tail = tail_bytes(BACKEND_LOG, 40)
        raise VerifyError("Backend failed to start.\nBackend Log:\n" + tail)


def e2e_ensure_frontend(config: VerifyConfig, state: RuntimeState) -> None:
    """Ensure Vite frontend is running on :5173."""

    if http_ok("http://localhost:5173"):
        return

    ensure_run_dir()

    cmd = ["npm", "run", "dev"]
    with FRONTEND_LOG.open("wb") as out:
        state.frontend_proc = subprocess.Popen(
            cmd,
            cwd=str(PROJECT_ROOT / "frontend"),
            stdout=out,
            stderr=subprocess.STDOUT,
        )

    if not wait_for_http("http://localhost:5173", 30):
        tail = tail_bytes(FRONTEND_LOG, 40)
        raise VerifyError("Frontend failed to start.\nFrontend Log:\n" + tail)


def http_ok(url: str) -> bool:
    """Return True if curl-like GET succeeds."""

    try:
        subprocess.run(
            ["curl", "-s", url],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=True,
        )
        return True
    except Exception:
        return False


def wait_for_http(url: str, timeout_seconds: int) -> bool:
    """Wait until URL responds."""

    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if http_ok(url):
            return True
        time.sleep(1)
    return False


def process_alive(pid: int) -> bool:
    """Return True if a PID exists."""

    try:
        os.kill(pid, 0)
        return True
    except Exception:
        return False


def tail_bytes(path: Path, lines: int) -> str:
    """Return last N lines from a text file (best-effort)."""

    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except FileNotFoundError:
        return ""

    parts = text.splitlines()[-lines:]
    return "\n".join(parts)


def cleanup(state: RuntimeState, config: VerifyConfig) -> None:
    """Stop any processes/resources started by this script."""

    try:
        E2E_LOCK.unlink(missing_ok=True)
    except Exception:
        pass

    for proc in (state.backend_proc, state.frontend_proc):
        if not proc:
            continue
        try:
            proc.terminate()
        except Exception:
            pass

    if state.docker_started and not config.keep_db:
        if state.docker_compose_cmd:
            subprocess.run(
                state.docker_compose_cmd
                + ["-f", "docker-compose.test.yml", "down", "-v"],
                cwd=str(PROJECT_ROOT),
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )


def build_steps(config: VerifyConfig) -> List[Step]:
    """Build an ordered step list."""

    python_run = choose_python_run()

    steps: List[Step] = [
        CommandStep(
            step_id="backend:isort",
            label="Formatting (isort)",
            command=python_run + ["isort", "."],
            cwd=PROJECT_ROOT,
            env={"PYTHONPATH": str(PROJECT_ROOT / "src")},
        ),
        CommandStep(
            step_id="backend:black",
            label="Formatting (black)",
            command=python_run + ["black", "."],
            cwd=PROJECT_ROOT,
            env={"PYTHONPATH": str(PROJECT_ROOT / "src")},
        ),
        CommandStep(
            step_id="backend:mypy",
            label="Type checking (mypy)",
            command=python_run + ["mypy", "src", "tests"],
            cwd=PROJECT_ROOT,
            env={"PYTHONPATH": str(PROJECT_ROOT / "src")},
        ),
        CommandStep(
            step_id="backend:pylint",
            label="Linting (pylint)",
            command=python_run
            + [
                "pylint",
                "src",
                "tests",
                "--fail-under=10",
            ],
            cwd=PROJECT_ROOT,
            env={"PYTHONPATH": str(PROJECT_ROOT / "src")},
        ),
        CommandStep(
            step_id="backend:pytest",
            label="Unit tests (pytest)",
            command=python_run
            + [
                "pytest",
                "--cov=motido",
                "--cov-report=term-missing",
                "--cov-fail-under=100",
            ],
            cwd=PROJECT_ROOT,
            env={"PYTHONPATH": str(PROJECT_ROOT / "src")},
        ),
        CommandStep(
            step_id="frontend:npm-ci",
            label="Installing dependencies",
            command=["npm", "ci"],
            cwd=PROJECT_ROOT / "frontend",
        ),
        CommandStep(
            step_id="frontend:eslint",
            label="Linting (ESLint)",
            command=["npm", "run", "lint"],
            cwd=PROJECT_ROOT / "frontend",
        ),
        CommandStep(
            step_id="frontend:tsc",
            label="Type checking (TSC)",
            command=["npx", "tsc", "--noEmit"],
            cwd=PROJECT_ROOT / "frontend",
        ),
        CommandStep(
            step_id="frontend:vitest",
            label="Unit tests (Vitest)",
            command=["npm", "run", "test:coverage"],
            cwd=PROJECT_ROOT / "frontend",
        ),
        CommandStep(
            step_id="frontend:build",
            label="Building production bundle",
            command=["npm", "run", "build"],
            cwd=PROJECT_ROOT / "frontend",
        ),
    ]

    if not config.run_e2e:
        return steps

    steps.extend(
        [
            FunctionStep(
                step_id="e2e:preflight",
                label="E2E preflight",
                func_name="e2e_preflight",
            ),
            FunctionStep(
                step_id="e2e:db",
                label=(
                    "Starting Docker PostgreSQL"
                    if config.use_docker
                    else "Preparing JSON storage"
                ),
                func_name="e2e_setup_db",
            ),
            FunctionStep(
                step_id="e2e:backend",
                label="Starting backend server",
                func_name="e2e_ensure_backend",
            ),
            FunctionStep(
                step_id="e2e:frontend",
                label="Starting frontend dev server",
                func_name="e2e_ensure_frontend",
            ),
            CommandStep(
                step_id="e2e:playwright",
                label="Running Playwright Tests",
                command=[
                    "npx",
                    "playwright",
                    "test",
                    *config.playwright_args,
                ],
                cwd=PROJECT_ROOT / "frontend",
                env={"PW_TEST_HTML_REPORT_OPEN": "never"},
            ),
        ]
    )

    return steps


def parse_args(argv: Sequence[str]) -> argparse.Namespace:
    """Parse CLI args."""

    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument(
        "--clear-checkpoint",
        action="store_true",
        help="Discard any saved failure checkpoint and start from the top.",
    )
    parser.add_argument(
        "--skip-e2e",
        "--unit-only",
        action="store_true",
        help="Run unit checks only (skip E2E).",
    )
    parser.add_argument(
        "--keep-db",
        action="store_true",
        help="Keep Docker DB running after E2E.",
    )
    parser.add_argument(
        "--no-docker",
        action="store_true",
        help="Skip Docker; force JSON storage for E2E.",
    )

    # Everything else is passed to Playwright.
    parser.add_argument(
        "playwright_args",
        nargs=argparse.REMAINDER,
        help="Arguments forwarded to 'npx playwright test'.",
    )

    return parser.parse_args(list(argv))


def main(argv: Sequence[str]) -> int:
    """CLI entrypoint."""

    args = parse_args(argv)

    config = VerifyConfig(
        run_e2e=not bool(args.skip_e2e),
        use_docker=not bool(args.no_docker),
        keep_db=bool(args.keep_db),
        playwright_args=list(args.playwright_args or []),
    )

    ensure_run_dir()

    if args.clear_checkpoint:
        clear_checkpoint()

    resume_step_id: Optional[str] = None
    if CHECKPOINT_FILE.exists() and not args.clear_checkpoint:
        checkpoint = load_checkpoint()
        require_checkpoint_match(
            checkpoint=checkpoint,
            config=config,
        )
        resume_step_id = str(checkpoint.get("failed_step_id"))

    print("====================================")
    print("Running verify suite (python)")
    print("====================================")
    if resume_step_id:
        print(f"Resuming from checkpoint: {resume_step_id}")

    state = RuntimeState()
    steps = build_steps(config)

    step_ids = [s.step_id for s in steps]
    resume_index = 0
    if resume_step_id:
        if resume_step_id not in step_ids:
            raise VerifyError(f"Unknown step in checkpoint: {resume_step_id}")
        resume_index = step_ids.index(resume_step_id)

    def run_range(start: int, end: int) -> None:
        for i in range(start, end):
            step = steps[i]
            try:
                step.run(config, state)
            except VerifyError:
                write_checkpoint(
                    failed_step_id=step.step_id,
                    config=config,
                )
                raise

    try:
        if resume_step_id:
            run_range(resume_index, len(steps))
            if resume_index > 0:
                run_range(0, resume_index)
            clear_checkpoint()
        else:
            run_range(0, len(steps))
            clear_checkpoint()

        print("")
        print("====================================")
        if not config.run_e2e:
            print("✅ Unit checks passed (E2E skipped)")
        else:
            print("✅ All checks passed!")
        print("====================================")
        return 0

    finally:
        cleanup(state, config)


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except VerifyError as e:
        print("")
        print(f"❌ {e}")
        raise SystemExit(1)
