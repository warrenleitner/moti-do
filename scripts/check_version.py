#!/usr/bin/env python3
"""check_version.py – Verify version bump and sync across all version files.

Checks
------
1. All version files contain the same version string.
2. If source files changed relative to ``git merge-base HEAD origin/main``,
   the version must differ from the merge-base version.

Exit codes
----------
  0 – all checks passed (or bump-check skipped due to missing git info)
  1 – version mismatch or bump required

Notes
-----
Uses only the Python standard library so it can run without Poetry / venv.
"""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]

# Directories whose changes require a version bump.
SOURCE_PREFIXES = ("src/", "tests/", "frontend/")

# Files inside SOURCE_PREFIXES that should NOT trigger a bump requirement
# (auto-generated lockfiles).
EXCLUDE_FILES = {"frontend/package-lock.json"}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _git(*args: str) -> str:
    """Run a git command in *PROJECT_ROOT* and return stripped stdout."""

    result = subprocess.run(
        ["git", *args],
        cwd=str(PROJECT_ROOT),
        capture_output=True,
        text=True,
        check=True,
    )
    return result.stdout.strip()


def _read_version_pyproject(text: str) -> str:
    """Extract ``version = "…"`` from *pyproject.toml* content."""

    match = re.search(r'^version\s*=\s*"([^"]+)"', text, re.MULTILINE)
    if not match:
        raise ValueError("version not found in pyproject.toml")
    return match.group(1)


# ---------------------------------------------------------------------------
# Version reading
# ---------------------------------------------------------------------------


def read_current_versions() -> dict[str, str]:
    """Return ``{label: version}`` for every file that embeds the app version."""

    versions: dict[str, str] = {}

    # pyproject.toml
    text = (PROJECT_ROOT / "pyproject.toml").read_text(encoding="utf-8")
    versions["pyproject.toml"] = _read_version_pyproject(text)

    # frontend/package.json
    text = (PROJECT_ROOT / "frontend" / "package.json").read_text(encoding="utf-8")
    versions["frontend/package.json"] = json.loads(text)["version"]

    # src/motido/api/main.py  (two occurrences)
    text = (PROJECT_ROOT / "src" / "motido" / "api" / "main.py").read_text(
        encoding="utf-8"
    )
    m_fastapi = re.search(r'version="([^"]+)"', text)
    if m_fastapi:
        versions["src/motido/api/main.py (FastAPI)"] = m_fastapi.group(1)
    m_health = re.search(r'"version":\s*"([^"]+)"', text)
    if m_health:
        versions["src/motido/api/main.py (health)"] = m_health.group(1)

    # frontend/src/test/mocks/handlers.ts
    text = (
        PROJECT_ROOT / "frontend" / "src" / "test" / "mocks" / "handlers.ts"
    ).read_text(encoding="utf-8")
    m_mock = re.search(r"version:\s*'([^']+)'", text)
    if m_mock:
        versions["frontend/src/test/mocks/handlers.ts"] = m_mock.group(1)

    # frontend/src/test/setup.ts
    text = (PROJECT_ROOT / "frontend" / "src" / "test" / "setup.ts").read_text(
        encoding="utf-8"
    )
    m_setup = re.search(r"__APP_VERSION__\s*=\s*'([^']+)'", text)
    if m_setup:
        versions["frontend/src/test/setup.ts"] = m_setup.group(1)

    return versions


# ---------------------------------------------------------------------------
# Change detection
# ---------------------------------------------------------------------------


def _is_source_file(path: str) -> bool:
    """Return *True* if *path* is a source file whose change warrants a bump."""

    if path in EXCLUDE_FILES:
        return False
    return any(path.startswith(p) for p in SOURCE_PREFIXES)


def _resolve_merge_base() -> str:
    """Return the merge-base SHA, fetching ``origin/main`` if necessary."""

    try:
        return _git("merge-base", "HEAD", "origin/main")
    except subprocess.CalledProcessError:
        pass

    # origin/main may not have been fetched yet (shallow clone, CI, etc.)
    _git("fetch", "origin", "main:refs/remotes/origin/main")
    return _git("merge-base", "HEAD", "origin/main")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main() -> int:
    """Run version checks and return an exit code."""

    errors: list[str] = []

    # ── 1. Version sync ──────────────────────────────────────────────────
    print("Checking version sync across all files…")
    versions = read_current_versions()
    unique = set(versions.values())

    if len(unique) != 1:
        print("❌ Version mismatch:")
        for label, ver in sorted(versions.items()):
            print(f"   {label}: {ver}")
        errors.append("Version files are out of sync")
    else:
        print(f"   All files: {unique.copy().pop()} ✓")

    # Use pyproject.toml as the reference version for the bump check.
    current_version = versions.get("pyproject.toml", "")

    # ── 2. Version bump (vs merge-base) ──────────────────────────────────
    print("Checking version bump vs origin/main…")

    try:
        merge_base = _resolve_merge_base()
    except (subprocess.CalledProcessError, FileNotFoundError) as exc:
        print(f"   ⚠️  Skipped (cannot determine merge-base: {exc})")
        return 1 if errors else 0

    try:
        diff_output = _git("diff", "--name-only", f"{merge_base}..HEAD")
    except subprocess.CalledProcessError:
        print("   ⚠️  Skipped (git diff failed)")
        return 1 if errors else 0

    changed = [f for f in diff_output.splitlines() if f.strip()]
    source_changes = [f for f in changed if _is_source_file(f)]

    if not source_changes:
        print("   No source-file changes detected — bump not required ✓")
        return 1 if errors else 0

    try:
        base_text = _git("show", f"{merge_base}:pyproject.toml")
        base_version = _read_version_pyproject(base_text)
    except (subprocess.CalledProcessError, ValueError) as exc:
        print(f"   ⚠️  Skipped (cannot read base version: {exc})")
        return 1 if errors else 0

    if current_version == base_version:
        print("❌ Source files changed but version was NOT bumped!")
        print(f"   Current version : {current_version}")
        print(f"   Base version    : {base_version} (merge-base {merge_base[:8]})")
        print(f"   Changed source files ({len(source_changes)}):")
        for f in source_changes[:20]:
            print(f"     • {f}")
        if len(source_changes) > 20:
            print(f"     … and {len(source_changes) - 20} more")
        print()
        print("   Bump the version in ALL of these files:")
        print("     - pyproject.toml")
        print("     - frontend/package.json")
        print("     - src/motido/api/main.py  (2 places)")
        print("     - frontend/src/test/mocks/handlers.ts")
        print("     - frontend/src/test/setup.ts")
        errors.append("Version bump required")
    else:
        print(f"   {base_version} → {current_version} ✓")

    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
