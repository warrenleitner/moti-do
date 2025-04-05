import json
from typing import List, Optional, Dict, Any, DefaultDict, Union
import sys
from collections import defaultdict

class Category:
    def __init__(self,
                 _id: str, # Unique ID
                 title: str, # The category/project's title, like "Work".
                 type: str, # Either "project" or "category".
                 parentId: str, # ID of parent project or category, or "unassigned" or "root".
                 createdAt: int, # Date.now() when created. Not in JSDoc, but present in original code. Kept for consistency.
                 updatedAt: Optional[int] = None, # Date.now() when updated. This includes adding a task.
                 workedOnAt: Optional[int] = None, # Date.now() when last worked on. That means completing a task within it.
                 rank: Optional[int] = None, # Sort rank within parent.
                 dayRank: Optional[int] = None, # Sort rank within day.
                 day: Optional[str] = None, # Schedule date or null/undefined/unassigned. Only projects can be scheduled.
                 firstScheduled: Optional[str] = None, # Which day the project was first assigned to, formatted as "YYYY-MM-DD" or "unassigned".
                 dueDate: Optional[str] = None, # Date when project is due, formatted as "YYYY-MM-DD".
                 labelIds: Optional[List[str]] = None, # The IDs of labels assigned to the Project.
                 timeEstimate: Optional[int] = None, # How long the user thinks the project will take, in ms.
                 startDate: Optional[str] = None, # When this project can be started, formatted as "YYYY-MM-DD".
                 endDate: Optional[str] = None, # When this project should be completed (soft deadline), formatted as "YYYY-MM-DD".
                 plannedWeek: Optional[str] = None, # Which week the task is planned for. Date of the Monday of the week (Mon-Sun) "YYYY-MM-DD".
                 plannedMonth: Optional[str] = None, # Which month the task is planned for. "YYYY-MM".
                 sprintId: Optional[str] = None, # The project's sprint. Not used yet.
                 done: Optional[bool] = None, # Whether the project has been marked as done.
                 doneDate: Optional[str] = None, # If done, then this was the date the project/subproject was finished.
                 priority: Optional[str] = None, # Project only: one of "low", "mid", or "high".
                 color: Optional[str] = None, # Color chosen by clicking icon in master list "#222222" (rrggbb).
                 icon: Optional[str] = None, # Icon chosen by clicking icon in master list.
                 note: Optional[str] = None, # note for "notes" strategy.
                 recurring: Optional[bool] = None, # True if it's a recurring project.
                 recurringTaskId: Optional[str] = None, # ID of RecurringTask creator.
                 echo: Optional[bool] = None, # True if created by RecurringTask with type="echo".
                 isFrogged: Optional[int] = None, # True if this project has been frogged for eatThatFrog. 1=normal, 2=baby, 3=monster.
                 reviewDate: Optional[str] = None, # Date when user wants to review a project.
                 marvinPoints: Optional[int] = None, # How many kudos you got for this project. Always 500.
                 mpNotes: Optional[List[str]] = None, # Notes on how Marvin awarded you kudos when you completed the project. Always ["PROJECT"].
                 db: str = "Categories", # Database identifier
                 masterRank: Optional[int] = None, # Original field, not in JSDoc. Kept for compatibility.
                 fieldUpdates: Optional[Dict] = None # Original field, not in JSDoc. Kept for compatibility.
                 ):
        self._id = _id
        self.title = title
        self.type = type
        self.parentId = parentId
        self.createdAt = createdAt # Keeping original field
        self.updatedAt = updatedAt
        self.workedOnAt = workedOnAt
        self.rank = rank
        self.dayRank = dayRank
        self.day = day
        self.firstScheduled = firstScheduled
        self.dueDate = dueDate
        self.labelIds = labelIds
        self.timeEstimate = timeEstimate
        self.startDate = startDate
        self.endDate = endDate
        self.plannedWeek = plannedWeek
        self.plannedMonth = plannedMonth
        self.sprintId = sprintId
        self.done = done
        self.doneDate = doneDate
        self.priority = priority
        self.color = color
        self.icon = icon
        self.note = note
        self.recurring = recurring
        self.recurringTaskId = recurringTaskId
        self.echo = echo
        self.isFrogged = isFrogged
        self.reviewDate = reviewDate
        self.marvinPoints = marvinPoints
        self.mpNotes = mpNotes
        self.db = db
        self.masterRank = masterRank # Keeping original field
        self.fieldUpdates = fieldUpdates # Keeping original field

    def __repr__(self):
        return f"Category(title='{self.title}', _id='{self._id}', type='{self.type}')"

