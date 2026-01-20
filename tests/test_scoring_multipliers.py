"""Tests for tag and project multipliers in scoring."""

from datetime import datetime

from motido.core.models import Difficulty, Duration, Priority, Task
from motido.core.scoring import calculate_score
from tests.test_fixtures import get_default_scoring_config


def _component_contrib(
    base_score: float, delta: float, weight: float, cap: float | None
) -> float:
    capped_delta = max(0.0, delta)
    if cap is not None:
        capped_delta = min(capped_delta, cap)
    return base_score * weight * capped_delta


def expected_simple_score(task: Task, config: dict) -> int:
    """Compute expected additive score for zero-age, no-due tasks."""
    base_score = config["base_score"]
    weights = config["component_weights"]
    caps = config.get("component_caps", {})

    priority_mult = float(config["priority_multiplier"].get(task.priority.name, 1.0))
    difficulty_mult = float(
        config["difficulty_multiplier"].get(task.difficulty.name, 1.0)
    )
    duration_mult = float(config["duration_multiplier"].get(task.duration.name, 1.0))

    tag_mult = 1.0
    if task.tags:
        for tag in task.tags:
            if tag in config["tag_multipliers"]:
                tag_mult *= float(config["tag_multipliers"][tag])

    project_mult = 1.0
    if task.project and task.project in config["project_multipliers"]:
        project_mult = float(config["project_multipliers"][task.project])

    total = base_score
    total += _component_contrib(
        base_score, priority_mult - 1, weights["priority"], caps.get("priority")
    )
    total += _component_contrib(
        base_score, difficulty_mult - 1, weights["difficulty"], caps.get("difficulty")
    )
    total += _component_contrib(
        base_score, duration_mult - 1, weights["duration"], caps.get("duration")
    )
    total += _component_contrib(
        base_score, tag_mult - 1, weights["tag"], caps.get("tag")
    )
    total += _component_contrib(
        base_score, project_mult - 1, weights["project"], caps.get("project")
    )
    return int(round(total))


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

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    assert score == expected_simple_score(task, config)


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

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    assert score == expected_simple_score(task, config)


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

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    assert score == expected_simple_score(task, config)


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

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    assert score == expected_simple_score(task, config)


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

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    assert score == expected_simple_score(task, config)


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

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    assert score == expected_simple_score(task, config)


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

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    assert score == expected_simple_score(task, config)


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

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    assert score == expected_simple_score(task, config)


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

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    assert score == expected_simple_score(task, config)


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

    effective_date = datetime(2025, 1, 1).date()
    score = calculate_score(task, None, config, effective_date)
    assert score == expected_simple_score(task, config)
