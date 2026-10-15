'use client';

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
}

const LEGACY_PREFIX = '__legacy__:';

export function SupplierSelect({
  value,
  onChange,
  legacyName,
  currentName,
  placeholder = 'Select supplier',
  disabled,
  className
}: SupplierSelectProps) {
  const [suppliers, setSuppliers] = useState<{ supplierId: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSuppliers()
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
  }, []);

  const hasLegacy = !value && !!legacyName;
  // The linked supplier may no longer be selectable (disabled). Keep showing it
  // so the record doesn't silently lose its supplier.
  const missingLinkedSupplier = !!value && !suppliers.some(s => s.supplierId === value);
  const selectValue = value || (hasLegacy ? `${LEGACY_PREFIX}${legacyName}` : '');

  return (
    <Select
      value={selectValue}
      onValueChange={next => {
        if (next.startsWith(LEGACY_PREFIX)) return;
        const supplier = suppliers.find(s => s.supplierId === next);
        if (supplier) {
          onChange(supplier.supplierId, supplier.name);
        } else {
          onChange('', '');
        }
      }}
      disabled={disabled || loading}
    >
      <SelectTrigger className={className ?? 'w-full truncate'}>
        <SelectValue placeholder={loading ? 'Loading suppliers...' : placeholder} />
      </SelectTrigger>
      <SelectContent>
        {hasLegacy && (
          <SelectItem value={`${LEGACY_PREFIX}${legacyName}`}>{legacyName} (unlinked)</SelectItem>
        )}
        {missingLinkedSupplier && (
          <SelectItem value={value}>{currentName || value} (unavailable)</SelectItem>
        )}
        {suppliers.length === 0 && !hasLegacy && !missingLinkedSupplier ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground">No suppliers yet</div>
        ) : (
          suppliers.map(supplier => (
            <SelectItem key={supplier.supplierId} value={supplier.supplierId}>
              {supplier.name}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