class Task:
    def __init__(self,
                 _id: str, # The task's unique ID.
                 createdAt: int, # Date.now() when the task was created.
                 title: str, # The task's title.
                 parentId: str, # ID of parent project/category, or "unassigned".
                 day: Optional[str] = None, # Scheduled day "YYYY-MM-DD" or "unassigned". Guaranteed "YYYY-MM-DD" if done.
                 firstScheduled: Optional[str] = None, # First scheduled day "YYYY-MM-DD" or "unassigned".
                 updatedAt: Optional[int] = None, # Date.now() when the task was last updated.
                 workedOnAt: Optional[int] = None, # Date.now() when the task was last worked on.
                 dueDate: Optional[str] = None, # Due date "YYYY-MM-DD" or null.
                 startDate: Optional[str] = None, # Start date "YYYY-MM-DD" or null.
                 endDate: Optional[str] = None, # End date (soft deadline) "YYYY-MM-DD" or null.
                 plannedWeek: Optional[str] = None, # Planned week (Monday's date "YYYY-MM-DD").
                 plannedMonth: Optional[str] = None, # Planned month "YYYY-MM".
                 sprintId: Optional[str] = None, # The task's sprint, null if nothing.
                 rank: Optional[int] = None, # Sort order in the day view.
                 masterRank: Optional[int] = None, # Sort order within the master list.
                 done: bool = False, # True if this task has been completed.
                 completedAt: Optional[int] = None, # Date.now() when this task was completed. Not in JSDoc, but logical. Added based on context.
                 doneAt: Optional[int] = None, # When this task was completed (Date.now()).
                 duration: Optional[int] = None, # How long the user worked on this task (in ms). Only set when done (as of 1.18.0).
                 times: Optional[List[int]] = None, # Array of Date.now() for time tracking start/stop. [start1, stop1, start2, stop2,...]
                 firstTracked: Optional[int] = None, # When this task was first tracked (Date.now()).
                 isReward: Optional[bool] = None, # True if this task is a reward task.
                 isStarred: Optional[Union[bool, int]] = None, # Priority: 3=red, 2=orange, 1=yellow (or true from old version).
                 isFrogged: Optional[int] = None, # EatThatFrog: 1=normal, 2=baby, 3=monster.
                 isPinned: Optional[bool] = None, # Whether this task is pinned to the master list.
                 pinId: Optional[str] = None, # The pinned task ID this task was copied from.
                 recurring: Optional[bool] = None, # True if generated via a recurring task.
                 recurringTaskId: Optional[str] = None, # The recurring task ID that generated this task.
                 echo: Optional[bool] = None, # True if this is an "echo" task.
                 echoId: Optional[str] = None, # ID of task used to create this echo task.
                 link: Optional[str] = None, # System-created task links (e.g., "/braindump").
                 subtasks: Optional[Dict[str, Subtask]] = None, # ID => Subtask object.
                 colorBar: Optional[str] = None, # One of null, "red", "yellow", "green" or "blue". No longer used.
                 labelIds: Optional[List[str]] = None, # IDs of assigned labels.
                 timeEstimate: Optional[int] = None, # Estimated time in ms.
                 note: Optional[str] = None, # Task note.
                 email: Optional[str] = None, # Email HTML used to create note.
                 dailySection: Optional[str] = None, # Section in dailyStructure: "Morning", "Afternoon", or "Evening".
                 bonusSection: Optional[str] = None, # Section in bonusStructure: "Bonus" or "Essential".
                 customSection: Optional[str] = None, # Section ID from customStructure.
                 timeBlockSection: Optional[str] = None, # Section ID from plannerStructure (time block ID).
                 dependsOn: Optional[Dict[str, bool]] = None, # ID => true. Dependencies.
                 backburner: Optional[bool] = None, # True if created in backburner without inheriting status.
                 reviewDate: Optional[str] = None, # Date to review task "YYYY-MM-DD".
                 itemSnoozeTime: Optional[int] = None, # Date.now() until when task is snoozed.
                 permaSnoozeTime: Optional[str] = None, # Time "HH:mm" until when task is snoozed (persists on reschedule).
                 calId: Optional[str] = None, # ID of associated calendar.
                 calURL: Optional[str] = None, # Unique URL of this task in the calendar.
                 etag: Optional[str] = None, # Calendar etag for updates.
                 calData: Optional[str] = None, # Calendar data string.
                 generatedAt: Optional[int] = None, # Date.now() when created as a recurring task instance.
                 echoedAt: Optional[int] = None, # Date.now() when created by "repeat after X days" completion/deletion.
                 deletedAt: Optional[int] = None, # Date.now() when added to trash.
                 restoredAt: Optional[int] = None, # Date.now() when restored from trash.
                 onboard: Optional[bool] = None, # True if an onboarding task created by Marvin.
                 imported: Optional[bool] = None, # True if imported via Importer.
                 # Gamification
                 marvinPoints: Optional[int] = None, # Kudos awarded for this task.
                 mpNotes: Optional[List[str]] = None, # Notes on how kudos were awarded.
                 rewardPoints: Optional[int] = None, # Reward points awarded by this task.
                 rewardId: Optional[str] = None, # ID of attached reward earned on completion.
                 # Goals - Using generic dicts as keys are dynamic (GOALID)
                 g_in: Optional[Dict[str, bool]] = None, # g_in_GOALID: True if task is in goal GOALID.
                 g_sec: Optional[Dict[str, str]] = None, # g_sec_GOALID: Section/phase ID of goal GOALID.
                 g_rank: Optional[Dict[str, int]] = None, # g_rank_GOALID: Rank within goal section.
                 # New Reminder Format
                 taskTime: Optional[str] = None, # "HH:mm" time extracted from title.
                 reminderOffset: Optional[int] = None, # Reminder offset in minutes.
                 reminderTime: Optional[int] = None, # Unix timestamp (seconds) of the first reminder.
                 snooze: Optional[int] = None, # Snooze duration in minutes.
                 autoSnooze: Optional[bool] = None, # Whether to autoSnooze.
                 # Old Reminder Format
                 remindAt: Optional[str] = None, # Reminder time "YYYY-MM-DD HH:mm".
                 reminder: Optional[Dict] = None, # How remindAt was chosen {time: str, diff: int}.
                 db: str = "Tasks", # Database identifier
                 # Fields from original code not explicitly in JSDoc, kept for compatibility
                 section_id: Optional[str] = None, # Original field: sectionId
                 field_updates: Optional[Dict] = None, # Original field: fieldUpdates
                 acked_start_date: Optional[bool] = None # Original field: ackedStartDate
                 ):
        self._id = _id
        self.createdAt = createdAt
        self.title = title
        self.parentId = parentId
        self.day = day
        self.firstScheduled = firstScheduled
        self.updatedAt = updatedAt
        self.workedOnAt = workedOnAt
        self.dueDate = dueDate
        self.startDate = startDate
        self.endDate = endDate
        self.plannedWeek = plannedWeek
        self.plannedMonth = plannedMonth
        self.sprintId = sprintId
        self.rank = rank
        self.masterRank = masterRank
        self.done = done
        self.completedAt = completedAt # Assigning added field
        self.doneAt = doneAt
        self.duration = duration
        self.times = times
        self.firstTracked = firstTracked
        self.isReward = isReward
        self.isStarred = isStarred
        self.isFrogged = isFrogged
        self.isPinned = isPinned
        self.pinId = pinId
        self.recurring = recurring
        self.recurringTaskId = recurringTaskId
        self.echo = echo
        self.echoId = echoId
        self.link = link
        # Process subtasks dictionary if provided
        if subtasks and isinstance(subtasks, dict):
            self.subtasks = {k: Subtask(**v) if isinstance(v, dict) else v for k, v in subtasks.items()}
        else:
            self.subtasks = subtasks # Allow None or already processed objects
        self.colorBar = colorBar
        self.labelIds = labelIds
        self.timeEstimate = timeEstimate
        self.note = note
        self.email = email
        self.dailySection = dailySection
        self.bonusSection = bonusSection
        self.customSection = customSection
        self.timeBlockSection = timeBlockSection
        self.dependsOn = dependsOn
        self.backburner = backburner
        self.reviewDate = reviewDate
        self.itemSnoozeTime = itemSnoozeTime
        self.permaSnoozeTime = permaSnoozeTime
        self.calId = calId
        self.calURL = calURL
        self.etag = etag
        self.calData = calData
        self.generatedAt = generatedAt
        self.echoedAt = echoedAt
        self.deletedAt = deletedAt
        self.restoredAt = restoredAt
        self.onboard = onboard
        self.imported = imported # Renamed from imported_flag
        # Gamification
        self.marvinPoints = marvinPoints
        self.mpNotes = mpNotes
        self.rewardPoints = rewardPoints
        self.rewardId = rewardId
        # Goals
        self.g_in = g_in
        self.g_sec = g_sec
        self.g_rank = g_rank
        # New Reminder Format
        self.taskTime = taskTime
        self.reminderOffset = reminderOffset
        self.reminderTime = reminderTime
        self.snooze = snooze
        self.autoSnooze = autoSnooze
        # Old Reminder Format
        self.remindAt = remindAt
        self.reminder = reminder
        self.db = db
        # Original fields
        self.sectionId = section_id # Mapping original snake_case to camelCase attribute
        self.fieldUpdates = field_updates # Mapping original snake_case to camelCase attribute
        self.ackedStartDate = acked_start_date # Mapping original snake_case to camelCase attribute


    def __repr__(self):
        return f"Task(title='{self.title}', _id='{self._id}', done={self.done})"

