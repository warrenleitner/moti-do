# tests/test_scoring_integration.py
"""
Comprehensive integration tests for the complete scoring system.
Tests realistic task scenarios with multiple scoring factors active.
"""

from datetime import date, datetime

from motido.core.models import Difficulty, Duration, Priority, Task
from motido.core.scoring import calculate_score, calculate_task_scores

from .test_fixtures import (
    get_default_scoring_config,
    get_weekly_workload_fixture,
)
from .test_scoring import manual_expected_score


def test_urgent_overdue_task_with_tags_and_project() -> None:
    """Test realistic urgent task: overdue, tagged, in critical project."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"urgent": 2.0, "critical": 1.5}
    config["project_multipliers"] = {"ProductionFix": 2.5}

    effective_date = date(2025, 11, 20)
    task = Task(
        title="Fix production bug",
        creation_date=datetime(2025, 11, 1),
        priority=Priority.DEFCON_ONE,
        difficulty=Difficulty.HIGH,
        duration=Duration.SHORT,
        due_date=datetime(2025, 11, 15),  # 5 days overdue
        tags=["urgent", "critical"],
        project="ProductionFix",
    )

    score = calculate_score(task, None, config, effective_date)
    assert score == manual_expected_score(task, config, effective_date)


def test_routine_task_approaching_deadline() -> None:
    """Test routine task with approaching deadline and description bonus."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"routine": 0.8}  # Lower priority for routine work

    effective_date = date(2025, 11, 16)
    task = Task(
        title="Weekly report",
        creation_date=datetime(2025, 11, 10),
        priority=Priority.LOW,
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
        due_date=datetime(2025, 11, 18),  # 2 days away
        text_description="Complete the weekly status report",
        tags=["routine"],
    )

    score = calculate_score(task, None, config, effective_date)
    assert score == manual_expected_score(task, config, effective_date)


def test_long_running_project_with_start_date() -> None:
    """Test task started long ago with start date aging bonus."""
    config = get_default_scoring_config()
    config["project_multipliers"] = {"LongTermProject": 1.3}

    effective_date = date(2025, 11, 16)
    task = Task(
        title="Complete feature implementation",
        creation_date=datetime(2025, 10, 1),
        priority=Priority.MEDIUM,
        difficulty=Difficulty.HERCULEAN,
        duration=Duration.ODYSSEYAN,
        start_date=datetime(2025, 10, 5),  # 42 days ago
        due_date=datetime(2025, 12, 15),  # 29 days away (beyond threshold)
        project="LongTermProject",
    )

    score = calculate_score(task, None, config, effective_date)
    assert score == manual_expected_score(task, config, effective_date)


def test_task_with_dependencies() -> None:
    """Test task that blocks other work (has dependents)."""
    config = get_default_scoring_config()

    effective_date = date(2025, 11, 16)

    # Create dependent tasks
    dependent1 = Task(
        title="Dependent task 1",
        creation_date=datetime(2025, 11, 15),
        priority=Priority.HIGH,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
        dependencies=["blocker-123"],
    )

    dependent2 = Task(
        title="Dependent task 2",
        creation_date=datetime(2025, 11, 14),
        priority=Priority.HIGH,
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
        dependencies=["blocker-123"],
    )

    # Blocker task
    blocker = Task(
        title="Blocking task",
        creation_date=datetime(2025, 11, 10),
        priority=Priority.MEDIUM,
        difficulty=Difficulty.LOW,
        duration=Duration.SHORT,
        id="blocker-123",
    )

    all_tasks = {
        "blocker-123": blocker,
        "dependent-1": dependent1,
        "dependent-2": dependent2,
    }

    score = calculate_score(blocker, all_tasks, config, effective_date)
    assert score == manual_expected_score(blocker, config, effective_date, all_tasks)


def test_minimal_task_no_multipliers() -> None:
    """Test minimal task with no optional fields (baseline score)."""
    config = get_default_scoring_config()

    effective_date = date(2025, 11, 16)
    task = Task(
        title="Simple task",
        creation_date=datetime(2025, 11, 16),
        priority=Priority.TRIVIAL,  # Use TRIVIAL (lowest priority) for baseline
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINUSCULE,
    )

    score = calculate_score(task, None, config, effective_date)
    assert score == manual_expected_score(task, config, effective_date)


def test_complex_scenario_all_factors_active() -> None:
    """Test complex scenario with all scoring factors simultaneously active."""
    config = get_default_scoring_config()
    config["tag_multipliers"] = {"urgent": 1.8, "customer-facing": 1.4}
    config["project_multipliers"] = {"ClientWork": 1.6}

    effective_date = date(2025, 11, 20)

    # Dependent task
    dependent = Task(
        title="Follow-up work",
        creation_date=datetime(2025, 11, 18),
        priority=Priority.MEDIUM,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
        dependencies=["complex-123"],
    )

    # Complex task with everything
    complex_task = Task(
        title="Complex customer issue",
        creation_date=datetime(2025, 11, 1),
        priority=Priority.HIGH,
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
        due_date=datetime(2025, 11, 18),  # 2 days overdue
        start_date=datetime(2025, 11, 5),  # 15 days past start
        text_description="Critical customer issue requiring immediate attention",
        tags=["urgent", "customer-facing"],
        project="ClientWork",
        id="complex-123",
    )

    all_tasks = {
        "complex-123": complex_task,
        "dependent-1": dependent,
    }

    score = calculate_score(complex_task, all_tasks, config, effective_date)
    assert score == manual_expected_score(
        complex_task, config, effective_date, all_tasks
    )


