/**
 * Task filtering module.
 * async/await here will be transpiled to generator state machines by Babel (ES5 target),
 * which is exactly what Wakaru's un-async-await rule is designed to restore.
 * Imports from both tasks.js and storage.js to create multiple cross-file edges.
 */

import { TaskStatus } from './tasks';

export async function filterTasksByStatus(tasks, targetStatus) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(tasks.filter((task) => task.status === targetStatus));
    }, 5);
  });
}

export async function filterTasksByPriority(tasks, minPriority) {
  const priorityMap = { low: 1, medium: 2, high: 3, critical: 4 };
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(
        tasks.filter((task) => priorityMap[task.priority] >= priorityMap[minPriority]),
      );
    }, 5);
  });
}

export async function searchTasks(tasks, query) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      resolve(
        tasks.filter(
          (task) =>
            task.title.toLowerCase().includes(lowerQuery) ||
            task.description.toLowerCase().includes(lowerQuery),
        ),
      );
    }, 8);
  });
}

export function getTaskStats(tasks) {
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
    pending: tasks.filter((t) => t.status === TaskStatus.PENDING).length,
    inProgress: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
  };
  stats.completionRate = stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(1) : 0;
  return stats;
}
