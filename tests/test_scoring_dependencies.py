"""Tests for dependency chain scoring functionality."""

# pylint: disable=duplicate-code,too-many-lines

from datetime import date, datetime

import pytest

from motido.core.models import Difficulty, Duration, Task
from motido.core.scoring import calculate_dependency_chain_bonus, calculate_score
from tests.test_fixtures import get_default_scoring_config


def test_calculate_dependency_chain_bonus_no_dependents() -> None:
    """Test that dependency chain bonus returns 0.0 when task has no dependents."""
    task = Task(
        title="Independent task",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
    )
    all_tasks = {task.id: task}
    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    bonus = calculate_dependency_chain_bonus(task, all_tasks, config, effective_date)

    assert bonus == 0.0


def test_calculate_dependency_chain_bonus_disabled() -> None:
    """Test that dependency chain bonus returns 0.0 when feature is disabled."""
    task_a = Task(
        title="Task A",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
    )
    task_b = Task(
        title="Task B (depends on A)",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        dependencies=[task_a.id],
    )
    all_tasks = {task_a.id: task_a, task_b.id: task_b}
    config = get_default_scoring_config()
    config["dependency_chain"]["enabled"] = False
    effective_date = date(2025, 1, 15)

    bonus = calculate_dependency_chain_bonus(task_a, all_tasks, config, effective_date)

    assert bonus == 0.0


def test_calculate_dependency_chain_bonus_single_dependent() -> None:
    """Test dependency chain bonus with one dependent task."""
    task_a = Task(
        title="Task A",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        difficulty=Difficulty.MEDIUM,
        duration=Duration.MEDIUM,
    )
    task_b = Task(
        title="Task B (depends on A)",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
        dependencies=[task_a.id],
    )
    all_tasks = {task_a.id: task_a, task_b.id: task_b}
    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    # Calculate task_b score first (for reference)
    task_b_score = calculate_score(task_b, all_tasks, config, effective_date)

    # Task A should get 10% of task_b's score as bonus
    bonus = calculate_dependency_chain_bonus(task_a, all_tasks, config, effective_date)

    expected_bonus = task_b_score * 0.1
    assert bonus == pytest.approx(expected_bonus)


def test_calculate_dependency_chain_bonus_multiple_dependents() -> None:
    """Test dependency chain bonus with multiple dependent tasks."""
    task_a = Task(
        title="Task A",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
    )
    task_b = Task(
        title="Task B (depends on A)",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        difficulty=Difficulty.HIGH,
        dependencies=[task_a.id],
    )
    task_c = Task(
        title="Task C (depends on A)",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        duration=Duration.LONG,
        dependencies=[task_a.id],
    )
    all_tasks = {task_a.id: task_a, task_b.id: task_b, task_c.id: task_c}
    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    # Calculate scores for dependents
    task_b_score = calculate_score(task_b, all_tasks, config, effective_date)
    task_c_score = calculate_score(task_c, all_tasks, config, effective_date)

    # Task A should get 10% of sum of task_b and task_c scores
    bonus = calculate_dependency_chain_bonus(task_a, all_tasks, config, effective_date)

    expected_bonus = (task_b_score + task_c_score) * 0.1
    assert bonus == pytest.approx(expected_bonus)


def test_calculate_dependency_chain_bonus_completed_dependent_excluded() -> None:
    """Test that completed dependent tasks don't contribute to bonus."""
    task_a = Task(
        title="Task A",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
    )
    task_b = Task(
        title="Task B (depends on A)",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        difficulty=Difficulty.HIGH,
        dependencies=[task_a.id],
        is_complete=True,  # Completed
    )
    all_tasks = {task_a.id: task_a, task_b.id: task_b}
    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    # Task A should get no bonus (task_b is complete)
    bonus = calculate_dependency_chain_bonus(task_a, all_tasks, config, effective_date)

    assert bonus == 0.0