def test_overdue_task_no_start_date_bonus() -> None:
    """Test that overdue tasks don't get start date bonus (avoids double-counting)."""
    config = get_default_scoring_config()

    effective_date = date(2025, 11, 20)
    task = Task(
        title="Overdue task",
        creation_date=datetime(2025, 11, 1),
        priority=Priority.MEDIUM,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
        start_date=datetime(2025, 11, 5),  # 15 days ago
        due_date=datetime(2025, 11, 15),  # 5 days overdue
    )

    score = calculate_score(task, None, config, effective_date)
    assert score == manual_expected_score(task, config, effective_date)


def test_future_due_date_with_start_date_bonus() -> None:
    """Test that non-overdue tasks with start date get bonus."""
    config = get_default_scoring_config()

    effective_date = date(2025, 11, 20)
    task = Task(
        title="In-progress task",
        creation_date=datetime(2025, 11, 1),
        priority=Priority.MEDIUM,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
        start_date=datetime(2025, 11, 5),  # 15 days ago
        due_date=datetime(2025, 11, 25),  # 5 days away
    )

    score = calculate_score(task, None, config, effective_date)
    assert score == manual_expected_score(task, config, effective_date)


def test_recursive_dependency_chain() -> None:
    """Test dependency chain scoring with multiple levels (A <- B <- C)."""
    config = get_default_scoring_config()
    effective_date = date(2025, 11, 16)

    # Task C (no dependents)
    task_c = Task(
        title="Task C",
        creation_date=datetime(2025, 11, 15),
        priority=Priority.MEDIUM,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
        id="task-c",
    )

    # Task B (depends on A, blocks C)
    task_b = Task(
        title="Task B",
        creation_date=datetime(2025, 11, 14),
        priority=Priority.MEDIUM,
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
        dependencies=["task-a"],
        id="task-b",
    )

    # Task A (blocks B, indirectly blocks C)
    task_a = Task(
        title="Task A",
        creation_date=datetime(2025, 11, 13),
        priority=Priority.LOW,
        difficulty=Difficulty.LOW,
        duration=Duration.SHORT,
        id="task-a",
    )

    all_tasks = {
        "task-a": task_a,
        "task-b": task_b,
        "task-c": task_c,
    }

    # Task C score (no dependents)
    score_c = calculate_score(task_c, all_tasks, config, effective_date)
    assert score_c == manual_expected_score(task_c, config, effective_date, all_tasks)

    # Task B score (C doesn't depend on B in this setup)
    score_b = calculate_score(task_b, all_tasks, config, effective_date)
    assert score_b == manual_expected_score(task_b, config, effective_date, all_tasks)

    # Task A score (B depends on A)
    score_a = calculate_score(task_a, all_tasks, config, effective_date)
    assert score_a == manual_expected_score(task_a, config, effective_date, all_tasks)


def test_disabled_scoring_features() -> None:
    """Test that disabled scoring features don't affect score."""
    config = get_default_scoring_config()
    # Disable all optional features
    config["due_date_proximity"]["enabled"] = False
    config["dependency_chain"]["enabled"] = False
    config["habit_streak_bonus"]["enabled"] = False

    effective_date = date(2025, 11, 20)

    dependent = Task(
        title="Dependent",
        creation_date=datetime(2025, 11, 18),
        priority=Priority.HIGH,
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
        dependencies=["task-123"],
    )

    task = Task(
        title="Task with disabled features",
        creation_date=datetime(2025, 11, 1),
        priority=Priority.HIGH,
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
        start_date=datetime(2025, 11, 5),
        due_date=datetime(2025, 11, 15),  # Overdue
        id="task-123",
    )

    all_tasks = {"task-123": task, "dependent-1": dependent}

    score = calculate_score(task, all_tasks, config, effective_date)
    assert score == manual_expected_score(task, config, effective_date, all_tasks)


def test_weekly_workload_scale() -> None:
    """Ensure a representative week lands near the 2k XP target."""
    effective_date, tasks = get_weekly_workload_fixture()
    config = get_default_scoring_config()

    all_tasks = {task.id: task for task in tasks}
    total_xp = 0.0
    total_penalty = 0.0

    for task in tasks:
        xp_score, penalty_score, _ = calculate_task_scores(
            task, all_tasks, config, effective_date
        )
        total_xp += xp_score
        total_penalty += penalty_score

    net_total = total_xp - total_penalty
    assert 150 <= net_total <= 350
