"""Tests for the parse_date utility function."""

from datetime import datetime, timedelta

import pytest

from motido.core.utils import parse_date


def test_parse_date_iso_format() -> None:
    """Test parsing ISO format date (YYYY-MM-DD)."""
    result = parse_date("2025-12-31")
    assert result == datetime(2025, 12, 31, 0, 0, 0)


def test_parse_date_today() -> None:
    """Test parsing 'today'."""
    result = parse_date("today")
    expected = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    assert result.date() == expected.date()


def test_parse_date_tomorrow() -> None:
    """Test parsing 'tomorrow'."""
    result = parse_date("tomorrow")
    expected = datetime.now().replace(
        hour=0, minute=0, second=0, microsecond=0
    ) + timedelta(days=1)
    assert result.date() == expected.date()


def test_parse_date_yesterday() -> None:
    """Test parsing 'yesterday'."""
    result = parse_date("yesterday")
    expected = datetime.now().replace(
        hour=0, minute=0, second=0, microsecond=0
    ) - timedelta(days=1)
    assert result.date() == expected.date()


def test_parse_date_in_days() -> None:
    """Test parsing 'in X days'."""
    result = parse_date("in 5 days")
    expected = datetime.now().replace(
        hour=0, minute=0, second=0, microsecond=0
    ) + timedelta(days=5)
    assert result.date() == expected.date()


def test_parse_date_in_weeks() -> None:
    """Test parsing 'in X weeks'."""
    result = parse_date("in 2 weeks")
    expected = datetime.now().replace(
        hour=0, minute=0, second=0, microsecond=0
    ) + timedelta(weeks=2)
    assert result.date() == expected.date()


def test_parse_date_next_monday() -> None:
    """Test parsing 'next monday'."""
    result = parse_date("next monday")
    assert result.weekday() == 0  # Monday is 0


def test_parse_date_next_friday() -> None:
    """Test parsing 'next friday'."""
    result = parse_date("next friday")
    assert result.weekday() == 4  # Friday is 4


def test_parse_date_next_sunday() -> None:
    """Test parsing 'next sunday'."""
    result = parse_date("next sunday")
    assert result.weekday() == 6  # Sunday is 6


def test_parse_date_case_insensitive() -> None:
    """Test that parsing is case-insensitive."""
    result1 = parse_date("TODAY")
    result2 = parse_date("Today")
    result3 = parse_date("today")
    assert result1.date() == result2.date() == result3.date()


def test_parse_date_with_whitespace() -> None:
    """Test that whitespace is handled correctly."""
    result = parse_date("  tomorrow  ")
    expected = datetime.now().replace(
        hour=0, minute=0, second=0, microsecond=0
    ) + timedelta(days=1)
    assert result.date() == expected.date()


def test_parse_date_invalid_format() -> None:
    """Test that invalid date format raises ValueError."""
    with pytest.raises(ValueError, match="Unable to parse date"):
        parse_date("invalid-date")


def test_parse_date_invalid_weekday() -> None:
    """Test that invalid weekday raises ValueError."""
    with pytest.raises(ValueError, match="Unable to parse date"):
        parse_date("next foobar")


def test_parse_date_invalid_in_format() -> None:
    """Test that invalid 'in X' format raises ValueError."""
    with pytest.raises(ValueError, match="Unable to parse date"):
        parse_date("in xyz days")
