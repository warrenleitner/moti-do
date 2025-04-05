import json
from typing import List, Optional, Dict, Any, DefaultDict
import sys
from collections import defaultdict

class Category:
    def __init__(self, created_at: int, parent_id: str, title: str, type: str, _id: str,
                 icon: Optional[str] = None, color: Optional[str] = None, db: str = "Categories",
                 updated_at: Optional[int] = None, rank: Optional[int] = None,
                 master_rank: Optional[int] = None, field_updates: Optional[Dict] = None):
        self.createdAt = created_at
        self.parentId = parent_id
        self.title = title
        self.type = type
        self._id = _id
        self.icon = icon
        self.color = color
        self.db = db
        self.updatedAt = updated_at
        self.rank = rank
        self.masterRank = master_rank
        self.fieldUpdates = field_updates

    def __repr__(self):
        return f"Category(title='{self.title}', _id='{self._id}')"

class Task:
    def __init__(self, created_at: int, title: str, parent_id: str, day: str, first_scheduled: str,
                 _id: str, done: bool = False, time_estimate: Optional[int] = None,
                 label_ids: Optional[List[str]] = None, generated_at: Optional[int] = None,
                 recurring: Optional[bool] = None, recurring_task_id: Optional[str] = None,
                 rank: Optional[int] = None, subtasks: Optional[Dict] = None, note: Optional[str] = None,
                 is_reward: Optional[bool] = None, is_starred: Optional[int] = None,
                 is_frogged: Optional[int] = None, reward_points: Optional[int] = None,
                 daily_section: Optional[str] = None, bonus_section: Optional[str] = None,
                 custom_section: Optional[str] = None, section_id: Optional[str] = None,
                 start_date: Optional[str] = None, due_date: Optional[str] = None,
                 field_updates: Optional[Dict] = None, updated_at: Optional[int] = None,
                 end_date: Optional[str] = None, imported_flag: Optional[bool] = None,
                 done_at: Optional[int] = None, reminder_time: Optional[int] = None,
                 worked_on_at: Optional[int] = None, reward_id: Optional[str] = None,
                 times: Optional[List] = None, duration: Optional[int] = None,
                 marvin_points: Optional[int] = None, mp_notes: Optional[List[str]] = None,
                 master_rank: Optional[int] = None, acked_start_date: Optional[bool] = None,
                 db: str = "Tasks"):
        self.createdAt = created_at
        self.title = title
        self.timeEstimate = time_estimate
        self.labelIds = label_ids
        self.generatedAt = generated_at
        self.parentId = parent_id
        self.day = day
        self.firstScheduled = first_scheduled
        self.done = done
        self.recurring = recurring
        self.recurringTaskId = recurring_task_id
        self.rank = rank
        self.subtasks = subtasks
        self.note = note
        self.isReward = is_reward
        self.isStarred = is_starred
        self.isFrogged = is_frogged
        self.rewardPoints = reward_points
        self.dailySection = daily_section
        self.bonusSection = bonus_section
        self.customSection = custom_section
        self.sectionId = section_id
        self.startDate = start_date
        self.dueDate = due_date
        self.fieldUpdates = field_updates
        self.updatedAt = updated_at
        self._id = _id
        self.endDate = end_date
        self.imported = imported_flag
        self.doneAt = done_at
        self.reminderTime = reminder_time
        self.workedOnAt = worked_on_at
        self.rewardId = reward_id
        self.times = times
        self.duration = duration
        self.marvinPoints = marvin_points
        self.mpNotes = mp_notes
        self.masterRank = master_rank
        self.ackedStartDate = acked_start_date
        self.db = db

    def __repr__(self):
        return f"Task(title='{self.title}', _id='{self._id}', done={self.done})"