class RecurringTask:
    def __init__(self,
                 _id: str, # Unique ID
                 recurringType: str, # One of "task", "sequence", or "project"
                 title: str, # Title of generated task/project.
                 parentId: str, # ID of Category/Project where items will be placed.
                 type: str, # Recurrence rule type: "daily", "weekly", "monthly", "n per week", "repeat", "repeat week", "repeat month", "repeat year", "echo", "onOff", or "custom".
                 createdAt: int, # Date.now() when created. Not in JSDoc, but present in original code.
                 day: Optional[int] = None, # "weekly" only: Day of week (0=Sunday).
                 date: Optional[int] = None, # "monthly" only: Date of month (1=1st). 29/30/31 -> last day of month if needed.
                 weekDays: Optional[List[int]] = None, # "n per week" only: Days of week (0=Sunday).
                 repeat: Optional[int] = None, # Frequency for "repeat" types (e.g., 2 = every other day/week/month/year).
                 repeatStart: Optional[str] = None, # "repeat", "repeat X" only: Start date "YYYY-MM-DD".
                 limitToWeekdays: Optional[bool] = None, # "monthly", "repeat month" only: If true, schedule on weekdays only (push to Friday if needed).
                 subtaskList: Optional[List[Dict]] = None, # List of subtask definitions to add to the generated task.
                 section: Optional[str] = None, # Default generated task section (e.g., "Afternoon"). Matches Task sections like dailySection etc.
                 timeEstimate: Optional[int] = None, # Time estimate in ms for generated task/project.
                 labelIds: Optional[List[str]] = None, # IDs of labels to attach.
                 dueIn: Optional[int] = None, # recurringType="project" only: Due date offset in days.
                 autoPlan: Optional[str] = None, # recurringType="project" only: Set plannedWeek/plannedMonth. Values: "plannedWeek", "plannedMonth".
                 echoDays: Optional[int] = None, # "echo" only: Days after completion to schedule the next task.
                 onCount: Optional[int] = None, # "onOff" only: Number of days "on".
                 offCount: Optional[int] = None, # "onOff" only: Number of days "off".
                 customRecurrence: Optional[str] = None, # Human-readable rrule string (e.g., "month on the 2nd last Friday").
                 endDate: Optional[str] = None, # "YYYY-MM-DD", generation stops after this date.
                 db: str = "RecurringTasks", # Database identifier
                 # Original fields, kept for compatibility
                 updated_at: Optional[int] = None, # Not in JSDoc
                 bonus_section: Optional[str] = None, # Not in JSDoc, Maps to bonusSection? Use section field instead? Keeping for now.
                 start_in: Optional[int] = None, # Not in JSDoc, maybe related to start date offset?
                 note: Optional[str] = None, # Not in JSDoc
                 is_reward: Optional[bool] = None, # Not in JSDoc
                 is_starred: Optional[int] = None, # Not in JSDoc
                 is_frogged: Optional[int] = None, # Not in JSDoc
                 reward_points: Optional[int] = None, # Not in JSDoc
                 rank: Optional[int] = None, # Not in JSDoc
                 field_updates: Optional[Dict] = None, # Not in JSDoc
                 end_in: Optional[int] = None, # Not in JSDoc, maybe related to endDate offset?
                 ):
        self._id = _id
        self.recurringType = recurringType
        self.title = title
        self.parentId = parentId
        self.type = type
        self.createdAt = createdAt # Keep original
        self.day = day
        self.date = date
        self.weekDays = weekDays
        self.repeat = repeat
        self.repeatStart = repeatStart
        self.limitToWeekdays = limitToWeekdays
        self.subtaskList = subtaskList
        self.section = section # Added from JSDoc
        self.timeEstimate = timeEstimate
        self.labelIds = labelIds
        self.dueIn = dueIn
        self.autoPlan = autoPlan # Added from JSDoc
        self.echoDays = echoDays
        self.onCount = onCount
        self.offCount = offCount
        self.customRecurrence = customRecurrence
        self.endDate = endDate
        self.db = db
        # Original fields assignment
        self.updatedAt = updated_at # Keep original
        self.bonusSection = bonus_section # Keep original
        self.startIn = start_in # Keep original
        self.note = note # Keep original
        self.isReward = is_reward # Keep original
        self.isStarred = is_starred # Keep original
        self.isFrogged = is_frogged # Keep original
        self.rewardPoints = reward_points # Keep original
        self.rank = rank # Keep original
        self.fieldUpdates = field_updates # Keep original
        self.endIn = end_in # Keep original

    def __repr__(self):
        return f"RecurringTask(title='{self.title}', _id='{self._id}', type='{self.type}')"

