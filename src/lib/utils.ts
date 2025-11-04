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

export function formatCurrency(num: number) {
  return num.toLocaleString('en-PK', {
    style: 'currency',
    currency: 'PKR',
    notation: 'compact',
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  }).replace(/\u00A0/g, ' ');
}