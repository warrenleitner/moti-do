"""Tests for icon auto-generation functionality."""

from argparse import Namespace

from pytest_mock import MockerFixture

from motido.cli.main import handle_create
from motido.core.models import User
from motido.core.utils import auto_generate_icon


class TestAutoGenerateIcon:
    """Tests for the auto_generate_icon function."""

    def test_exercise_keywords(self) -> None:
        """Test exercise-related keywords."""
        assert auto_generate_icon("Daily exercise routine") == "🏃"
        assert auto_generate_icon("Go to the gym") == "🏋️"
        assert auto_generate_icon("Morning workout") == "💪"
        assert auto_generate_icon("Yoga session") == "🧘"
        assert auto_generate_icon("Meditate for 10 minutes") == "🧘"

    def test_work_keywords(self) -> None:
        """Test work-related keywords."""
        assert auto_generate_icon("Team meeting at 3pm") == "📅"
        assert auto_generate_icon("Call John about project") == "📞"
        assert auto_generate_icon("Write monthly report") == "✍️"
        assert auto_generate_icon("Review pull request") == "👀"
        assert auto_generate_icon("Email boss") == "📧"

    def test_learning_keywords(self) -> None:
        """Test learning-related keywords."""
        assert auto_generate_icon("Read a book") == "📚"
        assert auto_generate_icon("Study for exam") == "📖"
        assert auto_generate_icon("Take online course") == "🎓"
        assert auto_generate_icon("Practice coding") == "📝"

    def test_home_keywords(self) -> None:
        """Test home-related keywords."""
        assert auto_generate_icon("Clean the house") == "🧹"
        assert auto_generate_icon("Do laundry") == "👕"
        assert auto_generate_icon("Cook dinner") == "🍳"
        assert auto_generate_icon("Grocery shopping") == "🛒"

    def test_finance_keywords(self) -> None:
        """Test finance-related keywords."""
        assert auto_generate_icon("Pay bills") == "💸"
        assert auto_generate_icon("Check budget") == "💰"
        assert auto_generate_icon("Bank transfer") == "🏦"

    def test_health_keywords(self) -> None:
        """Test health-related keywords."""
        assert auto_generate_icon("Doctor appointment") == "🏥"
        assert auto_generate_icon("Dentist checkup") == "🦷"
        assert auto_generate_icon("Take vitamins") == "💊"

    def test_social_keywords(self) -> None:
        """Test social-related keywords."""
        assert auto_generate_icon("Birthday party") == "🎂"
        assert auto_generate_icon("Buy a gift") == "🎁"
        assert auto_generate_icon("Date night") == "❤️"
        assert auto_generate_icon("Coffee with friend") == "☕"

    def test_tech_keywords(self) -> None:
        """Test tech-related keywords."""
        # Keywords must be isolated to test properly
        assert auto_generate_icon("Coding session") == "💻"
        assert auto_generate_icon("Deploy to production") == "🚀"
        assert auto_generate_icon("Fix the bug") == "🔧"
        assert auto_generate_icon("Debug issue") == "🐛"
        assert auto_generate_icon("Backup files") == "💾"

    def test_travel_keywords(self) -> None:
        """Test travel-related keywords."""
        # "Book flight" matches "book" (📖) first, use specific keywords
        assert auto_generate_icon("Catch a flight") == "✈️"
        assert auto_generate_icon("Travel abroad") == "✈️"
        assert auto_generate_icon("Pack for trip") == "🧳"
        assert auto_generate_icon("Hotel reservation") == "🏨"

    def test_creative_keywords(self) -> None:
        """Test creative-related keywords."""
        assert auto_generate_icon("Design new logo") == "🎨"
        assert auto_generate_icon("Edit video") == "📹"
        # "Practice music" matches "practice" (📝) first
        assert auto_generate_icon("Listen to music") == "🎵"
        assert auto_generate_icon("Record podcast") == "🎙️"

    def test_pet_keywords(self) -> None:
        """Test pet-related keywords."""
        # "Walk the dog" matches "walk" (🚶) first
        assert auto_generate_icon("Feed the dog") == "🐕"
        assert auto_generate_icon("Feed the cat") == "🐈"
        assert auto_generate_icon("Take pet to vet") == "🐾"

    def test_plant_keywords(self) -> None:
        """Test plant-related keywords."""
        assert auto_generate_icon("Water plants") == "🌱"
        assert auto_generate_icon("Work in the garden") == "🌻"

    def test_misc_keywords(self) -> None:
        """Test misc keywords."""
        assert auto_generate_icon("Set goals for the week") == "🎯"
        # "Write in journal" matches "write" first, use journal alone
        assert auto_generate_icon("Fill in my journal") == "📓"
        assert auto_generate_icon("Morning routine") == "🌅"
        # "Evening reflection" matches "reflect" first
        assert auto_generate_icon("Quiet evening time") == "🌙"
        assert auto_generate_icon("Reflect on the day") == "💭"

    def test_no_match(self) -> None:
        """Test when no keyword matches."""
        assert auto_generate_icon("Random task xyz") is None
        assert auto_generate_icon("Something unrelated") is None
        assert auto_generate_icon("ABCD 12345") is None

    def test_case_insensitive(self) -> None:
        """Test that matching is case-insensitive."""
        assert auto_generate_icon("EXERCISE daily") == "🏃"
        assert auto_generate_icon("Morning WORKOUT") == "💪"
        assert auto_generate_icon("Read BOOK") == "📚"

    def test_multi_word_phrases_priority(self) -> None:
        """Test that multi-word phrases take priority over single words."""
        # "water plants" should match before "water"
        assert auto_generate_icon("Water plants every morning") == "🌱"
        # But "water" alone should match water emoji
        assert auto_generate_icon("Drink more water") == "💧"


