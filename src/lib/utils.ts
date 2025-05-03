import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Combine & merge Tailwind classes
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}