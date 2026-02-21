'use client';

import { Building2, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox';
import { Item, ItemContent, ItemDescription, ItemTitle } from '@/components/ui/item';
import { formatCurrency } from '@/lib/utils';
import type { Customer } from '@/features/customers/types';

interface ProjectCustomerSelectorProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onCustomerSelect: (customer: Customer) => void;
  disabled?: boolean;
  showFinancials?: boolean;
}

export function ProjectCustomerSelector({
  customers,
  selectedCustomer,
  onCustomerSelect,
  disabled = false,
  showFinancials = true
}: ProjectCustomerSelectorProps) {
  const handleCustomerChange = (customerName: string) => {
    const customer = customers.find(c => c.name === customerName);
    if (customer) {
      onCustomerSelect(customer);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="customer" className="text-base font-semibold">
          Customer *
        </Label>
        <Combobox
          items={customers.filter(c => !c.disabled)}
          itemToStringValue={(customer: Customer) => customer.name}
          onInputValueChange={handleCustomerChange}
          autoHighlight
          disabled={disabled}
        >
          <ComboboxInput
            disabled={disabled}
            placeholder="Select a customer"
            className="w-full mt-2"
            value={selectedCustomer?.name || ''}
          />
          <ComboboxContent>
            <ComboboxEmpty>No customers found.</ComboboxEmpty>
            <ComboboxList>
              {customer => (
                <ComboboxItem key={customer.id} value={customer.name}>
                  <Item className="p-0">
                    <ItemContent>
                      <ItemTitle>{customer.name}</ItemTitle>
                      {customer.company && (
                        <ItemDescription className="flex gap-2 items-center text-xs">
                          <Building2 className="h-3 w-3" /> {customer.company}
                        </ItemDescription>
                      )}
                    </ItemContent>
                  </Item>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
      </div>

      {selectedCustomer && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{selectedCustomer.name}</p>
                  {selectedCustomer.company && (
                    <p className="text-xs text-muted-foreground">{selectedCustomer.company}</p>
                  )}
                </div>
              </div>

              {showFinancials && (
                <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Total Invoiced</p>
                    <p className="text-sm font-semibold">{formatCurrency(selectedCustomer.totalInvoiced || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Paid</p>
                    <p className="text-sm font-semibold text-green-600">
                      {formatCurrency(selectedCustomer.totalPaid || 0)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Outstanding</p>
                    <p
                      className={`text-sm font-semibold ${
                        (selectedCustomer.outstandingBalance || 0) > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}
                    >
                      {formatCurrency(selectedCustomer.outstandingBalance || 0)}
                    </p>
                  </div>
                </div>
              )}

              {selectedCustomer.email && (
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Email: {selectedCustomer.email}
                </div>
              )}
              {selectedCustomer.phone && (
                <div className="text-xs text-muted-foreground">Phone: {selectedCustomer.phone}</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