class TestHandleCreateWithIcon:
    """Tests for icon auto-generation in handle_create."""

    def test_create_with_auto_icon(self, mocker: MockerFixture) -> None:
        """Test that icon is auto-generated when creating a task."""
        mock_manager = mocker.Mock()
        user = User(username="testuser")

        args = Namespace(
            title="Morning workout routine",
            priority="Low",
            difficulty="Trivial",
            duration="Minuscule",
            habit=False,
            recurrence=None,
            recurrence_type=None,
            no_auto_icon=False,
            verbose=False,
        )

        handle_create(args, mock_manager, user)

        assert len(user.tasks) == 1
        task = user.tasks[0]
        assert task.icon == "💪"  # workout -> 💪

    def test_create_with_no_auto_icon_flag(self, mocker: MockerFixture) -> None:
        """Test that --no-auto-icon disables icon generation."""
        mock_manager = mocker.Mock()
        user = User(username="testuser")

        args = Namespace(
            title="Morning workout routine",
            priority="Low",
            difficulty="Trivial",
            duration="Minuscule",
            habit=False,
            recurrence=None,
            recurrence_type=None,
            no_auto_icon=True,
            verbose=False,
        )

        handle_create(args, mock_manager, user)

        assert len(user.tasks) == 1
        task = user.tasks[0]
        assert task.icon is None

    def test_create_no_matching_icon(self, mocker: MockerFixture) -> None:
        """Test that no icon is set when no keyword matches."""
        mock_manager = mocker.Mock()
        user = User(username="testuser")

        args = Namespace(
            title="Random task xyz",
            priority="Low",
            difficulty="Trivial",
            duration="Minuscule",
            habit=False,
            recurrence=None,
            recurrence_type=None,
            no_auto_icon=False,
            verbose=False,
        )

        handle_create(args, mock_manager, user)

        assert len(user.tasks) == 1
        task = user.tasks[0]
        assert task.icon is None

    def test_create_without_no_auto_icon_attr(self, mocker: MockerFixture) -> None:
        """Test backward compatibility when no_auto_icon attr is missing."""
        mock_manager = mocker.Mock()
        user = User(username="testuser")

        # Simulate old args without no_auto_icon attribute
        args = Namespace(
            title="Daily exercise",
            priority="Low",
            difficulty="Trivial",
            duration="Minuscule",
            habit=False,
            recurrence=None,
            recurrence_type=None,
            verbose=False,
        )
        # Don't add no_auto_icon - it should default to False via getattr

        handle_create(args, mock_manager, user)

        assert len(user.tasks) == 1
        task = user.tasks[0]
        assert task.icon == "🏃"  # exercise -> 🏃
