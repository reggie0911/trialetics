import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a phone number string to match the format: +1 (555) 000-0000
 * Removes all non-digit characters and formats as user types
 * Always includes +1 country code prefix
 */
export function formatPhoneNumber(value: string): string {
  // Remove all non-digit characters
  const digits = value.replace(/\D/g, '');
  
  // Handle empty input
  if (!digits) return '';
  
  // If starts with 1, treat as country code
  if (digits[0] === '1') {
    const areaCode = digits.slice(1, 4);
    const firstPart = digits.slice(4, 7);
    const secondPart = digits.slice(7, 11);
    
    if (digits.length === 1) {
      return '+1';
    } else if (digits.length <= 4) {
      return `+1 (${areaCode}`;
    } else if (digits.length <= 7) {
      return `+1 (${areaCode}) ${firstPart}`;
    } else {
      return `+1 (${areaCode}) ${firstPart}-${secondPart}`;
    }
  }
  
  // Format without country code (assume US number, add +1 prefix)
  if (digits.length <= 3) {
    return `+1 (${digits}`;
  } else if (digits.length <= 6) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
  } else {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  }
}

/**
 * Capitalizes the first letter of a string
 * Preserves the rest of the string as-is
 */
export function capitalizeFirstLetter(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}
