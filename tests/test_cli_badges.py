"""Tests for CLI badges command and badge earning system."""

from argparse import Namespace
from datetime import datetime
from typing import Any

from pytest_mock import MockerFixture

from motido.cli.main import handle_badges, handle_complete
from motido.core.models import Badge, Task, User
from motido.core.scoring import check_badges


def test_handle_badges_no_user(mocker: MockerFixture, capsys) -> None:  # type: ignore[no-untyped-def]
    """Test badges command with no user."""
    mock_manager = mocker.Mock()

    args = Namespace(verbose=False)

    try:
        handle_badges(args, mock_manager, None)
    except SystemExit:
        pass

    captured = capsys.readouterr()
    assert "User not found" in captured.out


def test_handle_badges_no_badges_defined(mocker: MockerFixture, capsys) -> None:  # type: ignore[no-untyped-def]
    """Test badges command when no badges are defined in config."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={"base_score": 10},  # No badges key
    )

    args = Namespace(verbose=False)
    handle_badges(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "No badges defined" in captured.out


def test_handle_badges_displays_earned_badges(mocker: MockerFixture, capsys) -> None:  # type: ignore[no-untyped-def]
    """Test badges command displays earned badges correctly."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    # Add an earned badge
    user.badges.append(
        Badge(
            id="first_steps",
            name="First Steps",
            description="Complete your first task",
            glyph="🌟",
            earned_date=datetime.now(),
        )
    )

    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={
            "base_score": 10,
            "badges": [
                {
                    "id": "first_steps",
                    "name": "First Steps",
                    "glyph": "🌟",
                    "description": "Complete your first task",
                    "criteria": {"tasks_completed": 1},
                },
                {
                    "id": "getting_started",
                    "name": "Getting Started",
                    "glyph": "🚀",
                    "description": "Complete 5 tasks",
                    "criteria": {"tasks_completed": 5},
                },
            ],
        },
    )

    args = Namespace(verbose=False)
    handle_badges(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "Badges" in captured.out
    assert "1/2 badges" in captured.out


def test_handle_badges_shows_progress(mocker: MockerFixture, capsys) -> None:  # type: ignore[no-untyped-def]
    """Test badges command shows progress for unearned badges."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    # Add some completed tasks
    for i in range(3):
        task = Task(
            title=f"Task {i}",
            creation_date=datetime.now(),
            is_complete=True,
        )
        user.tasks.append(task)

    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={
            "base_score": 10,
            "badges": [
                {
                    "id": "getting_started",
                    "name": "Getting Started",
                    "glyph": "🚀",
                    "description": "Complete 5 tasks",
                    "criteria": {"tasks_completed": 5},
                },
            ],
        },
    )

    args = Namespace(verbose=False)
    handle_badges(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "3/5 tasks" in captured.out


def test_check_badges_earns_first_task_badge(mocker: MockerFixture) -> None:
    """Test that completing first task earns the first_steps badge."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    # Add a completed task
    task = Task(
        title="First Task",
        creation_date=datetime.now(),
        is_complete=True,
    )
    user.tasks.append(task)

    config = {
        "badges": [
            {
                "id": "first_steps",
                "name": "First Steps",
                "glyph": "🌟",
                "description": "Complete your first task",
                "criteria": {"tasks_completed": 1},
            },
        ],
    }

    newly_earned = check_badges(user, mock_manager, config)

    assert len(newly_earned) == 1
    assert newly_earned[0].id == "first_steps"
    assert newly_earned[0].name == "First Steps"
    assert newly_earned[0].is_earned()
    mock_manager.save_user.assert_called_once()


def test_check_badges_does_not_duplicate(mocker: MockerFixture) -> None:
    """Test that already earned badges are not awarded again."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    # Add a completed task
    task = Task(
        title="First Task",
        creation_date=datetime.now(),
        is_complete=True,
    )
    user.tasks.append(task)

    # Pre-add the badge as earned
    user.badges.append(
        Badge(
            id="first_steps",
            name="First Steps",
            description="Complete your first task",
            glyph="🌟",
            earned_date=datetime.now(),
        )
    )

    config = {
        "badges": [
            {
                "id": "first_steps",
                "name": "First Steps",
                "glyph": "🌟",
                "description": "Complete your first task",
                "criteria": {"tasks_completed": 1},
            },
        ],
    }

    newly_earned = check_badges(user, mock_manager, config)

    assert len(newly_earned) == 0
    mock_manager.save_user.assert_not_called()


def test_check_badges_xp_criteria(mocker: MockerFixture) -> None:
    """Test badge earning based on XP criteria."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")
    user.total_xp = 150

    config = {
        "badges": [
            {
                "id": "xp_starter",
                "name": "XP Starter",
                "glyph": "⭐",
                "description": "Earn 100 XP",
                "criteria": {"total_xp": 100},
            },
            {
                "id": "xp_seeker",
                "name": "XP Seeker",
                "glyph": "🌟",
                "description": "Earn 1,000 XP",
                "criteria": {"total_xp": 1000},
            },
        ],
    }

    newly_earned = check_badges(user, mock_manager, config)

    assert len(newly_earned) == 1
    assert newly_earned[0].id == "xp_starter"


