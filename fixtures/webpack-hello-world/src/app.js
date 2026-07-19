/**
 * Task Manager Application entry point.
 * Ties together tasks, storage, and filtering modules.
 * The cross-file call graph here is the ground truth for Phase 5 validation.
 *
 * Expected call graph edges:
 *   app.js:initializeApp -> storage.js:TaskStore (constructor + methods)
 *   app.js:initializeApp -> tasks.js:createTask
 *   app.js:initializeApp -> filters.js:filterTasksByStatus
 *   app.js:initializeApp -> filters.js:getTaskStats
 *   app.js:displayTaskList -> filters.js:searchTasks
 *   app.js:displayTaskList -> filters.js:getTaskStats
 */

import { createTask, updateTaskStatus, TaskStatus } from './tasks';
import { TaskStore } from './storage';
import { filterTasksByStatus, searchTasks, getTaskStats } from './filters';

function displayTaskList(tasks, stats) {
  console.log('=== Task Manager ===' );
  console.log(`Total Tasks: ${stats.total} | Completed: ${stats.completed} | Completion Rate: ${stats.completionRate}%`);
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. [${task.priority}] ${task.title} (${task.status})`);
  });
}

async function initializeApp() {
  // Initialize store
  const store = new TaskStore('TaskDB');

  // Create dummy tasks
  const task1 = createTask(1, 'Review pull requests', 'Check 3 open PRs for code quality', TaskStatus.IN_PROGRESS, 'high');
  const task2 = createTask(2, 'Write unit tests', 'Complete test coverage for auth module', TaskStatus.PENDING, 'critical');
  const task3 = createTask(3, 'Update documentation', 'Refresh API docs with v2 changes', TaskStatus.COMPLETED, 'medium');
  const task4 = createTask(4, 'Deploy to staging', 'Run integration tests and deploy', TaskStatus.PENDING, 'high');
  const task5 = createTask(5, 'Fix null reference bug', 'Resolve issue #1247 in error handler', TaskStatus.IN_PROGRESS, 'critical');

  // Add tasks to store
  store.addTask(task1);
  store.addTask(task2);
  store.addTask(task3);
  store.addTask(task4);
  store.addTask(task5);

  // Display all tasks
  const allTasks = store.getAllTasks();
  const allStats = getTaskStats(allTasks);
  displayTaskList(allTasks, allStats);

  // Filter pending tasks
  const pendingTasks = await filterTasksByStatus(allTasks, TaskStatus.PENDING);
  console.log(`\n[Pending Tasks: ${pendingTasks.length}]`);
  const pendingStats = getTaskStats(pendingTasks);
  displayTaskList(pendingTasks, pendingStats);

  // Search for tasks
  const searchResults = await searchTasks(allTasks, 'test');
  console.log(`\n[Search Results for 'test': ${searchResults.length}]`);
  const searchStats = getTaskStats(searchResults);
  displayTaskList(searchResults, searchStats);

  // Update a task status
  const completedTask = store.updateTask(1, { status: TaskStatus.COMPLETED });
  console.log(`\n[Updated Task] ${completedTask.title} -> ${completedTask.status}`);

  // Final stats
  const finalTasks = store.getAllTasks();
  const finalStats = getTaskStats(finalTasks);
  console.log(`\n[Final Stats] ${store.saveToStorage()}`);
  console.log(`Completion: ${finalStats.completed}/${finalStats.total} (${finalStats.completionRate}%)`);
}

initializeApp().catch(console.error);
