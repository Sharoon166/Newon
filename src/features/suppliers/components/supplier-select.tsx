'use client';

import { useEffect, useState } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from '@/components/ui/combobox';
import { getSuppliers } from '../actions';

interface SupplierSelectProps {
  /** Business id (e.g. "SP-25-001") of the currently linked supplier. */
  value?: string;
  /** Called with the selected supplier's business id and name. */
  onChange: (supplierId: string, supplierName: string) => void;
  /**
   * Legacy free-text supplier name from before suppliers were a separate entity.
   * Shown as a read-only "unlinked" option until the record is linked.
   */
  legacyName?: string;
  /**
   * Name snapshot of the currently linked supplier. Used to keep displaying it
   * when it is no longer selectable (e.g. the supplier has been disabled).
   */
  currentName?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /**
   * ISO 3166-1 alpha-2 code (e.g. "PK") to restrict the list to suppliers of
   * that country. Undefined shows every supplier.
   */
  restrictToCountry?: string;
}

const LEGACY_PREFIX = '__legacy__:';

interface SupplierOption {
  supplierId: string;
  name: string;
  /** False for the pseudo entries (legacy name, unavailable supplier). */
  selectable: boolean;
}

export function SupplierSelect({
  value,
  onChange,
  legacyName,
  currentName,
  placeholder = 'Select supplier',
  disabled,
  className,
  restrictToCountry
}: SupplierSelectProps) {
  const [suppliers, setSuppliers] = useState<{ supplierId: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSuppliers(restrictToCountry ? { country: restrictToCountry } : undefined)
      .then(list => {
        if (!active) return;
        setSuppliers(
          list
            .filter(s => !!s.supplierId)
            .map(s => ({ supplierId: s.supplierId as string, name: s.name }))
        );
      })
      .catch(error => console.error('Failed to load suppliers:', error))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [restrictToCountry]);

  const hasLegacy = !value && !!legacyName;
  // The linked supplier may no longer be selectable (disabled). Keep showing it
  // so the record doesn't silently lose its supplier.
  const missingLinkedSupplier = !!value && !suppliers.some(s => s.supplierId === value);
  const selectValue = value || (hasLegacy ? `${LEGACY_PREFIX}${legacyName}` : '');

  const options: SupplierOption[] = [
    ...(hasLegacy
      ? [{ supplierId: `${LEGACY_PREFIX}${legacyName}`, name: `${legacyName} (unlinked)`, selectable: false }]
      : []),
    ...(missingLinkedSupplier
      ? [{ supplierId: value as string, name: `${currentName || value} (unavailable)`, selectable: false }]
      : []),
    ...suppliers.map(s => ({ ...s, selectable: true }))
  ];

  return (
    <Combobox
      items={options}
      // The selected value is the option object itself; these two convert it to
      // the name shown in the input and the text the list filters against.
      itemToStringValue={(option: SupplierOption) => option.name}
      itemToStringLabel={(option: SupplierOption) => option.name}
      // Same object references as the ones handed to <ComboboxItem>, so Base UI's
      // Object.is equality marks the current selection.
      value={options.find(o => o.supplierId === selectValue) ?? null}
      onValueChange={option => {
        // The legacy "unlinked" entry only labels the free-text name; picking
        // it shouldn't clear or change the linked supplier.
        if (!option?.selectable) return;
        onChange(option.supplierId, option.name);
      }}
      autoHighlight
      disabled={disabled || loading}
    >
      <ComboboxInput
        className={className ?? 'w-full'}
        placeholder={loading ? 'Loading suppliers...' : placeholder}
        disabled={disabled || loading}
      />
      <ComboboxContent>
        <ComboboxEmpty>No suppliers found.</ComboboxEmpty>
        <ComboboxList>
          {(option: SupplierOption) => (
            <ComboboxItem key={option.supplierId} value={option} disabled={!option.selectable}>
              {option.name}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
