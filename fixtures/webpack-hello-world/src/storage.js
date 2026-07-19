/**
 * Task storage layer — simulates persistent storage.
 * Uses class pattern to exercise Wakaru's un-es6-class restoration.
 * Imports from tasks.js to create a cross-file dependency.
 */

import { TaskStatus } from './tasks';

export class TaskStore {
  constructor(storeName) {
    this.storeName = storeName;
    this.tasks = [];
  }

  addTask(task) {
    this.tasks.push(task);
    return task;
  }

  updateTask(taskId, updates) {
    const task = this.tasks.find((t) => t.id === taskId);
    if (task) {
      Object.assign(task, updates, { updatedAt: new Date().toISOString() });
    }
    return task;
  }

  removeTask(taskId) {
    const index = this.tasks.findIndex((t) => t.id === taskId);
    if (index !== -1) {
      return this.tasks.splice(index, 1)[0];
    }
    return null;
  }

  getTaskById(taskId) {
    return this.tasks.find((t) => t.id === taskId);
  }

  getAllTasks() {
    return this.tasks;
  }

  saveToStorage() {
    const serialized = JSON.stringify(this.tasks);
    return `[${this.storeName}] Saved ${this.tasks.length} tasks (${serialized.length} bytes)`;
  }
}
