import json
from typing import List, Optional, Dict, Any, DefaultDict, Union
import sys
from collections import defaultdict

class Category:
    def __init__(self,
                 _id: str, # Unique ID
                 title: str, # The category/project's title, like "Work".
                 parentId: str, # ID of parent project or category, or "unassigned" or "root".
                 createdAt: int, # Date.now() when created.
                 updatedAt: Optional[int] = None, # Date.now() when updated.
                 done: Optional[bool] = None, # Whether the project has been marked as done.
                 doneDate: Optional[str] = None, # If done, then this was the date the project/subproject was finished.
                 color: Optional[str] = None, # Color chosen by clicking icon in master list "#222222" (rrggbb).
                 icon: Optional[str] = None, # Icon chosen by clicking icon in master list.
                 note: Optional[str] = None, # note for "notes" strategy.
                 db: str = "Categories", # Database identifier
                 fieldUpdates: Optional[Dict] = None # Original field, kept for compatibility.
                 ):
        self._id = _id
        self.title = title
        self.parentId = parentId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.done = done
        self.doneDate = doneDate
        self.color = color
        self.icon = icon
        self.note = note
        self.db = db
        self.fieldUpdates = fieldUpdates

    def __repr__(self):
        return f"Category(title='{self.title}', _id='{self._id}')"


class Subtask:
    """Represents a subtask within a Task."""
    def __init__(self,
                 _id: str, # The subtask's unique ID.
                 title: str, # The subtask title.
                 done: bool = False, # Whether the subtask is complete.
                 rank: Optional[int] = None, # Rank within parent task.
                 **kwargs # Catch any unexpected fields
                 ):
        self._id = _id
        self.title = title
        self.done = done
        self.rank = rank
        self.extra_data = kwargs # Store unexpected fields

    def __repr__(self):
        return f"Subtask(title='{self.title}', _id='{self._id}', done={self.done})"


class Task:
    def __init__(self,
                 _id: str, # The task's unique ID.
                 createdAt: int, # Date.now() when the task was created.
                 title: str, # The task's title.
                 parentId: str, # ID of parent project/category, or "unassigned".
                 updatedAt: Optional[int] = None, # Date.now() when the task was last updated.
                 dueDate: Optional[str] = None, # Due date "YYYY-MM-DD" or null.
                 startDate: Optional[str] = None, # Start date "YYYY-MM-DD" or null.
                 endDate: Optional[str] = None, # End date (soft deadline) "YYYY-MM-DD" or null.
                 done: bool = False, # True if this task has been completed.
                 doneAt: Optional[int] = None, # When this task was completed (Date.now()).
                 duration: Optional[int] = None, # How long the user worked on this task (in ms).
                 times: Optional[List[int]] = None, # Array of Date.now() for time tracking start/stop.
                 isStarred: Optional[Union[bool, int]] = None, # Priority: 3=red, 2=orange, 1=yellow.
                 isFrogged: Optional[int] = None, # EatThatFrog: 1=normal, 2=baby, 3=monster.
                 recurring: Optional[bool] = None, # True if generated via a recurring task.
                 recurringTaskId: Optional[str] = None, # The recurring task ID that generated this task.
                 subtasks: Optional[Dict[str, Subtask]] = None, # ID => Subtask object.
                 labelIds: Optional[List[str]] = None, # IDs of assigned labels.
                 timeEstimate: Optional[int] = None, # Estimated time in ms.
                 note: Optional[str] = None, # Task note.
                 dependsOn: Optional[Dict[str, bool]] = None, # ID => true. Dependencies.
                 backburner: Optional[bool] = None, # True if created in backburner without inheriting status.
                 generatedAt: Optional[int] = None, # Date.now() when created as a recurring task instance.
                 echoedAt: Optional[int] = None, # Date.now() when created by "repeat after X days".
                 deletedAt: Optional[int] = None, # Date.now() when added to trash.
                 restoredAt: Optional[int] = None, # Date.now() when restored from trash.
                 rewardPoints: Optional[int] = None, # Reward points awarded by this task.
                 taskTime: Optional[str] = None, # "HH:mm" time extracted from title.
                 reminderOffset: Optional[int] = None, # Reminder offset in minutes.
                 reminderTime: Optional[int] = None, # Unix timestamp (seconds) of the first reminder.
                 db: str = "Tasks", # Database identifier
                 field_updates: Optional[Dict] = None # Original field: fieldUpdates
                 ):
        self._id = _id
        self.createdAt = createdAt
        self.title = title
        self.parentId = parentId
        self.updatedAt = updatedAt
        self.dueDate = dueDate
        self.startDate = startDate
        self.endDate = endDate
        self.done = done
        self.doneAt = doneAt
        self.duration = duration
        self.times = times
        self.isStarred = isStarred
        self.isFrogged = isFrogged
        self.recurring = recurring
        self.recurringTaskId = recurringTaskId
        # Process subtasks dictionary if provided
        if subtasks and isinstance(subtasks, dict):
            self.subtasks = {k: Subtask(**v) if isinstance(v, dict) else v for k, v in subtasks.items()}
        else:
            self.subtasks = subtasks # Allow None or already processed objects
        self.labelIds = labelIds
        self.timeEstimate = timeEstimate
        self.note = note
        self.dependsOn = dependsOn
        self.backburner = backburner
        self.generatedAt = generatedAt
        self.echoedAt = echoedAt
        self.deletedAt = deletedAt
        self.restoredAt = restoredAt
        self.rewardPoints = rewardPoints
        self.taskTime = taskTime
        self.reminderOffset = reminderOffset
        self.reminderTime = reminderTime
        self.db = db
        self.fieldUpdates = field_updates # Keep original field name

    def __repr__(self):
        return f"Task(title='{self.title}', _id='{self._id}', done={self.done})"