class RecurringTask:
    def __init__(self, created_at: int, title: str, recurring_type: str, parent_id: str, type: str,
                 _id: str, day: Optional[int] = None, date: Optional[int] = None,
                 week_days: Optional[List[int]] = None, repeat: Optional[int] = None,
                 repeat_start: Optional[str] = None, echo_days: Optional[int] = None,
                 on_count: Optional[int] = None, off_count: Optional[int] = None,
                 custom_recurrence: Optional[str] = None, limit_to_weekdays: Optional[bool] = None,
                 subtask_list: Optional[List] = None, section_id: Optional[str] = None,
                 bonus_section: Optional[str] = None, time_estimate: Optional[int] = None,
                 label_ids: Optional[List[str]] = None, start_in: Optional[int] = None,
                 due_in: Optional[int] = None, end_date: Optional[str] = None,
                 note: Optional[str] = None, is_reward: Optional[bool] = None,
                 is_starred: Optional[int] = None, is_frogged: Optional[int] = None,
                 reward_points: Optional[int] = None, rank: Optional[int] = None,
                 field_updates: Optional[Dict] = None, db: str = "RecurringTasks",
                 end_in: Optional[int] = None, updated_at: Optional[int] = None):
        self.createdAt = created_at
        self.title = title
        self.recurringType = recurring_type
        self.parentId = parent_id
        self.type = type
        self._id = _id
        self.day = day
        self.date = date
        self.weekDays = week_days
        self.repeat = repeat
        self.repeatStart = repeat_start
        self.echoDays = echo_days
        self.onCount = on_count
        self.offCount = off_count
        self.customRecurrence = custom_recurrence
        self.limitToWeekdays = limit_to_weekdays
        self.subtaskList = subtask_list
        self.sectionId = section_id
        self.bonusSection = bonus_section
        self.timeEstimate = time_estimate
        self.labelIds = label_ids
        self.startIn = start_in
        self.dueIn = due_in
        self.endDate = end_date
        self.note = note
        self.isReward = is_reward
        self.isStarred = is_starred
        self.isFrogged = is_frogged
        self.rewardPoints = reward_points
        self.rank = rank
        self.fieldUpdates = field_updates
        self.db = db
        self.endIn = end_in
        self.updatedAt = updated_at

    def __repr__(self):
        return f"RecurringTask(title='{self.title}', _id='{self._id}', type='{self.type}')"

class Goal:
    def __init__(self, created_at: int, status: str, sections: List[Dict], title: str, has_end: bool,
                 due_date: str, parent_id: str, is_starred: int, label_ids: List[str],
                 hide_in_day_view: bool, _id: str, field_updates: Optional[Dict] = None,
                 updated_at: Optional[int] = None, db: str = "Goals"):
        self.createdAt = created_at
        self.status = status
        self.sections = sections
        self.title = title
        self.hasEnd = has_end
        self.dueDate = due_date
        self.parentId = parent_id
        self.isStarred = is_starred
        self.labelIds = label_ids
        self.hideInDayView = hide_in_day_view
        self._id = _id
        self.fieldUpdates = field_updates
        self.updatedAt = updated_at
        self.db = db

    def __repr__(self):
        return f"Goal(title='{self.title}', _id='{self._id}', status='{self.status}')"