class Goal:
    def __init__(self,
                 _id: str, # The goal's unique ID.
                 title: str, # The goal's title.
                 status: str, # The goal's status: "backburner", "pending", "active", "done".
                 sections: List[GoalSection], # Sections/phases of the goal.
                 hasEnd: bool, # Whether this goal is an "End goal" (true) or Ongoing (false).
                 createdAt: int, # Date.now() when created. Not in JSDoc, but present in original code.
                 note: Optional[str] = None, # The goal's note.
                 hideInDayView: Optional[bool] = None, # If true, don't show in DailyTasks GoalItems.
                 parentId: Optional[str] = None, # ID of parent category (for grouping).
                 isStarred: Optional[int] = None, # Priority.
                 labelIds: Optional[List[str]] = None, # Labels assigned to the goal.
                 importance: Optional[int] = None, # Importance (1-5 stars) in Commitment Contract.
                 difficulty: Optional[int] = None, # Difficulty (1-5 stars) in Commitment Contract.
                 motivations: Optional[List[str]] = None, # Why the user wants to do this.
                 challenges: Optional[List[Challenge]] = None, # Anticipated challenges and actions.
                 committed: Optional[bool] = None, # User clicked checkbox confirming commitment.
                 expectedTasks: Optional[int] = None, # Number of tasks expected to be done each week.
                 expectedDuration: Optional[int] = None, # Expected minutes of work each week (in ms?). JSDoc says minutes, check data. Assuming ms for consistency.
                 expectedHabits: Optional[str] = None, # Expected Habit success grade (e.g., "B-").
                 checkIn: Optional[bool] = None, # True if check-in enabled.
                 checkIns: Optional[List[int]] = None, # Array of [date, confidence, motivation, how_its_going, ...] (each check-in is 4 numbers).
                 lastCheckIn: Optional[str] = None, # Last check-in date ("YYYY-MM-DD").
                 checkInWeeks: Optional[int] = None, # Number of weeks between check-ins.
                 checkInStart: Optional[str] = None, # First check-in date ("YYYY-MM-DD").
                 checkInQuestions: Optional[List[CheckInQuestion]] = None, # Custom questions for check-ins. [{ _id, title }]
                 startedAt: Optional[int] = None, # Date.now() when the goal was made "active". Fallback to createdAt.
                 color: Optional[str] = None, # Color used for this goal.
                 dueDate: Optional[str] = None, # Achievement date ("YYYY-MM-DD"). Null for ongoing goals.
                 taskProgress: Optional[bool] = None, # If true, task/project completion counts toward progress.
                 trackerProgress: Optional[Dict[str, bool]] = None, # trackerProgress_$ID: If true, tracker $ID counts towards progress. Stored as dict: {tracker_id: bool}.
                 updated_at: Optional[int] = None, # Original field, not in JSDoc. Kept for compatibility.
                 field_updates: Optional[Dict] = None, # Original field, not in JSDoc. Kept for compatibility.
                 db: str = "Goals" # Database identifier
                 ):
        self._id = _id
        self.title = title
        self.status = status
        # Process sections list
        if sections and isinstance(sections, list):
             self.sections = [GoalSection(**s) if isinstance(s, dict) else s for s in sections]
        else:
             self.sections = sections
        self.hasEnd = hasEnd
        self.createdAt = createdAt # Keep original
        self.note = note
        self.hideInDayView = hideInDayView
        self.parentId = parentId
        self.isStarred = isStarred
        self.labelIds = labelIds
        self.importance = importance
        self.difficulty = difficulty
        self.motivations = motivations
        # Process challenges list
        if challenges and isinstance(challenges, list):
             self.challenges = [Challenge(**c) if isinstance(c, dict) else c for c in challenges]
        else:
             self.challenges = challenges
        self.committed = committed
        self.expectedTasks = expectedTasks
        self.expectedDuration = expectedDuration
        self.expectedHabits = expectedHabits
        self.checkIn = checkIn
        self.checkIns = checkIns
        self.lastCheckIn = lastCheckIn
        self.checkInWeeks = checkInWeeks
        self.checkInStart = checkInStart
        # Process checkInQuestions list
        if checkInQuestions and isinstance(checkInQuestions, list):
            self.checkInQuestions = [CheckInQuestion(**q) if isinstance(q, dict) else q for q in checkInQuestions]
        else:
            self.checkInQuestions = checkInQuestions
        self.startedAt = startedAt
        self.color = color
        self.dueDate = dueDate
        self.taskProgress = taskProgress
        self.trackerProgress = trackerProgress
        self.updatedAt = updated_at # Keep original
        self.fieldUpdates = field_updates # Keep original
        self.db = db

    def __repr__(self):
        return f"Goal(title='{self.title}', _id='{self._id}', status='{self.status}')"

