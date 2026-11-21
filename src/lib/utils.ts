import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines multiple class values into a single className string using clsx and tailwind-merge.
 * This utility helps with conditional classes and prevents Tailwind CSS conflicts.
 * @param inputs - Class values to be combined
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// For backward compatibility with existing code
export function classNames(...classes: (string | undefined | null | false | Record<string, boolean>)[]) {
  return classes
    .filter(Boolean)
    .map(c => {
      if (typeof c === 'object') {
        return Object.entries(c)
          .filter(([_, value]) => Boolean(value))
          .map(([key]) => key)
          .join(' ');
      }
      return c;
    })
    .join(' ');
}
