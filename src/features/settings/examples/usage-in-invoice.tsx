/**
 * Example: How to use settings in invoice templates
 * 
 * This file demonstrates how to fetch and use payment details
 * and invoice terms in your invoice components.
 */

import { getPaymentDetailsOrDefault, getInvoiceTermsOrDefault } from '@/features/settings';

// Example 1: In a Server Component
export async function InvoiceTemplate({ invoiceId }: { invoiceId: string }) {
  // Fetch settings from database with fallback to constants
  const paymentDetails = await getPaymentDetailsOrDefault();
  const terms = await getInvoiceTermsOrDefault();

  return (
    <div>
      {/* Your invoice content */}
      
      {/* Payment Details Section */}
      <div className="payment-details">
        <h3>Payment Details</h3>
        <p>Bank: {paymentDetails.BANK_NAME}</p>
        <p>Account: {paymentDetails.ACCOUNT_NUMBER}</p>
        <p>IBAN: {paymentDetails.IBAN}</p>
      </div>

      {/* Terms & Conditions Section */}
      <div className="terms">
        <h3>Terms & Conditions</h3>
        <ul>
          {terms.map((term, index) => (
            <li key={index}>{term}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// Example 2: In a Server Action
export async function generateInvoicePDF(invoiceId: string) {
  const paymentDetails = await getPaymentDetailsOrDefault();
  const terms = await getInvoiceTermsOrDefault();

  // Use in PDF generation
  const pdfData = {
    // ... other invoice data
    paymentDetails,
    terms
  };

  // Generate PDF with the data
  return pdfData;
}

// Example 3: Direct import from actions (if you need more control)
import { getPaymentDetails, getInvoiceTerms } from '@/features/settings/actions';

export async function customUsage() {
  try {
    const paymentDetails = await getPaymentDetails();
    const terms = await getInvoiceTerms();
    
    // Use the data
    return { paymentDetails, terms };
  } catch (error) {
    // Handle error - settings not found in database
    console.error('Settings not found:', error);
    throw error;
  }
}
