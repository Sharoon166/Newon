import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewonInvoiceTemplate } from '@/features/invoices/components/newon-invoice-template';
import { format } from 'date-fns';

// Mock the next/image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('NewonInvoiceTemplate', () => {
  const mockInvoiceData = {
    invoiceNumber: 'INV-2023-001',
    date: '2023-11-19',
    dueDate: '2023-12-19',
    logo: undefined,
    previousBalance: 0,
    discountType: 'fixed' as const,
    paid: 0,
    remainingPayment: 0,
    company: {
      name: 'Test Company',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zip: '12345',
      phone: '(123) 456-7890',
      email: 'test@example.com',
      website: 'www.testcompany.com',
    },
    client: {
      name: 'Test Client',
      company: 'Client Co',
      address: '456 Client Ave',
      city: 'Client City',
      state: 'CC',
      zip: '67890',
      phone: '(987) 654-3210',
      email: 'client@example.com',
    },
    items: [
      {
        id: '1',
        description: 'Test Item 1',
        quantity: 2,
        rate: 100,
        unitPrice: 100,
        amount: 200,
      },
      {
        id: '2',
        description: 'Test Item 2',
        quantity: 1,
        rate: 300,
        unitPrice: 300,
        amount: 300,
      },
    ],
    taxRate: 10,
    discount: 50,
    notes: 'Thank you for your business!',
    paymentDetails: {
      bankName: 'Test Bank',
      accountNumber: '****1234',
      iban: 'TEST1234567890',
    },
  };

  it('renders the invoice with provided data', () => {
    render(<NewonInvoiceTemplate invoiceData={mockInvoiceData} />);
    
    // Check company information
    expect(screen.getByText('Test Company')).toBeInTheDocument();
    expect(screen.getByText('123 Test St')).toBeInTheDocument();
    
    // Check client information
    expect(screen.getByText('Test Client')).toBeInTheDocument();
    expect(screen.getByText('Client Co')).toBeInTheDocument();
    
    // Check invoice details
    expect(screen.getByText('INV-2023-001')).toBeInTheDocument();
    expect(screen.getByText(format(new Date('2023-11-19'), 'MMM dd, yyyy'))).toBeInTheDocument();
    expect(screen.getByText(format(new Date('2023-12-19'), 'MMM dd, yyyy'))).toBeInTheDocument();
    
    // Check line items
    expect(screen.getByText('Test Item 1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
    
    // Check totals
    expect(screen.getByText('$500.00')).toBeInTheDocument(); // Subtotal
    expect(screen.getByText('$50.00')).toBeInTheDocument(); // Tax (10% of 500)
    expect(screen.getByText('$50.00')).toBeInTheDocument(); // Discount
    expect(screen.getByText('$500.00')).toBeInTheDocument(); // Total (500 + 50 - 50)
  });

  it('handles missing optional fields gracefully', () => {
    const minimalData = {
      ...mockInvoiceData,
      company: {
        name: 'Minimal Company',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        email: '',
        website: '',
      },
      client: {
        name: 'Minimal Client',
        company: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        phone: '',
        email: '',
      },
      items: [
        {
          id: 'min-1',
          description: 'Single Item',
          quantity: 1,
          rate: 100,
          unitPrice: 100,
          amount: 100,
        },
      ],
      taxRate: 0,
      discount: 0,
    };
    
    render(<NewonInvoiceTemplate invoiceData={minimalData} />);
    
    // Should still render without errors
    expect(screen.getByText('Minimal Company')).toBeInTheDocument();
    expect(screen.getByText('Minimal Client')).toBeInTheDocument();
    expect(screen.getByText('Single Item')).toBeInTheDocument();
  });

  it('calls onBack, onPrint, and onSave callbacks when buttons are clicked', () => {
    const mockOnBack = jest.fn();
    const mockOnPrint = jest.fn();
    const mockOnSave = jest.fn();
    
    render(
      <NewonInvoiceTemplate 
        invoiceData={mockInvoiceData} 
        onBack={mockOnBack}
        onPrint={mockOnPrint}
        onSave={mockOnSave}
      />
    );
    
    // Test back button
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);
    expect(mockOnBack).toHaveBeenCalledTimes(1);
    
    // Test print button
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    expect(mockOnPrint).toHaveBeenCalledTimes(1);
    
    // Test save button
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    expect(mockOnSave).toHaveBeenCalledTimes(1);
  });

  it('displays the company logo when provided', () => {
    const withLogo = {
      ...mockInvoiceData,
      logo: '/test-logo.png',
    };
    
    render(<NewonInvoiceTemplate invoiceData={withLogo} />);
    
    const logo = screen.getByAltText('Company Logo');
    expect(logo).toBeInTheDocument();
    expect(logo).toHaveAttribute('src', '/test-logo.png');
  });

  it('handles callbacks correctly', () => {
    const onBackMock = jest.fn();
    const onPrintMock = jest.fn();
    const onSaveMock = jest.fn();

    render(
      <NewonInvoiceTemplate 
        invoiceData={mockInvoiceData} 
        onBack={onBackMock}
        onPrint={onPrintMock}
        onSave={onSaveMock}
      />
    );

    // Test back button
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);
    expect(onBackMock).toHaveBeenCalledTimes(1);

    // Test print button
    const printButton = screen.getByRole('button', { name: /print/i });
    fireEvent.click(printButton);
    expect(onPrintMock).toHaveBeenCalledTimes(1);

    // Test save button
    const saveButton = screen.getByRole('button', { name: /save/i });
    fireEvent.click(saveButton);
    expect(onSaveMock).toHaveBeenCalledTimes(1);
  });

  it('handles invalid date strings gracefully', () => {
    const withInvalidDates = {
      ...mockInvoiceData,
      date: 'invalid-date',
      dueDate: 'another-invalid-date',
    };
    
    render(<NewonInvoiceTemplate invoiceData={withInvalidDates} />);
    
    // Should display the original string if date parsing fails
    expect(screen.getByText('invalid-date')).toBeInTheDocument();
    expect(screen.getByText('another-invalid-date')).toBeInTheDocument();
  });

  it('calculates totals correctly with various inputs', () => {
    const testCases = [
      {
        items: [{
          id: 'test-5',
          description: 'Item 1',
          quantity: 1,
          rate: 100,
          unitPrice: 100,
          amount: 100,
          productId: 'prod-1',
          variantId: 'var-1',
          variantSKU: 'SKU-001',
          purchaseId: 'purch-1'
        }],
        taxRate: 10,
        discount: 0,
        expectedTotal: '110.00', // 100 + 10% tax
      },
      {
        items: [
          { id: 'test-3', description: 'Item 1', quantity: 2, rate: 50, unitPrice: 50, amount: 100 },
          { id: 'test-4', description: 'Item 2', quantity: 1, rate: 100, unitPrice: 100, amount: 100 },
        ],
        taxRate: 0,
        discount: 50,
        expectedTotal: '150.00', // 200 - 50 discount
      },
      {
        items: [
          { id: 'test-1', description: 'Item 1', quantity: 5, rate: 20, unitPrice: 20, amount: 100 },
          { id: 'test-2', description: 'Item 2', quantity: 2, rate: 50, unitPrice: 50, amount: 100 },
        ],
        taxRate: 20,
        discount: 30,
        expectedTotal: '204.00', // (200 - 30) + 20% tax
      },
    ];
    
    testCases.forEach((testCase) => {
      const { container } = render(
        <NewonInvoiceTemplate 
          invoiceData={{
            ...mockInvoiceData,
            items: testCase.items,
            taxRate: testCase.taxRate,
            discount: testCase.discount,
          }} 
        />
      );
      
      // Check if the total is displayed correctly
      const totalElement = container.querySelector('td:has(+ td:has(+ td:has(+ td:has(+ td:has(+ td.text-right))))) + td + td + td + td + td.text-right');
      expect(totalElement).toHaveTextContent(`$${testCase.expectedTotal}`);
      
      // Clean up after each test case
      container.remove();
    });
  });
});