def test_calculate_dependency_chain_bonus_recursive() -> None:
    """Test recursive dependency chain: A <- B <- C (C depends on B, B depends on A)."""
    task_a = Task(
        title="Task A",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        difficulty=Difficulty.LOW,
    )
    task_b = Task(
        title="Task B (depends on A)",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        difficulty=Difficulty.MEDIUM,
        dependencies=[task_a.id],
    )
    task_c = Task(
        title="Task C (depends on B)",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        difficulty=Difficulty.HIGH,
        dependencies=[task_b.id],
    )
    all_tasks = {task_a.id: task_a, task_b.id: task_b, task_c.id: task_c}
    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    # Task B's full score already includes 10% of task C's score
    task_b_full_score = calculate_score(task_b, all_tasks, config, effective_date)

    # Task A should get 10% of task B's full score (including B's dependency bonus from C)
    bonus_a = calculate_dependency_chain_bonus(
        task_a, all_tasks, config, effective_date
    )

    expected_bonus_a = task_b_full_score * 0.1
    assert bonus_a == pytest.approx(expected_bonus_a, rel=1e-5)


def test_calculate_dependency_chain_bonus_circular_dependency() -> None:
    """Test that circular dependencies raise ValueError."""
    task_a = Task(
        title="Task A",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
    )
    task_b = Task(
        title="Task B",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
    )
    # Create circular dependency: A depends on B, B depends on A
    task_a.dependencies = [task_b.id]
    task_b.dependencies = [task_a.id]

    all_tasks = {task_a.id: task_a, task_b.id: task_b}
    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    # Should raise ValueError when trying to calculate score for either task
    with pytest.raises(ValueError, match="Circular dependency detected"):
        calculate_dependency_chain_bonus(task_a, all_tasks, config, effective_date)


def test_calculate_dependency_chain_bonus_custom_percentage() -> None:
    """Test dependency chain bonus with custom percentage (20%)."""
    task_a = Task(
        title="Task A",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
    )
    task_b = Task(
        title="Task B (depends on A)",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
        dependencies=[task_a.id],
    )
    all_tasks = {task_a.id: task_a, task_b.id: task_b}
    config = get_default_scoring_config()
    config["dependency_chain"]["dependent_score_percentage"] = 0.2  # 20%
    effective_date = date(2025, 1, 15)

    # Calculate task_b score
    task_b_score = calculate_score(task_b, all_tasks, config, effective_date)

    # Task A should get 20% of task_b's score
    bonus = calculate_dependency_chain_bonus(task_a, all_tasks, config, effective_date)

    expected_bonus = task_b_score * 0.2
    assert bonus == pytest.approx(expected_bonus)


def test_calculate_score_with_dependency_chain_integration() -> None:
    """Integration test: calculate_score includes dependency chain bonus."""
    task_a = Task(
        title="Task A",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        difficulty=Difficulty.LOW,
        duration=Duration.SHORT,
    )
    task_b = Task(
        title="Task B (depends on A)",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
        difficulty=Difficulty.HIGH,
        duration=Duration.LONG,
        dependencies=[task_a.id],
    )
    all_tasks = {task_a.id: task_a, task_b.id: task_b}
    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    # Calculate task A score with dependencies
    task_a_score_with_deps = calculate_score(task_a, all_tasks, config, effective_date)

    # Calculate task A score without dependencies (for comparison)
    task_a_score_without_deps = calculate_score(task_a, None, config, effective_date)

    # Task A score with dependencies should be higher
    assert task_a_score_with_deps > task_a_score_without_deps


def test_calculate_dependency_chain_bonus_self_dependency_prevention() -> None:
    """Test that a task cannot depend on itself (should raise error)."""
    task_a = Task(
        title="Task A",
        creation_date=datetime(2025, 1, 1, 12, 0, 0),
    )
    # Task depends on itself
    task_a.dependencies = [task_a.id]

    all_tasks = {task_a.id: task_a}
    config = get_default_scoring_config()
    effective_date = date(2025, 1, 15)

    # Should raise ValueError for circular dependency
    with pytest.raises(ValueError, match="Circular dependency detected"):
        calculate_dependency_chain_bonus(task_a, all_tasks, config, effective_date)