class RecurringTask:
    def __init__(self,
                 _id: str, # Unique ID
                 type: str, # Recurrence rule type.
                 createdAt: int, # Date.now() when created.
                 day: Optional[int] = None, # "weekly" only: Day of week (0=Sunday).
                 date: Optional[int] = None, # "monthly" only: Date of month.
                 weekDays: Optional[List[int]] = None, # "n per week" only: Days of week (0=Sunday).
                 repeat: Optional[int] = None, # Frequency for "repeat" types.
                 repeatStart: Optional[str] = None, # "repeat", "repeat X" only: Start date "YYYY-MM-DD".
                 limitToWeekdays: Optional[bool] = None, # "monthly", "repeat month" only: Schedule on weekdays only.
                 dueIn: Optional[int] = None, # recurringType="project" only: Due date offset in days.
                 echoDays: Optional[int] = None, # "echo" only: Days after completion to schedule next.
                 customRecurrence: Optional[str] = None, # Human-readable rrule string.
                 db: str = "RecurringTasks", # Database identifier
                 updated_at: Optional[int] = None, # Original field
                 field_updates: Optional[Dict] = None, # Original field
                 end_in: Optional[int] = None # Original field
                 ):
        self._id = _id
        self.type = type
        self.createdAt = createdAt
        self.day = day
        self.date = date
        self.weekDays = weekDays
        self.repeat = repeat
        self.repeatStart = repeatStart
        self.limitToWeekdays = limitToWeekdays
        self.dueIn = dueIn
        self.echoDays = echoDays
        self.customRecurrence = customRecurrence
        self.db = db
        self.updatedAt = updated_at # Keep original name map
        self.fieldUpdates = field_updates # Keep original name map
        self.endIn = end_in # Keep original name map

    def __repr__(self):
        return f"RecurringTask(type='{self.type}', _id='{self._id}')"


class Habit:
    def __init__(self,
                 _id: str, # The habit's unique ID.
                 title: str, # The habit's title.
                 isPositive: bool, # If true, aim for >= target; otherwise <= target.
                 recordType: str, # Value type: "boolean" or "number".
                 createdAt: int, # Date.now() when created.
                 note: Optional[str] = None, # Rich text note.
                 color: Optional[str] = None, # Color used for icon, etc.
                 parentId: Optional[str] = None, # ID of parent project/category, or "unassigned".
                 labelIds: Optional[List[str]] = None, # IDs of assigned labels.
                 isStarred: Optional[int] = None, # Can be starred.
                 isFrogged: Optional[int] = None, # Can be frogged.
                 timeEstimate: Optional[int] = None, # Estimated duration (in ms) to perform once.
                 startDate: Optional[str] = None, # Start tracking date "YYYY-MM-DD" or null.
                 endDate: Optional[str] = None, # Stop tracking date "YYYY-MM-DD" or null.
                 units: Optional[str] = None, # Custom units (e.g., "miles").
                 period: Optional[str] = None, # Time period: "day", "week", "month", "quarter", or "year".
                 target: Optional[int] = None, # Target number for the period.
                 askOn: Optional[List[int]] = None, # Days of week (0=Sun) to show in day view.
                 time: Optional[str] = None, # Time "HH:mm" shown in the calendar.
                 showAfterSuccess: Optional[bool] = None, # If false, hide in day view after hitting period target.
                 showAfterRecord: Optional[bool] = None, # If false, hide in day view after recording once in a day.
                 done: Optional[bool] = None, # Marked as done/archived by the user.
                 history: Optional[List[Union[int, float, str]]] = None, # Array of [time1, val1, time2, val2, ...].
                 dismissed: Optional[str] = None, # Date ("YYYY-MM-DD") when last dismissed for the day.
                 db: str = "Habits", # Database identifier
                 field_updates: Optional[Dict] = None, # Original field
                 updated_at: Optional[int] = None # Original field
                 ):
        self._id = _id
        self.title = title
        self.isPositive = isPositive
        self.recordType = recordType
        self.createdAt = createdAt
        self.note = note
        self.color = color
        self.parentId = parentId
        self.labelIds = labelIds
        self.isStarred = isStarred
        self.isFrogged = isFrogged
        self.timeEstimate = timeEstimate
        self.startDate = startDate
        self.endDate = endDate
        self.units = units
        self.period = period
        self.target = target
        self.askOn = askOn
        self.time = time
        self.showAfterSuccess = showAfterSuccess
        self.showAfterRecord = showAfterRecord
        self.done = done
        self.history = history
        self.dismissed = dismissed
        self.db = db
        self.fieldUpdates = field_updates # Keep original name map
        self.updatedAt = updated_at # Keep original name map

    def __repr__(self):
        return f"Habit(title='{self.title}', _id='{self._id}')"

# Classes omitted as requested:
# GoalSection, Challenge, CheckInQuestion, Goal, DayItem, ProfileItem, LocalStorageItem 