class Habit:
    def __init__(self, created_at: int, title: str, parent_id: str, is_positive: bool, record_type: str,
                 show_in_day_view: bool, show_in_calendar: bool, send_reminders: bool, _id: str,
                 note: Optional[str] = None, color: Optional[str] = None,
                 label_ids: Optional[List[str]] = None, is_starred: Optional[int] = None,
                 is_frogged: Optional[int] = None, time_estimate: Optional[int] = None,
                 start_date: Optional[str] = None, end_date: Optional[str] = None,
                 units: Optional[str] = None, period: Optional[str] = None,
                 target: Optional[int] = None, ask_on: Optional[List[int]] = None,
                 time: Optional[str] = None, start_time: Optional[str] = None,
                 end_time: Optional[str] = None, show_after_success: Optional[bool] = None,
                 show_after_record: Optional[bool] = None,
                 reminder_times: Optional[List[str]] = None,
                 reminder_days: Optional[List[int]] = None,
                 reminder_text: Optional[str] = None, db: str = "Habits",
                 history: Optional[List] = None, field_updates: Optional[Dict] = None,
                 updated_at: Optional[int] = None, rank: Optional[int] = None):
        self.createdAt = created_at
        self.title = title
        self.note = note
        self.color = color
        self.parentId = parent_id
        self.labelIds = label_ids
        self.isStarred = is_starred
        self.isFrogged = is_frogged
        self.timeEstimate = time_estimate
        self.startDate = start_date
        self.endDate = end_date
        self.units = units
        self.period = period
        self.target = target
        self.isPositive = is_positive
        self.recordType = record_type
        self.showInDayView = show_in_day_view
        self.showInCalendar = show_in_calendar
        self.askOn = ask_on
        self.time = time
        self.startTime = start_time
        self.endTime = end_time
        self.showAfterSuccess = show_after_success
        self.showAfterRecord = show_after_record
        self.sendReminders = send_reminders
        self.reminderTimes = reminder_times
        self.reminderDays = reminder_days
        self.reminderText = reminder_text
        self.db = db
        self.history = history
        self.fieldUpdates = field_updates
        self.updatedAt = updated_at
        self._id = _id
        self.rank = rank

    def __repr__(self):
        return f"Habit(title='{self.title}', _id='{self._id}')"

class DayItem:
    def __init__(self, created_at: int, time_goals: List, _id: str,
                 updated_at: Optional[int] = None, picked_projects: Optional[List] = None,
                 field_updates: Optional[Dict] = None, db: str = "DayItems"):
        self.createdAt = created_at
        self.timeGoals = time_goals
        self._id = _id
        self.updatedAt = updated_at
        self.pickedProjects = picked_projects
        self.fieldUpdates = field_updates
        self.db = db

    def __repr__(self):
        return f"DayItem(_id='{self._id}')"