def test_check_badges_streak_criteria(mocker: MockerFixture) -> None:
    """Test badge earning based on streak criteria."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    # Add a habit with a 7-day streak
    habit = Task(
        title="Daily Habit",
        creation_date=datetime.now(),
        is_habit=True,
        streak_current=7,
        streak_best=10,
    )
    user.tasks.append(habit)

    config = {
        "badges": [
            {
                "id": "streak_week",
                "name": "Week Warrior",
                "glyph": "🔥",
                "description": "Achieve a 7-day streak",
                "criteria": {"streak_days": 7},
            },
            {
                "id": "streak_month",
                "name": "Monthly Master",
                "glyph": "🏆",
                "description": "Achieve a 30-day streak",
                "criteria": {"streak_days": 30},
            },
        ],
    }

    newly_earned = check_badges(user, mock_manager, config)

    # Should earn streak_week (current streak = 7) and also streak_month check
    # uses best streak (10), but 10 < 30 so only week should be earned
    assert len(newly_earned) == 1
    assert newly_earned[0].id == "streak_week"


def test_check_badges_habits_completed_criteria(mocker: MockerFixture) -> None:
    """Test badge earning based on habits completed criteria."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    # Add completed habit tasks
    for i in range(10):
        habit = Task(
            title=f"Habit {i}",
            creation_date=datetime.now(),
            is_habit=True,
            is_complete=True,
        )
        user.tasks.append(habit)

    config = {
        "badges": [
            {
                "id": "habit_starter",
                "name": "Habit Starter",
                "glyph": "🎯",
                "description": "Complete your first habit",
                "criteria": {"habits_completed": 1},
            },
            {
                "id": "habit_builder",
                "name": "Habit Builder",
                "glyph": "🏗️",
                "description": "Complete 10 habit instances",
                "criteria": {"habits_completed": 10},
            },
        ],
    }

    newly_earned = check_badges(user, mock_manager, config)

    assert len(newly_earned) == 2
    badge_ids = {b.id for b in newly_earned}
    assert "habit_starter" in badge_ids
    assert "habit_builder" in badge_ids


def test_check_badges_empty_config(mocker: MockerFixture) -> None:
    """Test check_badges with no badges in config."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    config = {"base_score": 10}  # No badges key

    newly_earned = check_badges(user, mock_manager, config)

    assert len(newly_earned) == 0
    mock_manager.save_user.assert_not_called()


def test_check_badges_multiple_criteria_met(mocker: MockerFixture) -> None:
    """Test earning multiple badges at once."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")
    user.total_xp = 200

    # Add 5 completed tasks
    for i in range(5):
        task = Task(
            title=f"Task {i}",
            creation_date=datetime.now(),
            is_complete=True,
        )
        user.tasks.append(task)

    config = {
        "badges": [
            {
                "id": "first_steps",
                "name": "First Steps",
                "glyph": "🌟",
                "description": "Complete your first task",
                "criteria": {"tasks_completed": 1},
            },
            {
                "id": "getting_started",
                "name": "Getting Started",
                "glyph": "🚀",
                "description": "Complete 5 tasks",
                "criteria": {"tasks_completed": 5},
            },
            {
                "id": "xp_starter",
                "name": "XP Starter",
                "glyph": "⭐",
                "description": "Earn 100 XP",
                "criteria": {"total_xp": 100},
            },
        ],
    }

    newly_earned = check_badges(user, mock_manager, config)

    assert len(newly_earned) == 3
    badge_ids = {b.id for b in newly_earned}
    assert "first_steps" in badge_ids
    assert "getting_started" in badge_ids
    assert "xp_starter" in badge_ids


