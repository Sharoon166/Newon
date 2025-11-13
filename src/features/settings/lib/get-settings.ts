import { getPaymentDetails, getInvoiceTerms } from '../actions';
import { PAYMENT_DETAILS, INVOICE_TERMS_AND_CONDITIONS } from '@/constants';

/**
 * Get payment details from database, fallback to constants if not found
 */
export async function getPaymentDetailsOrDefault() {
  try {
    return await getPaymentDetails();
  } catch (error) {
    console.error('Failed to fetch payment details, using defaults:', error);
    return PAYMENT_DETAILS;
  }
}

/**
 * Get invoice terms from database, fallback to constants if not found
 */
export async function getInvoiceTermsOrDefault() {
  try {
    return await getInvoiceTerms();
  } catch (error) {
    console.error('Failed to fetch invoice terms, using defaults:', error);
    return INVOICE_TERMS_AND_CONDITIONS;
  }
}
