import json
from typing import List, Optional, Dict, Any, DefaultDict, Union
import sys
from collections import defaultdict
# Import both fancy and slim classes
from .fancy_classes import Category as FancyCategory, Subtask as FancySubtask, Task as FancyTask, RecurringTask as FancyRecurringTask, GoalSection as FancyGoalSection, Challenge as FancyChallenge, CheckInQuestion as FancyCheckInQuestion, Goal as FancyGoal, Habit as FancyHabit, DayItem as FancyDayItem, ProfileItem as FancyProfileItem, LocalStorageItem as FancyLocalStorageItem
from .slim_classes import Category as SlimCategory, Subtask as SlimSubtask, Task as SlimTask, RecurringTask as SlimRecurringTask, Habit as SlimHabit
# Slim classes for Goal, DayItem, ProfileItem, LocalStorageItem are not defined, so we won't translate those.

def parse_json_entry(entry: Dict) -> Any:
    """Parses a JSON entry and returns its Python representation using FANCY classes."""
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
            return FancyCategory(**kwargs)
        elif db_type == "Tasks":
             if '_id' not in kwargs or 'createdAt' not in kwargs or 'title' not in kwargs or 'parentId' not in kwargs:
                 raise TypeError(f"Missing required arguments for Task: Need _id, createdAt, title, parentId. Got keys: {list(kwargs.keys())}")
             # Handle subtasks specifically - ensure they are dicts for the Subtask constructor
             if 'subtasks' in kwargs and isinstance(kwargs['subtasks'], dict):
                 kwargs['subtasks'] = {k: v for k, v in kwargs['subtasks'].items() if isinstance(v, dict)}

             # Handle the mapping for imported_flag parameter if 'imported' exists in JSON
             if 'imported' in kwargs:
                 kwargs['imported'] = kwargs['imported'] # Map JSON 'imported' to python 'imported' attribute

             return FancyTask(**kwargs)
        elif db_type == "RecurringTasks":
             if '_id' not in kwargs or 'recurringType' not in kwargs or 'title' not in kwargs or 'parentId' not in kwargs or 'type' not in kwargs or 'createdAt' not in kwargs:
                 raise TypeError(f"Missing required arguments for RecurringTask: Need _id, recurringType, title, parentId, type, createdAt. Got keys: {list(kwargs.keys())}")
             return FancyRecurringTask(**kwargs)
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

             return FancyGoal(**kwargs)
        elif db_type == "Habits":
             if '_id' not in kwargs or 'title' not in kwargs or 'isPositive' not in kwargs or 'recordType' not in kwargs or 'showInDayView' not in kwargs or 'showInCalendar' not in kwargs or 'sendReminders' not in kwargs or 'createdAt' not in kwargs:
                 raise TypeError(f"Missing required arguments for Habit: Need _id, title, isPositive, recordType, showInDayView, showInCalendar, sendReminders, createdAt. Got keys: {list(kwargs.keys())}")
             return FancyHabit(**kwargs)
        elif db_type == "DayItems":
            if '_id' not in kwargs or 'createdAt' not in kwargs or 'timeGoals' not in kwargs:
                 raise TypeError(f"Missing required arguments for DayItem: Need _id, createdAt, timeGoals. Got keys: {list(kwargs.keys())}")
            return FancyDayItem(**kwargs)
        elif db_type == "ProfileItems":
            if '_id' not in kwargs or 'val' not in kwargs :
                 raise TypeError(f"Missing required arguments for ProfileItem: Need _id, val. Got keys: {list(kwargs.keys())}")
            return FancyProfileItem(**kwargs)
        elif db_type == "LocalStorageItems":
             if '_id' not in kwargs or 'val' not in kwargs :
                 raise TypeError(f"Missing required arguments for LocalStorageItem: Need _id, val. Got keys: {list(kwargs.keys())}")
             return FancyLocalStorageItem(**kwargs)
    except TypeError as e:
        print(f"Error creating object for db '{db_type}' with _id '{original_entry.get('_id', 'N/A')}': {e}")
        # print(f"Original Entry: {original_entry}") # Potentially verbose
        print(f"Processed Kwargs: {kwargs}")
        raise

    # Return original entry if no class matched or if db_type is missing/unknown
    # Log this occurrence?
    # print(f"Warning: No matching class found for db_type '{db_type}'. Returning raw entry.")
    return entry

