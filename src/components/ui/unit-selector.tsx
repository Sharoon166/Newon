'use client';

import { Input } from '@/components/ui/input';
import { DEFAULT_UNIT } from '@/constants/units';

interface UnitSelectorProps {
  value?: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function UnitSelector({
  value = DEFAULT_UNIT,
  onChange,
  disabled = false,
  placeholder = 'pcs...'
}: UnitSelectorProps) {
  return (
    <Input
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-16 h-8 text-sm"
    />
  );
}
