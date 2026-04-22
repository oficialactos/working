/**
 * Standalone utility to safely merge class names.
 * Removes dependencies on 'clsx' and 'tailwind-merge' to ensure
 * the project builds in restricted environments.
 */
export function cn(...inputs: any[]) {
  return inputs
    .flat()
    .filter(Boolean)
    .join(" ")
}

export function formatName(name?: string | null, fallback: string = 'Usuário') {
  if (!name || name.includes('@')) return fallback;
  return name;
}