def test_handle_complete_shows_badges(mocker: MockerFixture, capsys) -> None:  # type: ignore[no-untyped-def]
    """Test that completing a task shows newly earned badges."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    task = Task(
        title="First Task",
        creation_date=datetime.now(),
    )
    user.tasks.append(task)

    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={
            "base_score": 10,
            "badges": [
                {
                    "id": "first_steps",
                    "name": "First Steps",
                    "glyph": "🌟",
                    "description": "Complete your first task",
                    "criteria": {"tasks_completed": 1},
                },
            ],
        },
    )
    mocker.patch("motido.cli.main.calculate_score", return_value=10)
    mocker.patch("motido.cli.main.add_xp")

    args = Namespace(id=task.id[:8], verbose=False)
    handle_complete(args, mock_manager, user)

    captured = capsys.readouterr()
    assert "Badge Earned" in captured.out
    assert "First Steps" in captured.out
    assert "🌟" in captured.out


def test_check_badges_with_invalid_badge_id(mocker: MockerFixture) -> None:
    """Test check_badges handles badges with missing id gracefully."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    task = Task(
        title="Task",
        creation_date=datetime.now(),
        is_complete=True,
    )
    user.tasks.append(task)

    config = {
        "badges": [
            {
                # Missing "id" key
                "name": "Invalid Badge",
                "glyph": "❌",
                "description": "Should be skipped",
                "criteria": {"tasks_completed": 1},
            },
            {
                "id": "valid_badge",
                "name": "Valid Badge",
                "glyph": "✅",
                "description": "Should be earned",
                "criteria": {"tasks_completed": 1},
            },
        ],
    }

    newly_earned = check_badges(user, mock_manager, config)

    # Only the valid badge should be earned
    assert len(newly_earned) == 1
    assert newly_earned[0].id == "valid_badge"


def test_handle_badges_config_error(mocker: MockerFixture, capsys) -> None:  # type: ignore[no-untyped-def]
    """Test badges command handles config loading errors."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    mocker.patch(
        "motido.cli.main.load_scoring_config",
        side_effect=ValueError("Invalid config"),
    )

    args = Namespace(verbose=False)

    try:
        handle_badges(args, mock_manager, user)
    except SystemExit:
        pass

    captured = capsys.readouterr()
    assert "Error loading scoring config" in captured.out


def test_handle_badges_shows_habits_completed_progress(
    mocker: MockerFixture, capsys: Any
) -> None:
    """Test badges command shows progress for habits_completed criteria."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    # Add some completed habits
    for i in range(3):
        habit = Task(
            title=f"Habit {i}",
            creation_date=datetime.now(),
            is_habit=True,
            is_complete=True,
        )
        user.tasks.append(habit)

    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={
            "base_score": 10,
            "badges": [
                {
                    "id": "habit_builder",
                    "name": "Habit Builder",
                    "glyph": "🏗️",
                    "description": "Complete 10 habit instances",
                    "criteria": {"habits_completed": 10},
                },
            ],
        },
    )

    args = Namespace(verbose=False)
    handle_badges(args, mock_manager, user)

    captured = capsys.readouterr()
    # Rich table output - check for the key parts
    assert "Habit Builder" in captured.out
    assert "0/1 badges" in captured.out  # Badge not earned yet


def test_handle_badges_shows_streak_progress(
    mocker: MockerFixture, capsys: Any
) -> None:
    """Test badges command shows progress for streak_days criteria."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")

    # Add a habit with streak
    habit = Task(
        title="Daily Habit",
        creation_date=datetime.now(),
        is_habit=True,
        streak_current=5,
        streak_best=5,
    )
    user.tasks.append(habit)

    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={
            "base_score": 10,
            "badges": [
                {
                    "id": "streak_week",
                    "name": "Week Warrior",
                    "glyph": "🔥",
                    "description": "Achieve a 7-day streak",
                    "criteria": {"streak_days": 7},
                },
            ],
        },
    )

    args = Namespace(verbose=False)
    handle_badges(args, mock_manager, user)

    captured = capsys.readouterr()
    # Rich table output - check for the key parts
    assert "Week Warrior" in captured.out
    assert "0/1 badges" in captured.out  # Badge not earned yet


def test_handle_badges_shows_xp_progress(mocker: MockerFixture, capsys: Any) -> None:
    """Test badges command shows progress for total_xp criteria."""
    mock_manager = mocker.Mock()
    user = User(username="testuser")
    user.total_xp = 75

    mocker.patch(
        "motido.cli.main.load_scoring_config",
        return_value={
            "base_score": 10,
            "badges": [
                {
                    "id": "xp_starter",
                    "name": "XP Starter",
                    "glyph": "⭐",
                    "description": "Earn 100 XP",
                    "criteria": {"total_xp": 100},
                },
            ],
        },
    )

    args = Namespace(verbose=False)
    handle_badges(args, mock_manager, user)

    captured = capsys.readouterr()
    # Rich table output - check for the key parts
    assert "XP Starter" in captured.out
    assert "0/1 badges" in captured.out  # Badge not earned yet
