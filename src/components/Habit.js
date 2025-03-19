class Habit {
  constructor(title, icon = null, description = '', startDate = null, dueDate = null, importance = 'Low', difficulty = 'Trivial', duration = 'Trivial', dependencies = [], subtasks = [], tags = [], projects = [], history = [], recurrence = null, startDateDelta = 0, stats = { bestStreak: 0, currentStreak: 0, completionPercentage: 0 }) {
    this.title = title;
    this.icon = icon;
    this.description = description;
    this.startDate = startDate;
    this.dueDate = dueDate;
    this.importance = importance;
    this.difficulty = difficulty;
    this.duration = duration;
    this.dependencies = dependencies;
    this.subtasks = subtasks;
    this.tags = tags;
    this.projects = projects;
    this.history = history;
    this.recurrence = recurrence;
    this.startDateDelta = startDateDelta;
    this.stats = stats;
  }

  addDependency(task) {
    this.dependencies.push(task);
    this.history.push(`Added dependency: ${task.title}`);
  }

  removeDependency(task) {
    this.dependencies = this.dependencies.filter(dep => dep !== task);
    this.history.push(`Removed dependency: ${task.title}`);
  }

  addSubtask(subtask) {
    this.subtasks.push(subtask);
    this.history.push(`Added subtask: ${subtask.title}`);
  }

  removeSubtask(subtask) {
    this.subtasks = this.subtasks.filter(st => st !== subtask);
    this.history.push(`Removed subtask: ${subtask.title}`);
  }

  addTag(tag) {
    this.tags.push(tag);
    this.history.push(`Added tag: ${tag}`);
  }

  removeTag(tag) {
    this.tags = this.tags.filter(t => t !== tag);
    this.history.push(`Removed tag: ${tag}`);
  }

  addProject(project) {
    this.projects.push(project);
    this.history.push(`Added project: ${project}`);
  }

  removeProject(project) {
    this.projects = this.projects.filter(p => p !== project);
    this.history.push(`Removed project: ${project}`);
  }

  editTask(details) {
    Object.assign(this, details);
    this.history.push(`Edited task: ${this.title}`);
  }

  deleteTask() {
    this.history.push(`Deleted task: ${this.title}`);
  }

  setRecurrence(recurrence) {
    this.recurrence = recurrence;
    this.history.push(`Set recurrence: ${recurrence}`);
  }

  setStartDateDelta(delta) {
    this.startDateDelta = delta;
    this.history.push(`Set start date delta: ${delta}`);
  }

  updateStats(stats) {
    this.stats = stats;
    this.history.push(`Updated stats: ${JSON.stringify(stats)}`);
  }

  getHeatViewCalendar() {
    // Code for generating heat view calendar based on habit completion
    console.log('Heat view calendar generated');
  }
}
