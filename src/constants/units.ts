export const DEFAULT_UNIT = 'pcs';

export const PREDEFINED_UNITS = [
  { value: 'pcs', label: 'Pieces (pcs)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'g', label: 'Grams (g)' },
  { value: 'l', label: 'Liters (l)' },
  { value: 'ml', label: 'Milliliters (ml)' },
  { value: 'm', label: 'Meters (m)' },
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'ft', label: 'Feet (ft)' },
  { value: 'in', label: 'Inches (in)' },
  { value: 'box', label: 'Box' },
  { value: 'set', label: 'Set' },
  { value: 'pair', label: 'Pair' },
  { value: 'pack', label: 'Pack' },
  { value: 'custom', label: 'Custom...' }
] as const;

export type UnitValue = (typeof PREDEFINED_UNITS)[number]['value'];

export function getUnitLabel(value: string): string {
  const unit = PREDEFINED_UNITS.find(u => u.value === value);
  return unit ? unit.label : value;
}

export function isValidUnit(value: string): boolean {
  return PREDEFINED_UNITS.some(u => u.value === value) || value.trim().length > 0;
}
