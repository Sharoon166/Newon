# Customer Management System

## Overview
The customer management system is designed to handle customer information and track their financial interactions through invoices and payments.

## Current Features
- Customer CRUD operations (Create, Read, Update, Delete)
- Customer information: name, email, phone, address, city, state, zip
- Financial tracking fields (prepared for future features)
- Search and filtering capabilities

## Financial Tracking Fields (Ready for Future Implementation)

### Customer Model Fields
- `totalInvoiced`: Total amount invoiced to the customer
- `totalPaid`: Total amount paid by the customer  
- `outstandingBalance`: Current outstanding balance (totalInvoiced - totalPaid)
- `lastInvoiceDate`: Date of the most recent invoice
- `lastPaymentDate`: Date of the most recent payment

### Future Features to Implement

#### 1. Invoice Integration
- Auto-update `totalInvoiced` and `outstandingBalance` when invoices are created
- Update `lastInvoiceDate` on new invoices
- Calculate outstanding balance: `totalInvoiced - totalPaid`

#### 2. Payment Processing
- Record partial payments and adjustments
- Update `totalPaid` and `outstandingBalance` on payments
- Update `lastPaymentDate` on new payments
- Support for payment methods and references

#### 3. Advanced Filtering & Reporting
- Filter customers by outstanding balance amount
- Filter by date ranges (invoice dates, payment dates)
- Filter by customers with pending amounts
- Generate aging reports (30, 60, 90+ days outstanding)

#### 4. Financial Dashboard
- Customer balance overview
- Payment history timeline
- Outstanding invoices list
- Payment reminders and notifications

## Database Indexes
The following indexes are set up for optimal performance:
- `email` (unique)
- `name` (for search)
- `outstandingBalance` (for financial filtering)
- `lastInvoiceDate` (for date-based queries)
- `lastPaymentDate` (for payment tracking)

## API Functions Available

### Current Functions
- `getCustomers(filters?)` - Retrieve customers with optional filtering
- `getCustomer(id)` - Get single customer by ID
- `createCustomer(data)` - Create new customer
- `updateCustomer(id, data)` - Update customer information
- `deleteCustomer(id)` - Delete customer
- `updateCustomerFinancials(id, financialData)` - Update financial fields

### Future Integration Points
The `updateCustomerFinancials` function is ready to be called by:
- Invoice creation/update systems
- Payment processing systems
- Adjustment/refund systems

## Usage Examples

### Updating Customer Financials (Future Use)
```typescript
// When creating an invoice
await updateCustomerFinancials(customerId, {
  totalInvoiced: customer.totalInvoiced + invoiceAmount,
  outstandingBalance: customer.outstandingBalance + invoiceAmount,
  lastInvoiceDate: new Date()
});

// When recording a payment
await updateCustomerFinancials(customerId, {
  totalPaid: customer.totalPaid + paymentAmount,
  outstandingBalance: customer.outstandingBalance - paymentAmount,
  lastPaymentDate: new Date()
});
```

### Advanced Filtering (Future Use)
```typescript
// Get customers with outstanding balances
const customersWithBalance = await getCustomers({
  hasOutstandingBalance: true
});

// Get customers by date range
const recentCustomers = await getCustomers({
  dateFrom: new Date('2024-01-01'),
  dateTo: new Date('2024-12-31')
});
```

## Notes
- The activate/deactivate functionality has been removed as requested
- All financial fields default to 0 for new customers
- The system is designed to be extended with invoice and payment modules
- Financial calculations should be handled server-side for accuracy and security