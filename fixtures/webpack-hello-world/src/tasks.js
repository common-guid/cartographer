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

export function calculateTaskPriority(urgencyScore) {
  if (urgencyScore > 80) return 'critical';
  if (urgencyScore > 60) return 'high';
  if (urgencyScore > 30) return 'medium';
  return 'low';
}

export function createTask(id, title, description, status, urgencyScore) {
  const priority = calculateTaskPriority(urgencyScore);
  return {
    id,
    title,
    description,
    status,
    priority,
    urgencyScore,
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