# --- Translation Functions ---

def translate_fancy_to_slim(fancy_obj: Any) -> Any:
    """Translates a supported fancy object to its slim equivalent."""
    if isinstance(fancy_obj, FancyCategory):
        return SlimCategory(
            _id=fancy_obj._id,
            title=fancy_obj.title,
            parentId=fancy_obj.parentId,
            createdAt=fancy_obj.createdAt,
            updatedAt=fancy_obj.updatedAt,
            done=fancy_obj.done,
            doneDate=fancy_obj.doneDate,
            color=fancy_obj.color,
            icon=fancy_obj.icon,
            note=fancy_obj.note,
            db=fancy_obj.db,
            fieldUpdates=fancy_obj.fieldUpdates
        )
    elif isinstance(fancy_obj, FancyTask):
        # Note: Slim Task's __init__ uses snake_case for field_updates, but expects camelCase from JSON mapping
        # We pass the attribute as it exists in the fancy object (which was mapped from JSON camelCase)
        
        # Translate subtasks if they exist
        slim_subtasks = None
        if fancy_obj.subtasks and isinstance(fancy_obj.subtasks, dict):
            slim_subtasks = {}
            for sub_id, fancy_subtask in fancy_obj.subtasks.items():
                if isinstance(fancy_subtask, FancySubtask):
                    # Translate FancySubtask to SlimSubtask
                    slim_subtasks[sub_id] = SlimSubtask(
                        _id=fancy_subtask._id,
                        title=fancy_subtask.title,
                        done=fancy_subtask.done,
                        rank=fancy_subtask.rank
                        # SlimSubtask doesn't include timeEstimate, reminder fields, etc.
                    )
                else:
                     # If it's not a FancySubtask object already (e.g., raw dict?), pass it through?
                     # Or log a warning. For now, passing through.
                     slim_subtasks[sub_id] = fancy_subtask

        return SlimTask(
            _id=fancy_obj._id,
            createdAt=fancy_obj.createdAt,
            title=fancy_obj.title,
            parentId=fancy_obj.parentId,
            updatedAt=fancy_obj.updatedAt,
            dueDate=fancy_obj.dueDate,
            startDate=fancy_obj.startDate,
            endDate=fancy_obj.endDate,
            done=fancy_obj.done,
            doneAt=fancy_obj.doneAt,
            duration=fancy_obj.duration,
            times=fancy_obj.times,
            isStarred=fancy_obj.isStarred,
            isFrogged=fancy_obj.isFrogged,
            recurring=fancy_obj.recurring,
            recurringTaskId=fancy_obj.recurringTaskId,
            # Slim Task doesn't explicitly handle Subtask objects in its __init__
            # Pass the translated slim_subtasks dictionary
            subtasks=slim_subtasks,
            labelIds=fancy_obj.labelIds,
            timeEstimate=fancy_obj.timeEstimate,
            note=fancy_obj.note,
            dependsOn=fancy_obj.dependsOn,
            backburner=fancy_obj.backburner,
            generatedAt=fancy_obj.generatedAt,
            echoedAt=fancy_obj.echoedAt,
            deletedAt=fancy_obj.deletedAt,
            restoredAt=fancy_obj.restoredAt,
            rewardPoints=fancy_obj.rewardPoints,
            taskTime=fancy_obj.taskTime,
            reminderOffset=fancy_obj.reminderOffset,
            reminderTime=fancy_obj.reminderTime,
            db=fancy_obj.db,
            field_updates=fancy_obj.fieldUpdates # Pass the dict directly
        )
    elif isinstance(fancy_obj, FancyRecurringTask):
        # Slim RecurringTask maps snake_case params (updated_at, field_updates, end_in)
        # from the fancy object's attributes (which might have different names if mapped)
        return SlimRecurringTask(
            _id=fancy_obj._id,
            type=fancy_obj.type,
            createdAt=fancy_obj.createdAt,
            day=fancy_obj.day,
            date=fancy_obj.date,
            weekDays=fancy_obj.weekDays,
            repeat=fancy_obj.repeat,
            repeatStart=fancy_obj.repeatStart,
            limitToWeekdays=fancy_obj.limitToWeekdays,
            dueIn=fancy_obj.dueIn,
            echoDays=fancy_obj.echoDays,
            customRecurrence=fancy_obj.customRecurrence,
            db=fancy_obj.db,
            updated_at=fancy_obj.updatedAt, # Map fancy camelCase 'updatedAt' to slim snake_case 'updated_at'
            field_updates=fancy_obj.fieldUpdates, # Map fancy camelCase 'fieldUpdates' to slim snake_case 'field_updates'
            end_in=fancy_obj.endIn # Map fancy camelCase 'endIn' to slim snake_case 'end_in'
        )
    elif isinstance(fancy_obj, FancyHabit):
         # Slim Habit maps snake_case params (updated_at, field_updates)
         return SlimHabit(
            _id=fancy_obj._id,
            title=fancy_obj.title,
            isPositive=fancy_obj.isPositive,
            recordType=fancy_obj.recordType,
            createdAt=fancy_obj.createdAt,
            note=fancy_obj.note,
            color=fancy_obj.color,
            parentId=fancy_obj.parentId,
            labelIds=fancy_obj.labelIds,
            isStarred=fancy_obj.isStarred,
            isFrogged=fancy_obj.isFrogged,
            timeEstimate=fancy_obj.timeEstimate,
            startDate=fancy_obj.startDate,
            endDate=fancy_obj.endDate,
            units=fancy_obj.units,
            period=fancy_obj.period,
            target=fancy_obj.target,
            askOn=fancy_obj.askOn,
            time=fancy_obj.time,
            showAfterSuccess=fancy_obj.showAfterSuccess,
            showAfterRecord=fancy_obj.showAfterRecord,
            done=fancy_obj.done,
            history=fancy_obj.history,
            dismissed=fancy_obj.dismissed,
            db=fancy_obj.db,
            field_updates=fancy_obj.fieldUpdates, # Map fancy camelCase to slim snake_case
            updated_at=fancy_obj.updatedAt # Map fancy camelCase to slim snake_case
         )
    # If no slim version exists or it's not a supported type, return original object or None/error?
    # Returning original object for now for unsupported types (Goals, DayItems etc.)
    return fancy_obj


