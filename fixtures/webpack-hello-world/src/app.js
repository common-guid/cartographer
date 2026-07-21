/**
 * Task Manager Application entry point.
 * Ties together tasks, storage, and filtering modules.
 * The cross-file call graph here is the ground truth for Phase 5 validation.
 */

import { createTask, updateTaskStatus, TaskStatus } from './tasks';
import { TaskStore } from './storage';
import { filterTasksByStatus, filterTasksByPriority, searchTasks, getTaskStats, transformTasks } from './filters';

function displayTaskList(tasks, stats) {
  console.log('=== Task Manager ===');
  console.log(`Total Tasks: ${stats.total} | Completed: ${stats.completed} | Completion Rate: ${stats.completionRate}%`);
  tasks.forEach((task, index) => {
    console.log(`${index + 1}. [${task.priority}] ${task.title} (${task.status})`);
  });
}

async function initializeApp() {
  const store = new TaskStore('TaskDB');

  // Create tasks with urgency scores (calls createTask -> calculateTaskPriority)
  const task1 = createTask(1, 'Review pull requests', 'Check 3 open PRs for code quality', TaskStatus.IN_PROGRESS, 70);
  const task2 = createTask(2, 'Write unit tests', 'Complete test coverage for auth module', TaskStatus.PENDING, 90);
  const task3 = createTask(3, 'Update documentation', 'Refresh API docs with v2 changes', TaskStatus.COMPLETED, 40);

  store.addTask(task1);
  store.addTask(task2);
  store.addTask(task3);

  const allTasks = store.getAllTasks();
  const allStats = getTaskStats(allTasks);
  displayTaskList(allTasks, allStats);

  // Conditional path: Filter by priority if tasks exist
  if (allStats.total > 0) {
    const highPriorityTasks = await filterTasksByPriority(allTasks, 'high');
    console.log(`\n[High Priority Tasks: ${highPriorityTasks.length}]`);
  }

  // Search tasks
  const searchResults = await searchTasks(allTasks, 'test');
  const searchStats = getTaskStats(searchResults);
  displayTaskList(searchResults, searchStats);

  // Higher-order function / callback invocation across modules
  const highlightedTasks = transformTasks(allTasks, (task) => updateTaskStatus(task, TaskStatus.COMPLETED));
  console.log(`\n[Transformed ${highlightedTasks.length} tasks via callback]`);

  // Update & Remove Task calls
  const targetTask = store.getTaskById(1);
  if (targetTask) {
    store.updateTask(1, { status: TaskStatus.COMPLETED });
  }
  const removed = store.removeTask(2);
  console.log(`\n[Removed Task]: ${removed ? removed.title : 'None'}`);

  const finalTasks = store.getAllTasks();
  console.log(`\n[Final Stats] ${store.saveToStorage()}`);
}

initializeApp().catch(console.error);