class Habit:
    def __init__(self,
                 _id: str, # The habit's unique ID.
                 title: str, # The habit's title.
                 isPositive: bool, # If true, aim for >= target; otherwise <= target.
                 recordType: str, # Value type: "boolean" or "number".
                 showInDayView: bool, # If true, show in the day view.
                 showInCalendar: bool, # If true, show in the calendar.
                 sendReminders: bool, # If true, send reminders (original field, not in JSDoc desc but seems relevant).
                 createdAt: int, # Date.now() when created. Not in JSDoc, but present in original code.
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
                 startTime: Optional[str] = None, # Time "HH:mm" to start showing in day view.
                 endTime: Optional[str] = None, # Time "HH:mm" to stop showing in day view.
                 showAfterSuccess: Optional[bool] = None, # If false, hide in day view after hitting period target.
                 showAfterRecord: Optional[bool] = None, # If false, hide in day view after recording once in a day.
                 done: Optional[bool] = None, # Marked as done/archived by the user.
                 history: Optional[List[Union[int, float, str]]] = None, # Array of [time1, val1, time2, val2, ...]. val can be number or maybe other types.
                 dismissed: Optional[str] = None, # Date ("YYYY-MM-DD") when last dismissed for the day.
                 # Reminder fields from original code, not in JSDoc desc but present
                 reminder_times: Optional[List[str]] = None,
                 reminder_days: Optional[List[int]] = None,
                 reminder_text: Optional[str] = None,
                 db: str = "Habits", # Database identifier
                 # Original fields, kept for compatibility
                 field_updates: Optional[Dict] = None, # Not in JSDoc
                 updated_at: Optional[int] = None, # Not in JSDoc
                 rank: Optional[int] = None # Not in JSDoc
                 ):
        self._id = _id
        self.title = title
        self.isPositive = isPositive
        self.recordType = recordType
        self.showInDayView = showInDayView
        self.showInCalendar = showInCalendar
        self.sendReminders = sendReminders # Keep original
        self.createdAt = createdAt # Keep original
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
        self.startTime = startTime
        self.endTime = endTime
        self.showAfterSuccess = showAfterSuccess
        self.showAfterRecord = showAfterRecord
        self.done = done # Added from JSDoc
        self.history = history
        self.dismissed = dismissed # Added from JSDoc
        # Keep original reminder fields
        self.reminderTimes = reminder_times
        self.reminderDays = reminder_days
        self.reminderText = reminder_text
        self.db = db
        # Keep original other fields
        self.fieldUpdates = field_updates
        self.updatedAt = updated_at
        self.rank = rank

    def __repr__(self):
        return f"Habit(title='{self.title}', _id='{self._id}')"

class DayItem:
    def __init__(self, _id: str, # ID is likely the date "YYYY-MM-DD"
                 createdAt: int, # Date.now() when created
                 timeGoals: List, # Structure not defined in JSDoc
                 updated_at: Optional[int] = None, # Date.now() when updated
                 pickedProjects: Optional[List] = None, # Structure not defined
                 field_updates: Optional[Dict] = None, # Change tracking
                 db: str = "DayItems"): # Database identifier
        self.createdAt = createdAt
        self.timeGoals = timeGoals
        self._id = _id
        self.updatedAt = updated_at
        self.pickedProjects = pickedProjects
        self.fieldUpdates = field_updates
        self.db = db

    def __repr__(self):
        return f"DayItem(_id='{self._id}')"

class ProfileItem:
    """ Represents a configuration item stored in the profile. """
    def __init__(self,
                 _id: str, # The profile item's ID (key).
                 val: Any, # The profile value.
                 db: str = "ProfileItems", # Database identifier
                 # The following fields are observed in data but not in the minimal JSDoc.
                 # Keeping them based on original code structure.
                 created_at: Optional[int] = None,
                 updated_at: Optional[int] = None,
                 title: Optional[str] = None,
                 type: Optional[str] = None,
                 inlink: Optional[str] = None,
                 icon: Optional[str] = None,
                 hidden: Optional[bool] = None,
                 color: Optional[str] = None,
                 created_by: Optional[str] = None,
                 hidden_by: Optional[str] = None,
                 subtype: Optional[str] = None,
                 action_id: Optional[str] = None,
                 field_updates: Optional[Dict] = None):
        self._id = _id
        self.val = val
        self.db = db
        # Assigning original optional fields
        self.createdAt = created_at
        self.updatedAt = updated_at
        self.title = title
        self.type = type
        self.inlink = inlink
        self.icon = icon
        self.hidden = hidden
        self.color = color
        self.createdBy = created_by
        self.hiddenBy = hidden_by
        self.subtype = subtype
        self.actionId = action_id
        self.fieldUpdates = field_updates

    def __repr__(self):
        return f"ProfileItem(_id='{self._id}', val={self.val})"

class LocalStorageItem:
    def __init__(self, _id: str, val: Any, db: str = "LocalStorageItems"):
        self._id = _id
        self.val = val
        self.db = db

    def __repr__(self):
        return f"LocalStorageItem(_id='{self._id}', val={self.val})"

