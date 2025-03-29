/**
 * Type definitions for the Todo API.
 */

/**
 * Represents a Todo item.
 */
export interface Todo {
  /** Unique identifier for the todo */
  id: string;
  /** Title/description of the todo */
  title: string;
  /** Whether the todo has been completed */
  completed: boolean;
  /** Priority level of the todo */
  priority: 'low' | 'medium' | 'high';
  /** Creation timestamp */
  createdAt: Date;
}

/**
 * Parameters for creating a new Todo.
 */
export interface CreateTodoParams {
  title: string;
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Parameters for listing todos with optional filtering.
 */
export interface ListTodosParams {
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
}

/**
 * Response from the Todo API methods.
 * Generic type T represents the data payload.
 */
export interface TodoApiResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
} 