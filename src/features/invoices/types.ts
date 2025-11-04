export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'draft' | 'cancelled' | 'sent';
export type QuotationStatus = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customer: {
    name: string;
    email: string;
  };
  date: string;
  dueDate: string;
  amount: number;
  status: InvoiceStatus;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export interface Quotation extends Omit<Invoice, 'invoiceNumber' | 'dueDate' | 'status'> {
  quotationNumber: string;
  expiryDate: string;
  status: QuotationStatus;
}

// Sample data
export const sampleInvoices: Invoice[] = [
  {
    id: 'inv-001',
    invoiceNumber: 'INV-2023-001',
    customer: {
      name: 'Acme Corp',
      email: 'billing@acmecorp.com',
    },
    date: '2023-10-15',
    dueDate: '2023-11-14',
    amount: 1250.75,
    status: 'paid',
    items: [
      {
        description: 'Web Development Services',
        quantity: 10,
        unitPrice: 100,
        total: 1000,
      },
      {
        description: 'UI/UX Design',
        quantity: 5,
        unitPrice: 50.15,
        total: 250.75,
      },
    ],
  },
  // Add 4 more sample invoices...
  {
    id: 'inv-002',
    invoiceNumber: 'INV-2023-002',
    customer: {
      name: 'Globex Corporation',
      email: 'accounts@globex.com',
    },
    date: '2023-11-01',
    dueDate: '2023-12-01',
    amount: 3200.0,
    status: 'pending',
    items: [
      {
        description: 'Monthly Maintenance',
        quantity: 1,
        unitPrice: 3200,
        total: 3200,
      },
    ],
  },
  {
    id: 'inv-003',
    invoiceNumber: 'INV-2023-003',
    customer: {
      name: 'Soylent Corp',
      email: 'finance@soylent.com',
    },
    date: '2023-10-25',
    dueDate: '2023-11-24',
    amount: 845.5,
    status: 'overdue',
    items: [
      {
        description: 'Consulting Services',
        quantity: 8.5,
        unitPrice: 99.47,
        total: 845.5,
      },
    ],
  },
  {
    id: 'inv-004',
    invoiceNumber: 'INV-2023-004',
    customer: {
      name: 'Initech',
      email: 'ap@initech.com',
    },
    date: '2023-11-10',
    dueDate: '2023-12-10',
    amount: 175.25,
    status: 'draft',
    items: [
      {
        description: 'Software License',
        quantity: 1,
        unitPrice: 150,
        total: 150,
      },
      {
        description: 'Setup Fee',
        quantity: 1,
        unitPrice: 25.25,
        total: 25.25,
      },
    ],
  },
  {
    id: 'inv-005',
    invoiceNumber: 'INV-2023-005',
    customer: {
      name: 'Hooli',
      email: 'accounts@hooli.com',
    },
    date: '2023-11-05',
    dueDate: '2023-12-05',
    amount: 5200.0,
    status: 'sent',
    items: [
      {
        description: 'Custom Development',
        quantity: 40,
        unitPrice: 130,
        total: 5200,
      },
    ],
  },
];

export const sampleQuotations: Quotation[] = [
  {
    id: 'quo-001',
    quotationNumber: 'QUO-2023-001',
    customer: {
      name: 'Stark Industries',
      email: 'tony@stark.com',
    },
    date: '2023-11-01',
    expiryDate: '2023-12-01',
    amount: 5000,
    status: 'draft',
    items: [
      {
        description: 'Custom AI Development',
        quantity: 50,
        unitPrice: 100,
        total: 5000,
      },
    ],
  },
  // Add 4 more sample quotations...
  {
    id: 'quo-002',
    quotationNumber: 'QUO-2023-002',
    customer: {
      name: 'Wayne Enterprises',
      email: 'bruce@wayne.com',
    },
    date: '2023-11-05',
    expiryDate: '2023-12-05',
    amount: 2500,
    status: 'sent',
    items: [
      {
        description: 'Security System Audit',
        quantity: 1,
        unitPrice: 2500,
        total: 2500,
      },
    ],
  },
  {
    id: 'quo-003',
    quotationNumber: 'QUO-2023-003',
    customer: {
      name: 'Oscorp',
      email: 'norman@oscorp.com',
    },
    date: '2023-10-28',
    expiryDate: '2023-11-28',
    amount: 1800,
    status: 'accepted',
    items: [
      {
        description: 'Chemical Analysis',
        quantity: 3,
        unitPrice: 600,
        total: 1800,
      },
    ],
  },
  {
    id: 'quo-004',
    quotationNumber: 'QUO-2023-004',
    customer: {
      name: 'Parker Industries',
      email: 'peter@parker.com',
    },
    date: '2023-11-10',
    expiryDate: '2023-12-10',
    amount: 1500,
    status: 'rejected',
    items: [
      {
        description: 'Photography Services',
        quantity: 10,
        unitPrice: 150,
        total: 1500,
      },
    ],
  },
  {
    id: 'quo-005',
    quotationNumber: 'QUO-2023-005',
    customer: {
      name: 'Daily Bugle',
      email: 'jjj@dailybugle.com',
    },
    date: '2023-10-15',
    expiryDate: '2023-11-15',
    amount: 750,
    status: 'expired',
    items: [
      {
        description: 'Web Hosting',
        quantity: 6,
        unitPrice: 125,
        total: 750,
      },
    ],
  },
];
