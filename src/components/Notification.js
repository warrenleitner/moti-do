class Notification {
  constructor() {
    this.notifications = [];
    this.vacationMode = false;
  }

  addNotification(task) {
    this.notifications.push(`Task "${task.title}" is due!`);
  }

  displayNotifications() {
    this.notifications.forEach(notification => {
      console.log(notification);
    });
  }

  clearNotifications() {
    this.notifications = [];
  }

  setVacationMode(enabled) {
    this.vacationMode = enabled;
    if (enabled) {
      console.log('Vacation mode enabled. Score calculation paused.');
    } else {
      console.log('Vacation mode disabled. Score calculation resumed.');
    }
  }
}
