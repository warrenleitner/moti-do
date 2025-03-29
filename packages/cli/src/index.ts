#!/usr/bin/env node

/**
 * Main entry point for the moti-do CLI application.
 * This serves as a thin wrapper around the TodoApi in the shared package.
 * The UI will use the same TodoApi, ensuring consistent behavior.
 */

import { Command } from 'commander';
import { 
  TodoApi, 
  type CreateTodoParams, 
  type ListTodosParams, 
  type Todo
} from 'moti-do-shared';
import chalk from 'chalk';

// Create the main command instance
const program = new Command();

program
  .name('moti-do')
  .description('CLI for the Moti-Do todo application')
  .version('0.1.0');

/**
 * Helper function to pretty-print todo items
 */
function formatTodo(todo: Todo) {
  const completed = todo.completed ? chalk.green('✓') : chalk.red('✗');
  const priorityColors: Record<string, string> = {
    'high': chalk.red(todo.priority),
    'medium': chalk.yellow(todo.priority),
    'low': chalk.blue(todo.priority)
  };
  
  const priority = priorityColors[todo.priority] || todo.priority;
  
  return `${completed} [${priority}] ${todo.title} (ID: ${todo.id})`;
}

// Add a new todo
program
  .command('add')
  .description('Add a new todo')
  .requiredOption('-t, --title <title>', 'Title of the todo item')
  .option('-p, --priority <priority>', 'Priority (low, medium, high)', 'medium')
  .action((options) => {
    const params: CreateTodoParams = {
      title: options.title,
      priority: options.priority as 'low' | 'medium' | 'high'
    };
    
    const result = TodoApi.createTodo(params);
    
    if (result.success) {
      console.log(chalk.green('Todo created successfully!'));
      if (result.data) {
        console.log(formatTodo(result.data));
      }
    } else {
      console.error(chalk.red(result.message));
    }
  });

// List todos
program
  .command('list')
  .description('List all todos')
  .option('-c, --completed', 'Show only completed todos')
  .option('-i, --incomplete', 'Show only incomplete todos')
  .option('-p, --priority <priority>', 'Filter by priority (low, medium, high)')
  .action((options) => {
    const params: ListTodosParams = {};
    
    if (options.completed) {
      params.completed = true;
    } else if (options.incomplete) {
      params.completed = false;
    }
    
    if (options.priority) {
      params.priority = options.priority as 'low' | 'medium' | 'high';
    }
    
    const result = TodoApi.listTodos(params);
    
    if (result.success && result.data) {
      console.log(chalk.bold('Todo List:'));
      
      if (result.data.length === 0) {
        console.log(chalk.yellow('No todos found.'));
      } else {
        result.data.forEach((todo: Todo) => {
          console.log(formatTodo(todo));
        });
      }
    } else {
      console.error(chalk.red(result.message));
    }
  });

// Complete/uncomplete a todo
program
  .command('complete')
  .description('Mark a todo as completed or incomplete')
  .requiredOption('-i, --id <id>', 'ID of the todo')
  .option('-u, --undo', 'Mark as incomplete instead of complete')
  .action((options) => {
    const result = TodoApi.updateTodoStatus(options.id, !options.undo);
    
    if (result.success) {
      console.log(chalk.green(result.message));
      if (result.data) {
        console.log(formatTodo(result.data));
      }
    } else {
      console.error(chalk.red(result.message));
    }
  });

// Delete a todo
program
  .command('delete')
  .description('Delete a todo')
  .requiredOption('-i, --id <id>', 'ID of the todo')
  .action((options) => {
    const result = TodoApi.deleteTodo(options.id);
    
    if (result.success) {
      console.log(chalk.green(result.message));
    } else {
      console.error(chalk.red(result.message));
    }
  });

// Demo command to create sample todos (for testing)
program
  .command('demo')
  .description('Create sample todos for testing')
  .action(() => {
    TodoApi.createTodo({ title: 'Buy groceries', priority: 'high' });
    TodoApi.createTodo({ title: 'Finish project', priority: 'high' });
    TodoApi.createTodo({ title: 'Call mom', priority: 'medium' });
    TodoApi.createTodo({ title: 'Exercise', priority: 'low' });
    
    // Mark one as completed
    const list = TodoApi.listTodos();
    if (list.success && list.data && list.data.length > 0) {
      TodoApi.updateTodoStatus(list.data[0].id, true);
    }
    
    console.log(chalk.green('Sample todos created!'));
    
    // Show all todos
    const result = TodoApi.listTodos();
    if (result.success && result.data) {
      console.log(chalk.bold('Todo List:'));
      result.data.forEach((todo: Todo) => {
        console.log(formatTodo(todo));
      });
    }
  });

// Parse the command-line arguments
program.parse(process.argv);

// If no command was provided, display help
if (!process.argv.slice(2).length) {
  program.outputHelp();
} 