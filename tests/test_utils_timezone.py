"""Tests for the get_today_for_timezone utility function."""

from datetime import date, datetime
from unittest.mock import patch
from zoneinfo import ZoneInfo

from motido.core.utils import get_today_for_timezone


def test_get_today_for_timezone_none_falls_back_to_local() -> None:
    """When timezone is None, fallback to date.today()."""
    result = get_today_for_timezone(None)
    assert result == date.today()


def test_get_today_for_timezone_valid_timezone() -> None:
    """A valid IANA timezone should return today in that timezone."""
    result = get_today_for_timezone("UTC")
    expected = datetime.now(ZoneInfo("UTC")).date()
    assert result == expected


def test_get_today_for_timezone_new_york() -> None:
    """Test with America/New_York timezone."""
    result = get_today_for_timezone("America/New_York")
    expected = datetime.now(ZoneInfo("America/New_York")).date()
    assert result == expected


def test_get_today_for_timezone_invalid_falls_back() -> None:
    """An invalid timezone string should fall back to date.today()."""
    result = get_today_for_timezone("Invalid/Timezone")
    assert result == date.today()


def test_get_today_for_timezone_empty_string_falls_back() -> None:
    """An empty string should be treated as falsy and fall back."""
    result = get_today_for_timezone("")
    assert result == date.today()


def test_get_today_for_timezone_different_date_at_boundary() -> None:
    """Verify that different timezones can report different dates.

    We mock datetime.now to return a time near midnight UTC so that
    timezones behind UTC would still be on the previous day.
    """
    # 2025-01-15 00:30 UTC -> still Jan 14 in US Pacific (UTC-8)
    fake_utc_now = datetime(2025, 1, 15, 0, 30, 0, tzinfo=ZoneInfo("UTC"))

    with patch("motido.core.utils.datetime") as mock_dt:
        mock_dt.now = lambda tz: fake_utc_now.astimezone(tz)
        mock_dt.side_effect = lambda *a, **kw: datetime(*a, **kw)

        utc_date = get_today_for_timezone("UTC")
        pacific_date = get_today_for_timezone("America/Los_Angeles")

        assert utc_date == date(2025, 1, 15)
        assert pacific_date == date(2025, 1, 14)
