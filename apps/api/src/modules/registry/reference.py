"""Household number formatting shared by registry writes and demo seeding."""

from __future__ import annotations


def format_household_number(sequence: int) -> str:
    """Format a monotonically increasing number as the San Jose household ID."""
    return f"M-SJ-{sequence // 1000:03d}-{sequence % 1000:03d}"
