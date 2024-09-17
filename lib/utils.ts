import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function isEmpty(value: any) {
  return value == null || (typeof value === 'string' && value.trim().length === 0)
}
