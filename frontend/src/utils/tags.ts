import type { Task } from '../types';

const TAG_PATTERN = /(^|\s)#([A-Za-z0-9_-]+)/g;

/**
 * Extract implicit tags (hashtags) from freeform text.
 */
export const extractImplicitTags = (text?: string): string[] => {
  if (!text) return [];

  const matches = Array.from(text.matchAll(TAG_PATTERN));
  const tags = matches.map((match) => match[2].toLowerCase());

  return Array.from(new Set(tags));
};

/**
 * Compute implicit tags for a task from its title and descriptions.
 */
export const getImplicitTagsForTask = (task: Task): string[] => {
  const parts = [task.title, task.text_description, task.description];
  const tags = parts.flatMap((part) => extractImplicitTags(part));

  return Array.from(new Set(tags));
};

/**
 * Merge explicit task tags with implicit hashtags, preserving explicit tag casing.
 */
export const getCombinedTags = (task: Task): string[] => {
  const seen = new Set<string>();
  const combined: string[] = [];

  for (const tag of task.tags) {
    const key = tag.toLowerCase();
    if (!seen.has(key)) {
      combined.push(tag);
      seen.add(key);
    }
  }

  for (const implicit of getImplicitTagsForTask(task)) {
    if (!seen.has(implicit)) {
      combined.push(implicit);
      seen.add(implicit);
    }
  }

  return combined;
};
