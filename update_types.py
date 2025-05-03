#!/usr/bin/env python
"""
Helper script to update test function signatures with proper type annotations.
"""

import os
import re

# Files to update
files = [
    "tests/test_scoring.py",
    "tests/test_cli_scoring.py",
]

# Pattern to match function definitions without return types
pattern = r"def (\w+)\(([^)]*)\):"
replacement = r"def \1(\2) -> None:"

for filename in files:
    if not os.path.exists(filename):
        print(f"File {filename} does not exist.")
        continue

    with open(filename, "r") as file:
        content = file.read()

    # Replace function definitions
    updated_content = re.sub(pattern, replacement, content)

    # Write back to file
    with open(filename, "w") as file:
        file.write(updated_content)

    print(f"Updated {filename}")

print("Done updating test function signatures.")
