/**
 * TodoApi - Core implementation of Todo operations.
 *
 * This is the actual implementation that both CLI and UI will use.
 * It provides a consistent API that can be called from any interface.
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  Todo, 
  CreateTodoParams, 
  ListTodosParams, 
  TodoApiResponse 
} from '../types.js';

/**
 * In-memory storage for todos.
 * In a real app, this would be replaced with a database or persistence layer.
 */
const todos: Todo[] = [];

/**
 * TodoApi class containing methods for managing todos.
 */
export class TodoApi {
  /**
   * Creates a new todo item.
   * 
   * @param params - Todo creation parameters
   * @returns API response with the created todo
   */
  static createTodo(params: CreateTodoParams): TodoApiResponse<Todo> {
    try {
      const newTodo: Todo = {
        id: uuidv4(),
        title: params.title,
        completed: false,
        priority: params.priority || 'medium',
        createdAt: new Date()
      };
      
      todos.push(newTodo);
      
      return {
        success: true,
        message: 'Todo created successfully',
        data: newTodo
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create todo: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Lists all todos, with optional filtering.
   * 
   * @param params - Optional filtering parameters
   * @returns API response with array of matching todos
   */
  static listTodos(params?: ListTodosParams): TodoApiResponse<Todo[]> {
    try {
      let filteredTodos = [...todos];
      
      // Apply filters if provided
      if (params) {
        if (params.completed !== undefined) {
          filteredTodos = filteredTodos.filter(todo => todo.completed === params.completed);
        }
        
        if (params.priority) {
          filteredTodos = filteredTodos.filter(todo => todo.priority === params.priority);
        }
      }
      
      return {
        success: true,
        message: `Found ${filteredTodos.length} todos`,
        data: filteredTodos
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to list todos: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Marks a todo as completed or not completed.
   * 
   * @param id - ID of the todo to update
   * @param completed - New completed status
   * @returns API response with the updated todo
   */
  static updateTodoStatus(id: string, completed: boolean): TodoApiResponse<Todo> {
    try {
      const todoIndex = todos.findIndex(todo => todo.id === id);
      
      if (todoIndex === -1) {
        return {
          success: false,
          message: `Todo with ID ${id} not found`
        };
      }
      
      todos[todoIndex] = {
        ...todos[todoIndex],
        completed
      };
      
      return {
        success: true,
        message: `Todo ${completed ? 'completed' : 'marked as incomplete'}`,
        data: todos[todoIndex]
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to update todo: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Deletes a todo by ID.
   * 
   * @param id - ID of the todo to delete
   * @returns API response indicating success or failure
   */
  static deleteTodo(id: string): TodoApiResponse {
    try {
      const initialLength = todos.length;
      const newTodos = todos.filter(todo => todo.id !== id);
      
      if (newTodos.length === initialLength) {
        return {
          success: false,
          message: `Todo with ID ${id} not found`
        };
      }
      
      // Replace the todos array with the filtered version
      todos.length = 0;
      todos.push(...newTodos);
      
      return {
        success: true,
        message: 'Todo deleted successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to delete todo: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
} 