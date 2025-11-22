# Moti-Do
I want to create a combination todo-list / habit tracker app. I want it to be a responsive web app that can be used on mobile devices or desktop. I like the Google Material Design theme.

## Tech Stack
* **Frontend:** Up to LLM.
* **Backend:** Python Serverless Functions.
* **Database:** Vercel Postgres.
* **Goal:** A "PWA" (Progressive Web App).

For ease of testing the core logic, we will implement a command line API for all applicable features.


## Features

### Tasks and Habits
Both the notion of a task and a habit, where a habit is basically just a repeating task with some kind of score keeping.

#### Both (or rather, tasks, since a habit is an extension of a task)
  - A title
  - An optional icon/pictograph/emoji that is set automatically based on the title
  - An optional text description field, and the ability to format text it that field, and attach images
  - A start date, before which it’s hidden from the default view.
  - A due date
  - An implicit creation date field.
  - An importance field (Low, Medium, High, Defcon One)
  - A difficutly field (Trivial, Low, Medium, High, Herculean)
  - A duration field (Trivial, Short, Medium, Long, Odysseyan)
  - Depedencies on previous tasks, with a picker that lets them search and select dependencies. tasks with uncompleted prior dependencies shouldn’t show up in the default view.
  - Optional subtasks (just a simple checklist, not a complete task)
  - Optional Tagging (which should use colored labels, can have more than one)
  - Optional Projects (Which should add a colored bar to the task, max of one)
  - A history of all of the changes the user has made to that task with the ability to undo them.

#### Habits
  - Habits should basically just be a checkbox on a task. They are a special subtype of tasks.
  - If it’s a habit, it needs the [mandatory] ability to set a recurrence. 
  - For the recurrence, needs the ability to to do complex recurrences. So X number of days/weeks/months/years, etc, as well as X day of the month, last day of the month, specific days of the week, etc etc etc.
    - Also needs the ability to do recurrence "types", which would be either: always create the next instance even if the previous is not completed, create the next instance once the task is completed based on the original due date, even if the task was not completed on time, or create the next instance once the task is completed based on the completion date ()
  - Also need to be able to set how far in advance to show the habit instance: eg, the start date for a habit. this should be set as a delta rather than a specific date. So, X days before due.
  - Also for habits, need to have a heat view calendar to see how consistent they have been. And if its a task that doesn’t recur daily, they should get credit for all the days from occurence N-1 to occurence N when N is complete, and miss credit for preceeding those days if occurrence N is NOT complete.
  - For a habit that has subtasks, the ability to select how they recur. Either the task stays as one, and a new recurrence isn’t created until ALL subtasks are complete (default); or when a recurrence is scheduled but a task is only partially complete, a new parent task is created with only the subtasks that ARE complete; or a complete new task with all the subtasks is created regardless of whether the previous instance is complete or not.
  - Habits should also have stats about best streak, current streak, completion percentage, etc.

### Scoring
- I want there to be a concept of a score that is used for progress and as a sorting option for tasks.
  - Here are the factors to consider when calculating the score:
    - Each optional field that a task has should add to its score.
    - Priority should be by far the largest factor.
    - Proximity to the due date should also be a large factor, with tasks past due escalating even more quickly in priority.
    - Distance past the start date should have some additional value, but much lower than the due date proximity.
    - Task age should have a minor additional value.
    - Task difficulty, importance, and duration should all increase the value of the task, with the lowest value having no impact.
    - Next and In Progress tasks should get automatic bumps.
    - A bump proportional to the total score for all downstream dependencies of this task.
    - Habits that have streaks should get a minor bump in accordance with the length of the streak.
  - The user should be able to define custom multipliers for specific projects or tags
  - The score should be visible for each task when sorting by score.
  - When completing a task, an animation with confetti and a +<score> text should show up
  - For accumulating cumulative score:
    - Completing a task grants its current score.
    - Completing a subtask counts grants <total_task_points> / <number_of_subtasks>. Completing a parent task with subtasks grants the remaining score for that task.
    - Not completing a task by its due date should subtract the amount of points the task is currently worth. This subtraction should occur daily at the current point value.
    - The harder or longer a task is, the less of an impact the penalty for missing the deadline should have. (so even though it’s a multiplier for priority/score, it’s almost like a divisor for penalty)
    - The user should manually be able to “withdraw” points from their XP, and the app should log this.
    - The user should be able to set a scale for the XP. Basically the default value for completing a task.
  - I want this to be super configurable. I want the user to be able to configure the value/weight for these score factors.

### Other Misc Features
- One abnormal but high priority features is to process task due dates and recurrences incrementally. That is, don't just process based on the current date. Keep track of when tasks were last processed. If that is not the current date, let the user know, and add a button to advance the day, one day at a time, and anotehr to skip to a specific date. Then, process task completions and new recurrences as if it was the date that was being processed. This is very useful for people who aren't able to go through the task management every day, but are still doing tasks all the same.
- View filters for active / future / completed tasks, projects, due date, tasks that have / are dependent etc etc.
- Ability to select multiple tasks and edit fields that might be common like due date, priority, etc. In the editor, if a field is NOT changed, it should not be changed in any of the tasks. Eg if the user changes the due date for a bunch of tasks with different due dates, but does not select a priority, all of them should get the same due date, but the original priorities for all those tasks should be unmodified. 
- Sorting of tasks based on priority, size, due date, start date, etc etc.
- Notifications for when a task is due
- Calendar view of the number of tasks due on each day.
- Also want an overall calendar heat view of how productive they’ve been on past days with both task and habit completion.
- And it would be awesome if they could click on that and see what was completed during that day.
- The ability to view subtasks either hidden within the main task, as “members” in the list view beneath their parent, or as if they were top level tasks.
- Need a vacation mode to pause score calculation so users are not penalized.
- Reward badges for point thresholds, consistency milestones, etc, each with their own cool glyph.
- Dark mode / light mode with a manual setting and the ability to match the device theme
- A dependency graph view of dependencies between tasks, with filtering (eg, pick a task and you see everything in its dependency tree).


## Milestones
The tasks should be broken down more than this, but the major milestones in order are:
- 0.1: Major task functioanlity with in the command line. 
- 0.2: Score calculation (but not score keeping), and the "incremental task completion date processing" 
- 0.3: Incremental task completion
- 0.5: GUI
- 0.7: Hosted in Vercel
- 1.0: PWA working on mobile
- 1.3: Holding box for quick task adding.
- 1.5: Score keeping
- 2.0: Complex views (kanban, dependency graph, categorized task list)
- 2.5: Basic habits: Essentially just complex recurring tasks
- 3.0: Full Habits: Not just recurrences, but full habit tracking with completion percentages and heat maps and all that.
- 4.0: Other features: vacation mode, reward badges, etc.
