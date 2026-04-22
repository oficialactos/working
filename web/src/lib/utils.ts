import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Safely merges class names with Tailwind CSS support.
 * Uses clsx for conditional classes and tailwind-merge to handle collisions.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatName(name?: string | null, fallback: string = 'Usuário') {
  if (!name || name.includes('@')) return fallback;
  return name;
}