class ProfileItem:
    def __init__(self, val: Any, _id: str, db: str = "ProfileItems",
                 created_at: Optional[int] = None,
                 updated_at: Optional[int] = None, title: Optional[str] = None,
                 type: Optional[str] = None, inlink: Optional[str] = None,
                 icon: Optional[str] = None, hidden: Optional[bool] = None,
                 color: Optional[str] = None, created_by: Optional[str] = None,
                 hidden_by: Optional[str] = None, subtype: Optional[str] = None,
                 action_id: Optional[str] = None, field_updates: Optional[Dict] = None):
        self.val = val
        self._id = _id
        self.db = db
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
    
    # Define field name mappings (camelCase to snake_case)
    field_mappings = {
        "Categories": {
            "createdAt": "created_at",
            "parentId": "parent_id",
            "updatedAt": "updated_at",
            "masterRank": "master_rank",
            "fieldUpdates": "field_updates"
        },
        "Tasks": {
            "createdAt": "created_at",
            "parentId": "parent_id", 
            "timeEstimate": "time_estimate",
            "labelIds": "label_ids", 
            "generatedAt": "generated_at",
            "firstScheduled": "first_scheduled",
            "recurringTaskId": "recurring_task_id",
            "isReward": "is_reward",
            "isStarred": "is_starred", 
            "isFrogged": "is_frogged",
            "rewardPoints": "reward_points",
            "dailySection": "daily_section",
            "bonusSection": "bonus_section", 
            "customSection": "custom_section",
            "sectionId": "section_id",
            "startDate": "start_date",
            "dueDate": "due_date",
            "fieldUpdates": "field_updates",
            "updatedAt": "updated_at", 
            "endDate": "end_date",
            "imported": "imported_flag",
            "doneAt": "done_at",
            "reminderTime": "reminder_time",
            "workedOnAt": "worked_on_at",
            "rewardId": "reward_id",
            "marvinPoints": "marvin_points",
            "mpNotes": "mp_notes",
            "masterRank": "master_rank",
            "ackedStartDate": "acked_start_date"
        },
        "RecurringTasks": {
            "createdAt": "created_at",
            "parentId": "parent_id",
            "recurringType": "recurring_type",
            "weekDays": "week_days", 
            "repeatStart": "repeat_start",
            "echoDays": "echo_days",
            "onCount": "on_count", 
            "offCount": "off_count",
            "customRecurrence": "custom_recurrence",
            "limitToWeekdays": "limit_to_weekdays",
            "subtaskList": "subtask_list",
            "sectionId": "section_id",
            "bonusSection": "bonus_section",
            "timeEstimate": "time_estimate", 
            "labelIds": "label_ids",
            "startIn": "start_in",
            "dueIn": "due_in",
            "endDate": "end_date", 
            "isReward": "is_reward",
            "isStarred": "is_starred",
            "isFrogged": "is_frogged", 
            "rewardPoints": "reward_points",
            "fieldUpdates": "field_updates",
            "endIn": "end_in", 
            "updatedAt": "updated_at"
        },
        "Goals": {
            "createdAt": "created_at",
            "hasEnd": "has_end",
            "dueDate": "due_date", 
            "parentId": "parent_id",
            "isStarred": "is_starred",
            "labelIds": "label_ids",
            "hideInDayView": "hide_in_day_view",
            "fieldUpdates": "field_updates",
            "updatedAt": "updated_at"
        },
        "Habits": {
            "createdAt": "created_at",
            "parentId": "parent_id",
            "isPositive": "is_positive",
            "recordType": "record_type",
            "showInDayView": "show_in_day_view",
            "showInCalendar": "show_in_calendar",
            "sendReminders": "send_reminders", 
            "isStarred": "is_starred",
            "isFrogged": "is_frogged",
            "timeEstimate": "time_estimate", 
            "startDate": "start_date",
            "endDate": "end_date",
            "askOn": "ask_on",
            "startTime": "start_time", 
            "endTime": "end_time",
            "showAfterSuccess": "show_after_success",
            "showAfterRecord": "show_after_record", 
            "reminderTimes": "reminder_times",
            "reminderDays": "reminder_days",
            "reminderText": "reminder_text", 
            "labelIds": "label_ids",
            "fieldUpdates": "field_updates",
            "updatedAt": "updated_at"
        },
        "DayItems": {
            "createdAt": "created_at",
            "timeGoals": "time_goals",
            "updatedAt": "updated_at", 
            "pickedProjects": "picked_projects",
            "fieldUpdates": "field_updates"
        },
        "ProfileItems": {
            "createdAt": "created_at",
            "updatedAt": "updated_at",
            "createdBy": "created_by",
            "hiddenBy": "hidden_by", 
            "actionId": "action_id",
            "fieldUpdates": "field_updates"
        }
    }
    
    # Apply field mappings based on database type
    if db_type in field_mappings:
        mappings = field_mappings[db_type]
        for camel_case, snake_case in mappings.items():
            if camel_case in entry:
                entry[snake_case] = entry.pop(camel_case)
    
    # Create and return the appropriate object based on the database type
    try:
        if db_type == "Categories":
            return Category(**entry)
        elif db_type == "Tasks":
            return Task(**entry)
        elif db_type == "RecurringTasks":
            return RecurringTask(**entry)
        elif db_type == "Goals":
            return Goal(**entry)
        elif db_type == "Habits":
            return Habit(**entry)
        elif db_type == "DayItems":
            return DayItem(**entry)
        elif db_type == "ProfileItems":
            return ProfileItem(**entry)
        elif db_type == "LocalStorageItems":
            return LocalStorageItem(**entry)
    except TypeError as e:
        print(f"Error creating object for db '{db_type}': {e}")
        print(f"Entry: {entry}")
        raise
    
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

