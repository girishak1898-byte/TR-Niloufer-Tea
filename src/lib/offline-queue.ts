import type { QueuedAction } from './types';

const QUEUE_KEY = 'chai-shop-offline-queue';

export function getQueue(): QueuedAction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addToQueue(action: string, payload: Record<string, unknown>): void {
  const queue = getQueue();
  queue.push({
    id: crypto.randomUUID(),
    action,
    payload,
    created_at: new Date().toISOString(),
    retries: 0,
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function removeFromQueue(id: string): void {
  const queue = getQueue().filter((item) => item.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

export function getQueueLength(): number {
  return getQueue().length;
}
