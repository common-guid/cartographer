/**
 * Task utilities and data.
 * Defines core Task type and helper functions.
 * Ground truth: these function names should be recoverable by JS Cartographer.
 */

export const TaskStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in-progress',
  COMPLETED: 'completed',
};

export function createTask(id, title, description, status, priority) {
  return {
    id,
    title,
    description,
    status,
    priority,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function updateTaskStatus(task, newStatus) {
  return {
    ...task,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
}

export function calculateTaskPriority(urgency) {
  if (urgency > 80) return 'critical';
  if (urgency > 60) return 'high';
  if (urgency > 30) return 'medium';
  return 'low';
}