def load_data_from_file(file_path: str) -> DefaultDict[str, Dict[str, Any]]:
    """Loads Marvin data, parses into fancy objects, translates to slim objects, and organizes by type."""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            json_data = json.load(file)
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
        raise # Re-raise the exception
    except json.JSONDecodeError:
        print(f"Error: '{file_path}' is not a valid JSON file.")
        raise # Re-raise the exception

    # Parse each entry in the JSON data using fancy classes
    parsed_entries = [parse_json_entry(entry) for entry in json_data]

    # Organize fancy entries into tables by class type with _id as the index
    fancy_tables = defaultdict(dict)
    for entry in parsed_entries:
        # Check if it's one of our custom class instances or just raw data
        if hasattr(entry, 'db') and hasattr(entry, '_id'):
            fancy_tables[entry.db][entry._id] = entry
        # Optional: Handle entries that couldn't be fully parsed or didn't fit schema
        # else:
        #    print(f"Warning: Could not properly categorize entry: {entry}")

    # Translate fancy objects to slim objects where possible
    slim_tables = defaultdict(dict)
    for db_type, table_data in fancy_tables.items():
        for entry_id, fancy_entry in table_data.items():
             slim_entry = translate_fancy_to_slim(fancy_entry)
             # Use the db attribute from the *slim* entry if translation occurred,
             # otherwise use the original db_type.
             current_db_type = getattr(slim_entry, 'db', "drop")
             if current_db_type != "drop":
                slim_tables[current_db_type][entry_id] = slim_entry

    return slim_tables # Return tables containing slim objects (or original for non-translated)

# Main execution block for running this script directly
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python marvin_parser.py <json_file_path>")
        sys.exit(1)

    input_file_path = sys.argv[1]

    try:
        loaded_tables = load_data_from_file(input_file_path)

        # Print the top 3 entries from each table (now containing slim objects) for summary
        print("\n=== Database Tables Summary (Slim Objects) ===")
        for table_name, table_data in loaded_tables.items():
            print(f"\nTable: {table_name} (Total entries: {len(table_data)})")
            count = 0
            for entry_id, entry in table_data.items():
                if count < 3:  # Only print the first 3 entries
                    print(f"  {count+1}. {entry}")
                    count += 1
                else:
                    break
            if len(table_data) > 3:
                print("  ...")

    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

