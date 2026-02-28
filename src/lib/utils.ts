import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  return new Date(date).toLocaleDateString('en-US', {
    dateStyle: 'medium'
  });
}

export function formatNumber(num: number) {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
}

export function formatCurrency(num: number | undefined | null) {
  if (num === undefined || num === null || typeof num !== 'number') {
    return 'Rs 0';
  }

  return num
    .toLocaleString('en-PK', {
      style: 'currency',
      currency: 'PKR',
      notation: num > 1_000_000 ? 'compact' : 'standard',
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    })
    .replace(/\u00A0/g, ' ');
}

export function getToday() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert a date string (YYYY-MM-DD) to UTC midnight Date object
 * This ensures dates are stored consistently in the database without timezone issues
 */
export function dateStringToUTC(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}
