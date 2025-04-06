#!/usr/bin/env python3

import sys
import os
from pathlib import Path

# Ensure the script can find the 'cli' and 'library' packages
# Add the project root directory (parent of the directory containing this script) to sys.path
project_root = Path(__file__).resolve().parent
if str(project_root) not in sys.path:
    sys.path.insert(0, str(project_root))
    print(f"(motido.py) Added {project_root} to sys.path") # Debug print

# Now try importing the main function from the cli package
try:
    from cli.main import main as cli_main
    print("(motido.py) Successfully imported cli.main.main") # Debug print
except ImportError as e:
    print(f"Error: Could not import the Moti-Do CLI main function.", file=sys.stderr)
    print(f"Details: {e}", file=sys.stderr)
    print(f"Current sys.path: {sys.path}", file=sys.stderr)
    # Check if cli/main.py exists
    cli_main_path = project_root / "cli" / "main.py"
    if not cli_main_path.exists():
        print(f"Error: cli/main.py not found at expected location: {cli_main_path}", file=sys.stderr)
    sys.exit(1)
except Exception as e:
    print(f"An unexpected error occurred during import: {e}", file=sys.stderr)
    sys.exit(1)


if __name__ == "__main__":
    # Pass command line arguments (excluding the script name itself) to the CLI main function
    cli_main(sys.argv[1:]) 