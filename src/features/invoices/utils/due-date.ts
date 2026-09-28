/**
 * Raised when an invoice's due date falls before its invoice date.
 * Kept in its own (non `use server`) module so callers can check the error type
 * - server action files may only export async functions.
 */
export class DueDateError extends Error {}

/**
 * Guards the invoice date / due date pair. The due date must land on or after
 * the invoice date - the same day is allowed, only an earlier one is not.
 * Works with YYYY-MM-DD strings and Date objects alike.
 */
export function assertDueDateOnOrAfterInvoiceDate(
  date?: Date | string | null,
  dueDate?: Date | string | null
): void {
  if (!date || !dueDate) return;

  const invoiceDate = new Date(date);
  const due = new Date(dueDate);
  if (Number.isNaN(invoiceDate.getTime()) || Number.isNaN(due.getTime())) return;

  if (due.getTime() < invoiceDate.getTime()) {
    throw new DueDateError('Due date cannot be before the invoice date');
  }
}
