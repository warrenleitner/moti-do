class Score {
  constructor() {
    this.xp = 0;
    this.rewardBadges = [];
  }

  calculateTaskScore(task) {
    let score = 0;

    // Add score based on optional fields
    if (task.icon) score += 1;
    if (task.description) score += 1;
    if (task.startDate) score += 1;
    if (task.dueDate) score += 2;
    if (task.importance) score += this.getImportanceScore(task.importance);
    if (task.difficulty) score += this.getDifficultyScore(task.difficulty);
    if (task.duration) score += this.getDurationScore(task.duration);
    if (task.dependencies.length > 0) score += task.dependencies.length;
    if (task.subtasks.length > 0) score += task.subtasks.length;
    if (task.tags.length > 0) score += task.tags.length;
    if (task.projects.length > 0) score += task.projects.length;
    if (task.history.length > 0) score += task.history.length;

    // Add score based on task properties
    score += this.getPriorityScore(task.importance);
    score += this.getDueDateProximityScore(task.dueDate);
    score += this.getStartDateProximityScore(task.startDate);
    score += this.getTaskAgeScore(task.creationDate);
    score += this.getDifficultyScore(task.difficulty);
    score += this.getDurationScore(task.duration);
    if (task.next) score += 5;
    if (task.inProgress) score += 3;
    score += this.getDependencyScore(task.dependencies);
    if (task.habit) score += this.getHabitStreakScore(task.habit);

    return score;
  }

  getImportanceScore(importance) {
    switch (importance) {
      case 'Low': return 1;
      case 'Medium': return 2;
      case 'High': return 3;
      case 'Defcon One': return 4;
      default: return 0;
    }
  }

  getDifficultyScore(difficulty) {
    switch (difficulty) {
      case 'Trivial': return 1;
      case 'Low': return 2;
      case 'Medium': return 3;
      case 'High': return 4;
      case 'Herculean': return 5;
      default: return 0;
    }
  }

  getDurationScore(duration) {
    switch (duration) {
      case 'Trivial': return 1;
      case 'Short': return 2;
      case 'Medium': return 3;
      case 'Long': return 4;
      case 'Odysseyan': return 5;
      default: return 0;
    }
  }

  getPriorityScore(importance) {
    return this.getImportanceScore(importance) * 5;
  }

  getDueDateProximityScore(dueDate) {
    if (!dueDate) return 0;
    const now = new Date();
    const due = new Date(dueDate);
    const diff = (due - now) / (1000 * 60 * 60 * 24); // difference in days
    return Math.max(0, 10 - diff);
  }

  getStartDateProximityScore(startDate) {
    if (!startDate) return 0;
    const now = new Date();
    const start = new Date(startDate);
    const diff = (now - start) / (1000 * 60 * 60 * 24); // difference in days
    return Math.max(0, diff);
  }

  getTaskAgeScore(creationDate) {
    if (!creationDate) return 0;
    const now = new Date();
    const creation = new Date(creationDate);
    const diff = (now - creation) / (1000 * 60 * 60 * 24); // difference in days
    return Math.max(0, diff);
  }

  getDependencyScore(dependencies) {
    return dependencies.reduce((acc, dep) => acc + this.calculateTaskScore(dep), 0);
  }

  getHabitStreakScore(habit) {
    return habit.stats.currentStreak;
  }

  displayTaskScore(task) {
    const score = this.calculateTaskScore(task);
    console.log(`Task: ${task.title}, Score: ${score}`);
  }

  manageXP(points) {
    this.xp += points;
    console.log(`XP updated: ${this.xp}`);
  }

  addRewardBadge(badge) {
    this.rewardBadges.push(badge);
    console.log(`Reward badge added: ${badge}`);
  }
}
