# tests/test_scoring_integration.py
"""
Comprehensive integration tests for the complete scoring system.
Tests realistic task scenarios with multiple scoring factors active.
"""

from datetime import date, datetime

from motido.core.models import Difficulty, Duration, Priority, Task
from motido.core.scoring import calculate_score

from .test_fixtures import get_default_scoring_config


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

    # Base: 10
    # Priority: 3.0 (DEFCON_ONE)
    # Difficulty: 3.0 (HIGH)
    # Duration: 1.2 (SHORT)
    # Age: 1.0 + (19 * 0.01) = 1.19
    # Due date: 1.0 + (5 * 0.5) = 3.5 (overdue)
    # Tags: 2.0 * 1.5 = 3.0
    # Project: 2.5
    # Score = 10 * 3.0 * 3.0 * 1.2 * 1.19 * 3.5 * 3.0 * 2.5 = 3373.65 = 3374
    assert score == 3374


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
        duration=Duration.MINISCULE,
        due_date=datetime(2025, 11, 18),  # 2 days away
        text_description="Complete the weekly status report",
        tags=["routine"],
    )

    score = calculate_score(task, None, config, effective_date)

    # Base: 10 + 5 (text_description) = 15
    # Priority: 1.2 (LOW)
    # Difficulty: 1.1 (TRIVIAL)
    # Duration: 1.05 (MINISCULE)
    # Age: 1.0 + (6 * 0.01) = 1.06
    # Due date: 1.0 + ((14 - 2) * 0.1) = 2.2 (approaching)
    # Tags: 0.8
    # Project: 1.0
    # Score = 15 * 1.2 * 1.1 * 1.05 * 1.06 * 2.2 * 0.8 * 1.0 = 38.86 = 39
    assert score == 39


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

    # Base: 10 + (42 * 0.5) = 31
    # Priority: 1.5 (MEDIUM)
    # Difficulty: 5.0 (HERCULEAN)
    # Duration: 3.0 (ODYSSEYAN)
    # Age: 1.0 + (46 * 0.01) = 1.46
    # Due date: 1.0 (beyond threshold)
    # Tags: 1.0
    # Project: 1.3
    # Score = 31 * 1.5 * 5.0 * 3.0 * 1.46 * 1.0 * 1.0 * 1.3 = 1324.05 = 1324
    assert score == 1324


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

    # Base blocker score: 10 * 1.5 * 1.5 * 1.2 * 1.06 = 28.62 = 29
    # Dependent 1 score: 10 * 2.0 * 2.0 * 1.5 * 1.01 = 60.6 = 61
    # Dependent 2 score: 10 * 2.0 * 3.0 * 2.0 * 1.02 = 122.4 = 122
    # Dependency bonus: (61 + 122) * 0.1 = 18.3 = 18
    # Total: 29 + 18 = 47
    assert score == 47


def test_minimal_task_no_multipliers() -> None:
    """Test minimal task with no optional fields (baseline score)."""
    config = get_default_scoring_config()

    effective_date = date(2025, 11, 16)
    task = Task(
        title="Simple task",
        creation_date=datetime(2025, 11, 16),
        priority=Priority.TRIVIAL,  # Use TRIVIAL (lowest priority) for baseline
        difficulty=Difficulty.TRIVIAL,
        duration=Duration.MINISCULE,
    )

    score = calculate_score(task, None, config, effective_date)

    # Base: 10
    # Priority: 1.0 (TRIVIAL)
    # Difficulty: 1.1 (TRIVIAL)
    # Duration: 1.05 (MINISCULE)
    # Age: 1.0
    # Due date: 1.0
    # Tags: 1.0
    # Project: 1.0
    # Score = 10 * 1.0 * 1.1 * 1.05 * 1.0 * 1.0 * 1.0 * 1.0 = 11.55 = 12
    assert score == 12


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

    # Base: 10 + 5 (text_description) = 15 (start date doesn't apply - overdue)
    # Priority: 2.0 (HIGH)
    # Difficulty: 3.0 (HIGH)
    # Duration: 2.0 (LONG)
    # Age: 1.0 + (19 * 0.01) = 1.19
    # Due date: 1.0 + (2 * 0.5) = 2.0 (overdue)
    # Tags: 1.8 * 1.4 = 2.52
    # Project: 1.6
    # Base score: 15 * 2.0 * 3.0 * 2.0 * 1.19 * 2.0 * 2.52 * 1.6 = 1727.31 = 1727
    # Dependent score: 10 * 1.5 * 2.0 * 1.5 * 1.02 = 45.9 = 46
    # Dependency bonus: 46 * 0.1 = 4.6 = 5
    # Total: 1727 + 5 = 1732
    assert score == 1732


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

    # Base: 10 (NO start date bonus because overdue)
    # Priority: 1.5 (MEDIUM)
    # Difficulty: 2.0 (MEDIUM)
    # Duration: 1.5 (MEDIUM)
    # Age: 1.0 + (19 * 0.01) = 1.19
    # Due date: 1.0 + (5 * 0.5) = 3.5 (overdue)
    # Score = 10 * 1.5 * 2.0 * 1.5 * 1.19 * 3.5 = 187.425 = 187
    assert score == 187


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

    # Base: 10 + (15 * 0.5) = 17.5
    # Priority: 1.5 (MEDIUM)
    # Difficulty: 2.0 (MEDIUM)
    # Duration: 1.5 (MEDIUM)
    # Age: 1.0 + (19 * 0.01) = 1.19
    # Due date: 1.0 + ((14 - 5) * 0.1) = 1.9 (approaching)
    # Score = 17.5 * 1.5 * 2.0 * 1.5 * 1.19 * 1.9 = 178.05 = 178
    assert score == 178


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
    # Base: 10 * 1.5 * 2.0 * 1.5 * 1.01 = 45.45 = 45
    assert score_c == 45

    # Task B score (C doesn't depend on B in this setup)
    score_b = calculate_score(task_b, all_tasks, config, effective_date)
    # Base: 10 * 1.5 * 2.0 * 1.5 * 1.02 = 45.9 = 46
    assert score_b == 46

    # Task A score (B depends on A)
    score_a = calculate_score(task_a, all_tasks, config, effective_date)
    # Base: 10 * 1.2 * 1.5 * 1.2 * 1.03 = 22.248 = 22
    # B's full score (with its dependencies): 46
    # Dependency bonus: 46 * 0.1 = 4.6 = 5
    # Total: 22 + 5 = 27
    assert score_a == 27


def test_disabled_scoring_features() -> None:
    """Test that disabled scoring features don't affect score."""
    config = get_default_scoring_config()
    # Disable all optional features
    config["due_date_proximity"]["enabled"] = False
    config["start_date_aging"]["enabled"] = False
    config["dependency_chain"]["enabled"] = False

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

    # Base: 10 (no start date bonus - disabled)
    # Priority: 2.0 (HIGH)
    # Difficulty: 3.0 (HIGH)
    # Duration: 2.0 (LONG)
    # Age: 1.0 + (19 * 0.01) = 1.19
    # Due date: 1.0 (disabled)
    # Dependency: 0 (disabled)
    # Score = 10 * 2.0 * 3.0 * 2.0 * 1.19 * 1.0 = 142.8 = 143
    assert score == 143
