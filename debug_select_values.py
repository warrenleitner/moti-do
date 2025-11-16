#!/usr/bin/env python3
"""Debug Select widget values."""

from motido.core.models import Difficulty, Duration, Priority

print("=== Debug Select Values ===\n")

print("Priority options:")
for p in Priority:
    print(f"  {p.value} -> {p}")

print("\nDifficulty options:")
for d in Difficulty:
    print(f"  {d.value} -> {d}")

print("\nDuration options:")
for d in Duration:
    print(f"  {d.value} -> {d}")

print("\nDefault values:")
print(f"Priority.LOW: {Priority.LOW}")
print(f"Difficulty.MEDIUM: {Difficulty.MEDIUM}")
print(f"Duration.MEDIUM: {Duration.MEDIUM}")

print("\nSelect options format:")
print("Priority:", [(p.value, p) for p in Priority])
print("Difficulty:", [(d.value, d) for d in Difficulty])
print("Duration:", [(d.value, d) for d in Duration])