def parse_json_entry(entry: Dict) -> Any:
    """Parses a JSON entry and returns its Python representation."""
    db_type = entry.get("db")
    original_entry = entry.copy() # Keep original for error reporting

    # Define field name mappings (JSON camelCase to Python snake_case or intended attribute name)
    # Note: We map to the attribute name used in the Python class __init__ (which might still be camelCase)
    # The Python class __init__ handles assignment to potentially different internal attribute names if needed.
    field_mappings = {
        "Categories": {
            # Map JSON key to Python __init__ parameter name
            "_id": "_id",
            "title": "title",
            "type": "type",
            "parentId": "parentId",
            "createdAt": "createdAt",
            "updatedAt": "updatedAt",
            "workedOnAt": "workedOnAt",
            "rank": "rank",
            "dayRank": "dayRank",
            "day": "day",
            "firstScheduled": "firstScheduled",
            "dueDate": "dueDate",
            "labelIds": "labelIds",
            "timeEstimate": "timeEstimate",
            "startDate": "startDate",
            "endDate": "endDate",
            "plannedWeek": "plannedWeek",
            "plannedMonth": "plannedMonth",
            "sprintId": "sprintId",
            "done": "done",
            "doneDate": "doneDate",
            "priority": "priority",
            "color": "color",
            "icon": "icon",
            "note": "note",
            "recurring": "recurring",
            "recurringTaskId": "recurringTaskId",
            "echo": "echo",
            "isFrogged": "isFrogged",
            "reviewDate": "reviewDate",
            "marvinPoints": "marvinPoints",
            "mpNotes": "mpNotes",
            "db": "db",
            "masterRank": "masterRank", # Original field
            "fieldUpdates": "fieldUpdates" # Original field
        },
        "Tasks": {
            "_id": "_id",
            "createdAt": "createdAt",
            "title": "title",
            "parentId": "parentId",
            "day": "day",
            "firstScheduled": "firstScheduled",
            "updatedAt": "updatedAt",
            "workedOnAt": "workedOnAt",
            "dueDate": "dueDate",
            "startDate": "startDate",
            "endDate": "endDate",
            "plannedWeek": "plannedWeek",
            "plannedMonth": "plannedMonth",
            "sprintId": "sprintId",
            "rank": "rank",
            "masterRank": "masterRank",
            "done": "done",
            # "completedAt" is not directly in JSON, derived or set later? Not mapping.
            "doneAt": "doneAt",
            "duration": "duration",
            "times": "times",
            "firstTracked": "firstTracked",
            "isReward": "isReward",
            "isStarred": "isStarred",
            "isFrogged": "isFrogged",
            "isPinned": "isPinned",
            "pinId": "pinId",
            "recurring": "recurring",
            "recurringTaskId": "recurringTaskId",
            "echo": "echo",
            "echoId": "echoId",
            "link": "link",
            "subtasks": "subtasks",
            "colorBar": "colorBar",
            "labelIds": "labelIds",
            "timeEstimate": "timeEstimate",
            "note": "note",
            "email": "email",
            "dailySection": "dailySection",
            "bonusSection": "bonusSection",
            "customSection": "customSection",
            "timeBlockSection": "timeBlockSection",
            "dependsOn": "dependsOn",
            "backburner": "backburner",
            "reviewDate": "reviewDate",
            "itemSnoozeTime": "itemSnoozeTime",
            "permaSnoozeTime": "permaSnoozeTime",
            "calId": "calId",
            "calURL": "calURL",
            "etag": "etag",
            "calData": "calData",
            "generatedAt": "generatedAt",
            "echoedAt": "echoedAt",
            "deletedAt": "deletedAt",
            "restoredAt": "restoredAt",
            "onboard": "onboard",
            "imported": "imported", # Map 'imported' JSON field
            "marvinPoints": "marvinPoints",
            "mpNotes": "mpNotes",
            "rewardPoints": "rewardPoints",
            "rewardId": "rewardId",
            # Goal fields (g_*) are handled dynamically or need special parsing. Not mapping directly.
            "taskTime": "taskTime",
            "reminderOffset": "reminderOffset",
            "reminderTime": "reminderTime", # Mapping JSON 'reminderTime' (unix timestamp)
            "snooze": "snooze",
            "autoSnooze": "autoSnooze",
            "remindAt": "remindAt",
            "reminder": "reminder",
            "db": "db",
            # Original snake_case fields need mapping if they exist in JSON
            "sectionId": "section_id", # Map JSON 'sectionId' to 'section_id' param
            "fieldUpdates": "field_updates", # Map JSON 'fieldUpdates' to 'field_updates' param
            "ackedStartDate": "acked_start_date", # Map JSON 'ackedStartDate' to 'acked_start_date' param
            # Map original snake_case param names if they correspond to camelCase JSON keys
            "imported_flag": "imported" # Ensure original 'imported_flag' param maps from 'imported' JSON
        },
        "RecurringTasks": {
            "_id": "_id",
            "recurringType": "recurringType",
            "title": "title",
            "parentId": "parentId",
            "type": "type",
            "createdAt": "createdAt", # From original code
            "day": "day",
            "date": "date",
            "weekDays": "weekDays",
            "repeat": "repeat",
            "repeatStart": "repeatStart",
            "limitToWeekdays": "limitToWeekdays",
            "subtaskList": "subtaskList",
            "section": "section", # New field from JSDoc
            "timeEstimate": "timeEstimate",
            "labelIds": "labelIds",
            "dueIn": "dueIn",
            "autoPlan": "autoPlan", # New field from JSDoc
            "echoDays": "echoDays",
            "onCount": "onCount",
            "offCount": "offCount",
            "customRecurrence": "customRecurrence",
            "endDate": "endDate",
            "db": "db",
            # Original fields mapping
            "updatedAt": "updated_at",
            "bonusSection": "bonus_section",
            "startIn": "start_in",
            "note": "note",
            "isReward": "is_reward",
            "isStarred": "is_starred",
            "isFrogged": "is_frogged",
            "rewardPoints": "reward_points",
            "rank": "rank",
            "fieldUpdates": "field_updates",
            "endIn": "end_in",
        },
        "Goals": {
             "_id": "_id",
             "title": "title",
             "status": "status",
             "sections": "sections",
             "hasEnd": "hasEnd",
             "createdAt": "createdAt", # From original code
             "note": "note",
             "hideInDayView": "hideInDayView",
             "parentId": "parentId",
             "isStarred": "isStarred",
             "labelIds": "labelIds",
             "importance": "importance",
             "difficulty": "difficulty",
             "motivations": "motivations",
             "challenges": "challenges",
             "committed": "committed",
             "expectedTasks": "expectedTasks",
             "expectedDuration": "expectedDuration",
             "expectedHabits": "expectedHabits",
             "checkIn": "checkIn",
             "checkIns": "checkIns",
             "lastCheckIn": "lastCheckIn",
             "checkInWeeks": "checkInWeeks",
             "checkInStart": "checkInStart",
             "checkInQuestions": "checkInQuestions",
             "startedAt": "startedAt",
             "color": "color",
             "dueDate": "dueDate",
             "taskProgress": "taskProgress",
             # trackerProgress needs dynamic handling, map field name prefix?
             # Or handle after initial object creation. Mapping as generic dict for now.
             "trackerProgress": "trackerProgress", # This assumes JSON contains a 'trackerProgress' dict
             "updatedAt": "updated_at", # Original field
             "fieldUpdates": "field_updates", # Original field
             "db": "db",
         },
        "Habits": {
             "_id": "_id",
             "title": "title",
             "isPositive": "isPositive",
             "recordType": "recordType",
             "showInDayView": "showInDayView",
             "showInCalendar": "showInCalendar",
             "sendReminders": "sendReminders", # Original field
             "createdAt": "createdAt", # Original field
             "note": "note",
             "color": "color",
             "parentId": "parentId",
             "labelIds": "labelIds",
             "isStarred": "isStarred",
             "isFrogged": "isFrogged",
             "timeEstimate": "timeEstimate",
             "startDate": "startDate",
             "endDate": "endDate",
             "units": "units",
             "period": "period",
             "target": "target",
             "askOn": "askOn",
             "time": "time",
             "startTime": "startTime",
             "endTime": "endTime",
             "showAfterSuccess": "showAfterSuccess",
             "showAfterRecord": "showAfterRecord",
             "done": "done", # New field
             "history": "history",
             "dismissed": "dismissed", # New field
             "reminderTimes": "reminder_times", # Original field
             "reminderDays": "reminder_days", # Original field
             "reminderText": "reminder_text", # Original field
             "db": "db",
             "fieldUpdates": "field_updates", # Original field
             "updatedAt": "updated_at", # Original field
             "rank": "rank" # Original field
         },
        "DayItems": {
            "_id": "_id",
            "createdAt": "createdAt", # Original mapping
            "timeGoals": "timeGoals", # Original mapping
            "updatedAt": "updated_at", # Original mapping
            "pickedProjects": "pickedProjects", # Original mapping
            "fieldUpdates": "field_updates", # Original mapping
            "db": "db"
        },
        "ProfileItems": {
            "_id": "_id",
            "val": "val",
            "db": "db",
            # Map optional original fields from JSON camelCase to snake_case param
            "createdAt": "created_at",
            "updatedAt": "updated_at",
            "title": "title",
            "type": "type",
            "inlink": "inlink",
            "icon": "icon",
            "hidden": "hidden",
            "color": "color",
            "createdBy": "created_by",
            "hiddenBy": "hidden_by",
            "subtype": "subtype",
            "actionId": "action_id",
            "fieldUpdates": "field_updates"
        },
         "LocalStorageItems": { # Added mapping for completeness
            "_id": "_id",
            "val": "val",
            "db": "db"
        }
    }

    # Prepare kwargs for class instantiation
    kwargs = {}
    processed_keys = set()

    # Apply specific mappings first
    if db_type in field_mappings:
        mappings = field_mappings[db_type]
        for json_key, kwarg_key in mappings.items():
            if json_key in entry:
                kwargs[kwarg_key] = entry[json_key]
                processed_keys.add(json_key)

    # Handle dynamic Goal fields (g_* and trackerProgress_*) - This requires iteration
    if db_type == "Goals":
        goal_g_in = {}
        goal_g_sec = {}
        goal_g_rank = {}
        tracker_progress = {}
        keys_to_remove = []
        for key, value in entry.items():
             if key.startswith("g_in_"):
                 goal_id = key.split("g_in_")[1]
                 goal_g_in[goal_id] = value
                 keys_to_remove.append(key)
             elif key.startswith("g_sec_"):
                 goal_id = key.split("g_sec_")[1]
                 goal_g_sec[goal_id] = value
                 keys_to_remove.append(key)
             elif key.startswith("g_rank_"):
                 goal_id = key.split("g_rank_")[1]
                 goal_g_rank[goal_id] = value
                 keys_to_remove.append(key)
             elif key.startswith("trackerProgress_"):
                 tracker_id = key.split("trackerProgress_")[1]
                 tracker_progress[tracker_id] = value
                 keys_to_remove.append(key)

        # Add the processed dynamic fields to kwargs
        if goal_g_in: kwargs['g_in'] = goal_g_in
        if goal_g_sec: kwargs['g_sec'] = goal_g_sec
        if goal_g_rank: kwargs['g_rank'] = goal_g_rank
        if tracker_progress: kwargs['trackerProgress'] = tracker_progress # Assign to the generic dict param

        # Mark these keys as processed
        processed_keys.update(keys_to_remove)

    # Add any remaining keys from the entry that weren't explicitly mapped or processed dynamically
    # This preserves unknown/new fields but might cause issues if class __init__ doesn't expect them.
    # Consider logging a warning for unexpected keys.
    # for key, value in entry.items():
    #    if key not in processed_keys and key != 'db': # Avoid adding 'db' again
    #        # Convert camelCase to snake_case for potential direct attribute assignment
    #        # This is risky if the class __init__ doesn't accept arbitrary kwargs
    #        # snake_key = ''.join(['_'+c.lower() if c.isupper() else c for c in key]).lstrip('_')
    #        # kwargs[snake_key] = value
    #        print(f"Warning: Unhandled key '{key}' in db '{db_type}'. Not passed to constructor.")
    #        pass # Safer to ignore unmapped keys unless explicitly handled


    # Create and return the appropriate object based on the database type
    try:
        if db_type == "Categories":
            # Ensure required args are present
            if 'title' not in kwargs or '_id' not in kwargs or 'type' not in kwargs or 'parentId' not in kwargs or 'createdAt' not in kwargs:
                 raise TypeError(f"Missing required arguments for Category: Need _id, title, type, parentId, createdAt. Got keys: {list(kwargs.keys())}")
            return Category(**kwargs)
        elif db_type == "Tasks":
             if '_id' not in kwargs or 'createdAt' not in kwargs or 'title' not in kwargs or 'parentId' not in kwargs:
                 raise TypeError(f"Missing required arguments for Task: Need _id, createdAt, title, parentId. Got keys: {list(kwargs.keys())}")
             # Handle subtasks specifically - ensure they are dicts for the Subtask constructor
             if 'subtasks' in kwargs and isinstance(kwargs['subtasks'], dict):
                 kwargs['subtasks'] = {k: v for k, v in kwargs['subtasks'].items() if isinstance(v, dict)}

             # Handle the mapping for imported_flag parameter if 'imported' exists in JSON
             if 'imported' in kwargs:
                 kwargs['imported'] = kwargs['imported'] # Map JSON 'imported' to python 'imported' attribute

             return Task(**kwargs)
        elif db_type == "RecurringTasks":
             if '_id' not in kwargs or 'recurringType' not in kwargs or 'title' not in kwargs or 'parentId' not in kwargs or 'type' not in kwargs or 'createdAt' not in kwargs:
                 raise TypeError(f"Missing required arguments for RecurringTask: Need _id, recurringType, title, parentId, type, createdAt. Got keys: {list(kwargs.keys())}")
             return RecurringTask(**kwargs)
        elif db_type == "Goals":
             if '_id' not in kwargs or 'title' not in kwargs or 'status' not in kwargs or 'sections' not in kwargs or 'hasEnd' not in kwargs or 'createdAt' not in kwargs:
                  raise TypeError(f"Missing required arguments for Goal: Need _id, title, status, sections, hasEnd, createdAt. Got keys: {list(kwargs.keys())}")
             # Handle dynamic trackerProgress fields if they weren't consolidated into a dict earlier
             if 'trackerProgress' not in kwargs:
                 tracker_prog_dict = {}
                 keys_to_process_for_tracker = list(kwargs.keys()) # Iterate over copy of keys
                 for key in keys_to_process_for_tracker:
                     if key.startswith("trackerProgress_"):
                         tracker_id = key.split("trackerProgress_")[1]
                         tracker_prog_dict[tracker_id] = kwargs.pop(key) # Remove from kwargs and add to dict
                 if tracker_prog_dict:
                     kwargs['trackerProgress'] = tracker_prog_dict

             # Handle dynamic g_* fields if they weren't consolidated
             g_fields = {'g_in': {}, 'g_sec': {}, 'g_rank': {}}
             keys_to_process_for_g = list(kwargs.keys())
             for key in keys_to_process_for_g:
                  if key.startswith("g_in_"):
                      g_fields['g_in'][key.split("g_in_")[1]] = kwargs.pop(key)
                  elif key.startswith("g_sec_"):
                      g_fields['g_sec'][key.split("g_sec_")[1]] = kwargs.pop(key)
                  elif key.startswith("g_rank_"):
                      g_fields['g_rank'][key.split("g_rank_")[1]] = kwargs.pop(key)

             if g_fields['g_in']: kwargs['g_in'] = g_fields['g_in']
             if g_fields['g_sec']: kwargs['g_sec'] = g_fields['g_sec']
             if g_fields['g_rank']: kwargs['g_rank'] = g_fields['g_rank']

             return Goal(**kwargs)
        elif db_type == "Habits":
             if '_id' not in kwargs or 'title' not in kwargs or 'isPositive' not in kwargs or 'recordType' not in kwargs or 'showInDayView' not in kwargs or 'showInCalendar' not in kwargs or 'sendReminders' not in kwargs or 'createdAt' not in kwargs:
                 raise TypeError(f"Missing required arguments for Habit: Need _id, title, isPositive, recordType, showInDayView, showInCalendar, sendReminders, createdAt. Got keys: {list(kwargs.keys())}")
             return Habit(**kwargs)
        elif db_type == "DayItems":
            if '_id' not in kwargs or 'createdAt' not in kwargs or 'timeGoals' not in kwargs:
                 raise TypeError(f"Missing required arguments for DayItem: Need _id, createdAt, timeGoals. Got keys: {list(kwargs.keys())}")
            return DayItem(**kwargs)
        elif db_type == "ProfileItems":
            if '_id' not in kwargs or 'val' not in kwargs :
                 raise TypeError(f"Missing required arguments for ProfileItem: Need _id, val. Got keys: {list(kwargs.keys())}")
            return ProfileItem(**kwargs)
        elif db_type == "LocalStorageItems":
             if '_id' not in kwargs or 'val' not in kwargs :
                 raise TypeError(f"Missing required arguments for LocalStorageItem: Need _id, val. Got keys: {list(kwargs.keys())}")
             return LocalStorageItem(**kwargs)
    except TypeError as e:
        print(f"Error creating object for db '{db_type}' with _id '{original_entry.get('_id', 'N/A')}': {e}")
        # print(f"Original Entry: {original_entry}") # Potentially verbose
        print(f"Processed Kwargs: {kwargs}")
        raise

    # Return original entry if no class matched or if db_type is missing/unknown
    # Log this occurrence?
    # print(f"Warning: No matching class found for db_type '{db_type}'. Returning raw entry.")
    return entry

