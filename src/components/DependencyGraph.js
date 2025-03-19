class DependencyGraph {
  constructor() {
    this.tasks = [];
  }

  addTask(task) {
    this.tasks.push(task);
  }

  displayDependencyGraph() {
    // Code for displaying the dependency graph of tasks
    console.log('Dependency graph displayed');
  }

  filterDependencyGraph(task) {
    // Code for filtering the dependency graph
    console.log(`Dependency graph filtered for task: ${task.title}`);
  }
}
