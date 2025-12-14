"""Tests for tag and project multipliers in scoring."""

from datetime import datetime

from motido.core.models import Difficulty, Duration, Priority, Task
from motido.core.scoring import calculate_score
from tests.test_fixtures import get_default_scoring_config


def test_calculate_score_with_single_tag_multiplier() -> None:
    """Test score calculation with a single tag multiplier."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"urgent": 1.5}

    task = Task(
        title="Test task",
        creation_date=datetime(2025, 1, 1),
        tags=["urgent"],
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    # Base: 10, Difficulty: 1.1, Duration: 1.05, Age: 1.0, Due date: 1.0, Tag: 1.5
    # Priority: 1.0 (defaults to LOW which is 1.2, but we'll use NOT_SET)
    # Score = 10 * 1.2 * 1.1 * 1.05 * 1.0 * 1.0 * 1.5 = 20.79 = 21
    score = calculate_score(task, None, config, datetime(2025, 1, 1).date())
    assert score == 21


def test_calculate_score_with_multiple_tag_multipliers() -> None:
    """Test score calculation with multiple tags stacking multiplicatively."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"urgent": 1.5, "important": 1.3}

    task = Task(
        title="Test task",
        creation_date=datetime(2025, 1, 1),
        tags=["urgent", "important"],
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    # Base: 10, Difficulty: 1.1, Duration: 1.05, Age: 1.0, Due date: 1.0
    # Tag: 1.5 * 1.3 = 1.95
    # Score = 10 * 1.2 * 1.1 * 1.05 * 1.0 * 1.0 * 1.95 = 27.027 = 27
    score = calculate_score(task, None, config, datetime(2025, 1, 1).date())
    assert score == 27


def test_calculate_score_with_tag_not_in_config() -> None:
    """Test that tags not in config don't affect score."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"urgent": 1.5}

    task = Task(
        title="Test task",
        creation_date=datetime(2025, 1, 1),
        tags=["other"],
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    # Tag "other" not in config, so tag_mult = 1.0
    # Score = 10 * 1.2 * 1.1 * 1.05 * 1.0 * 1.0 * 1.0 = 13.86 = 14
    score = calculate_score(task, None, config, datetime(2025, 1, 1).date())
    assert score == 14


def test_calculate_score_with_project_multiplier() -> None:
    """Test score calculation with a project multiplier."""
    config = get_default_scoring_config()
    config["project_multipliers"] = {"WorkProject": 1.8}

    task = Task(
        title="Test task",
        creation_date=datetime(2025, 1, 1),
        project="WorkProject",
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    # Base: 10, Difficulty: 1.1, Duration: 1.05, Age: 1.0, Due date: 1.0, Project: 1.8
    # Score = 10 * 1.2 * 1.1 * 1.05 * 1.0 * 1.0 * 1.8 = 24.948 = 25
    score = calculate_score(task, None, config, datetime(2025, 1, 1).date())
    assert score == 25


def test_calculate_score_with_project_not_in_config() -> None:
    """Test that projects not in config don't affect score."""
    config = get_default_scoring_config()
    config["project_multipliers"] = {"WorkProject": 1.8}

    task = Task(
        title="Test task",
        creation_date=datetime(2025, 1, 1),
        project="PersonalProject",
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    # Project "PersonalProject" not in config, so project_mult = 1.0
    # Score = 10 * 1.2 * 1.1 * 1.05 * 1.0 * 1.0 * 1.0 = 13.86 = 14
    score = calculate_score(task, None, config, datetime(2025, 1, 1).date())
    assert score == 14


def test_calculate_score_with_both_tag_and_project_multipliers() -> None:
    """Test that tag and project multipliers stack together."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"urgent": 1.5}
    config["project_multipliers"] = {"WorkProject": 1.2}

    task = Task(
        title="Test task",
        creation_date=datetime(2025, 1, 1),
        tags=["urgent"],
        project="WorkProject",
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    # Base: 10, Difficulty: 1.1, Duration: 1.05, Age: 1.0, Due date: 1.0
    # Tag: 1.5, Project: 1.2
    # Score = 10 * 1.2 * 1.1 * 1.05 * 1.0 * 1.0 * 1.5 * 1.2 = 24.948 = 25
    score = calculate_score(task, None, config, datetime(2025, 1, 1).date())
    assert score == 25


def test_calculate_score_with_no_tags_or_project() -> None:
    """Test that tasks without tags or project get base score."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"urgent": 1.5}
    config["project_multipliers"] = {"WorkProject": 1.2}

    task = Task(
        title="Test task",
        creation_date=datetime(2025, 1, 1),
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    # No tags or project, so tag/project multipliers = 1.0
    # Score = 10 * 1.2 (LOW) * 1.1 * 1.05 * 1.0 * 1.0 * 1.0 * 1.0 = 13.86 = 14
    score = calculate_score(task, None, config, datetime(2025, 1, 1).date())
    assert score == 14


def test_calculate_score_with_mixed_tags() -> None:
    """Test that only configured tags contribute to multiplier."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"urgent": 1.5, "work": 1.2}

    task = Task(
        title="Test task",
        creation_date=datetime(2025, 1, 1),
        tags=["urgent", "personal", "work"],  # "personal" not in config
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    # Only "urgent" and "work" contribute
    # Tag: 1.5 * 1.2 = 1.8
    # Score = 10 * 1.2 * 1.1 * 1.05 * 1.0 * 1.0 * 1.8 = 24.948 = 25
    score = calculate_score(task, None, config, datetime(2025, 1, 1).date())
    assert score == 25


def test_calculate_score_with_complex_multipliers() -> None:
    """Test score calculation with all multipliers active."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"urgent": 2.0}
    config["project_multipliers"] = {"CriticalProject": 1.5}

    task = Task(
        title="Test task",
        creation_date=datetime(2025, 1, 1),
        tags=["urgent"],
        project="CriticalProject",
        priority=Priority.HIGH,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.LONG,
    )

    # Base: 10
    # Difficulty: 2.0 (MEDIUM)
    # Duration: 2.0 (LONG)
    # Age: 1.0
    # Due date: 1.0
    # Tag: 2.0
    # Project: 1.5
    # Score = 10 * 2.0 (HIGH) * 2.0 * 2.0 * 1.0 * 1.0 * 2.0 * 1.5 = 240
    score = calculate_score(task, None, config, datetime(2025, 1, 1).date())
    assert score == 240


def test_calculate_score_with_empty_tag_list() -> None:
    """Test that empty tag list doesn't cause errors."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"urgent": 1.5}

    task = Task(
        title="Test task",
        creation_date=datetime(2025, 1, 1),
        tags=[],  # Empty list
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    # Empty tags, so tag_mult = 1.0
    # Score = 10 * 1.2 * 1.1 * 1.05 * 1.0 * 1.0 * 1.0 = 13.86 = 14
    score = calculate_score(task, None, config, datetime(2025, 1, 1).date())
    assert score == 14