# Load the JSON data from the source
# Get filename from command-line arguments
if len(sys.argv) < 2:
    print("Usage: python marvin_parser.py <json_file_path>")
    sys.exit(1)

file_path = sys.argv[1]

# Load the JSON data from the source
try:
    with open(file_path, 'r', encoding='utf-8') as file:
        json_data = json.load(file)
except FileNotFoundError:
    print(f"Error: File '{file_path}' not found.")
    sys.exit(1)
except json.JSONDecodeError:
    print(f"Error: '{file_path}' is not a valid JSON file.")
    sys.exit(1)

# Parse each entry in the JSON data
parsed_entries = [parse_json_entry(entry) for entry in json_data]

# Organize entries into tables by class type with _id as the index
tables = defaultdict(dict)
for entry in parsed_entries:
    if hasattr(entry, 'db') and hasattr(entry, '_id'):
        tables[entry.db][entry._id] = entry

# Print the top 3 entries from each table
print("\n=== Database Tables Summary ===")
for table_name, table_data in tables.items():
    print(f"\nTable: {table_name} (Total entries: {len(table_data)})")
    for i, (entry_id, entry) in enumerate(table_data.items()):
        if i < 3:  # Only print the first 3 entries
            print(f"  {i+1}. {entry}")
        else:
            break

