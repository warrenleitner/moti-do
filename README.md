# Moti-Do

Moti-Do is a responsive web app that combines a todo-list and habit tracker. It is designed to be used on both mobile devices and desktop, following the Google Material Design theme. The app executes entirely on the client side, with the possibility of future native app development.

## Features

### Tasks
- Create tasks with the following properties:
  - Title
  - Optional icon/pictograph/emoji set automatically based on the title
  - Optional text description field with formatting and image attachment
  - Start date (hidden from default view before this date)
  - Due date
  - Implicit creation date field
  - Importance (Low, Medium, High, Defcon One)
  - Difficulty (Trivial, Low, Medium, High, Herculean)
  - Duration (Trivial, Short, Medium, Long, Odysseyan)
  - Dependencies on previous tasks with a search and select picker
  - Optional subtasks
  - Optional tagging with colored text
  - Optional projects with colored bar
  - Ability to flag one task as "next"
  - Ability to flag tasks as "in progress"
  - History of changes with undo functionality

### Habits
- Habits are a special subtype of tasks with the following additional properties:
  - Recurrence with complex options (e.g., X number of days/weeks/months/years, specific days of the week, etc.)
  - Start date delta for showing habits in advance
  - Heat view calendar for consistency tracking
  - Credit for days between occurrences if completed
  - Subtasks recurrence options
  - Stats for best streak, current streak, completion percentage, etc.

### Scoring
- Task scoring factors:
  - Each optional field adds to the score
  - Priority is the largest factor
  - Proximity to due date is a large factor
  - Distance past start date has some value
  - Task age has minor value
  - Difficulty, importance, and duration increase value
  - Next and In Progress tasks get automatic bumps
  - Bump proportional to total score of downstream dependencies
  - Habits with streaks get a minor bump
  - Custom multipliers for specific projects or tags
- Score visibility and animations for task completion
- Cumulative score management:
  - Completing a task grants its current score
  - Completing a subtask grants a portion of the total task points
  - Not completing a task by its due date subtracts points daily
  - Penalty for missing deadlines is lower for harder or longer tasks
  - Manual XP withdrawal with logging
  - Configurable value/weight for score factors

### Views and Filters
- View filters for active, future, and completed tasks, projects, due dates, dependencies, etc.
- Multi-task editing for common fields
- Task sorting by priority, size, due date, start date, etc.
- Notifications for due tasks
- Calendar view of tasks due on each day
- Overall calendar heat view of productivity with task and habit completion
- Clickable heat view for viewing completed tasks on specific days
- Subtask viewing options (hidden, list view, top-level tasks)
- Vacation mode to pause score calculation
- Reward badges for point thresholds and consistency milestones
- Dark mode/light mode with manual setting and device theme matching
- Dependency graph view with filtering
- Local file data storage and syncing with future E2E encryption support

## Setup and Running

1. Clone the repository:
   ```bash
   git clone https://github.com/warrenleitner/moti-do.git
   cd moti-do
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Open the app in your browser:
   ```
   http://localhost:3000
   ```

## Contributing

We welcome contributions to the Moti-Do project! To contribute, please follow these steps:

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Make your changes and commit them with descriptive messages.
4. Push your changes to your fork.
5. Create a pull request to the main repository.

Please ensure that your code follows our coding standards and includes tests for any new functionality.

Thank you for contributing to Moti-Do!
