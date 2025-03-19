class Calendar {
  constructor() {
    this.tasks = [];
    this.habits = [];
  }

  addTask(task) {
    this.tasks.push(task);
  }

  addHabit(habit) {
    this.habits.push(habit);
  }

  displayTasks() {
    // Code for displaying tasks on the calendar
    console.log('Tasks displayed on the calendar');
  }

  displayHabits() {
    // Code for displaying habits on the calendar
    console.log('Habits displayed on the calendar');
  }

  displayHeatView() {
    // Code for displaying the heat view of task and habit completion
    console.log('Heat view displayed');
  }
}
