#!/usr/bin/env python3
"""Debug Select widget behavior."""

from motido.core.models import Difficulty, Duration, Priority

print("=== Debug Select Widget Options ===\n")

# Test the Select options format
print("Priority Select options:")
priority_options = [(p.value, p) for p in Priority]
for i, (display, value) in enumerate(priority_options):
    print(f"  {i}: '{display}' -> {value}")

print("\nDifficulty Select options:")
difficulty_options = [(d.value, d) for d in Difficulty]
for i, (display, value) in enumerate(difficulty_options):
    print(f"  {i}: '{display}' -> {value}")

print("\nDuration Select options:")
duration_options = [(d.value, d) for d in Duration]
for i, (display, value) in enumerate(duration_options):
    print(f"  {i}: '{display}' -> {value}")

print("\nTesting what happens when we look for Medium:")
print(f"Difficulty.MEDIUM: {Difficulty.MEDIUM}")
print(f"Duration.MEDIUM: {Duration.MEDIUM}")

# Find the index of MEDIUM values
for i, (display, value) in enumerate(difficulty_options):
    if value == Difficulty.MEDIUM:
        print(f"Difficulty.MEDIUM is at index {i}")

for i, (display, value) in enumerate(duration_options):
    if value == Duration.MEDIUM:
        print(f"Duration.MEDIUM is at index {i}")

print("\nFirst option (index 0) in each:")
print(f"Priority[0]: {priority_options[0][1]}")
print(f"Difficulty[0]: {difficulty_options[0][1]}")
print(f"Duration[0]: {duration_options[0][1]}")
