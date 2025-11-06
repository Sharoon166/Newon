import React, { useState, useEffect } from 'react';
import { Input } from './input';

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number | string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void;
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  className,
  disabled,
  onKeyDown,
  onBlur,
  onFocus,
}: NumberInputProps) {
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isFocused, setIsFocused] = useState(false);

  // Update display value when the actual value changes from outside
  useEffect(() => {
    if (!isFocused) {
      // Only show the number if it's not zero, otherwise show empty string
      setDisplayValue(value === 0 ? '' : value.toString());
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setDisplayValue(inputValue);

    // Handle empty string - convert to 0 for the backend but keep display empty
    if (inputValue === '' || inputValue === '-') {
      onChange(0);
      return;
    }

    // Parse the number
    const numValue = parseFloat(inputValue);
    
    // Only update if it's a valid number
    if (!isNaN(numValue)) {
      // Apply min/max constraints
      let constrainedValue = numValue;
      if (min !== undefined && constrainedValue < min) {
        constrainedValue = min;
      }
      if (max !== undefined && constrainedValue > max) {
        constrainedValue = max;
      }
      
      onChange(constrainedValue);
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // If the value is 0, clear the display to make it easier to type
    if (value === 0) {
      setDisplayValue('');
    }
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    
    // If the field is empty on blur, ensure the backend value is 0
    if (displayValue === '' || displayValue === '-') {
      onChange(0);
      setDisplayValue('');
    } else {
      // Ensure display matches the actual value
      setDisplayValue(value === 0 ? '' : value.toString());
    }
    
    onBlur?.(e);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if ([8, 9, 27, 13, 46].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true) ||
        // Allow: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)) {
      return;
    }
    
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      // Allow decimal point for float inputs
      if (step !== 1 && e.keyCode === 190) {
        // Only allow one decimal point
        if (displayValue.includes('.')) {
          e.preventDefault();
        }
        return;
      }
      // Allow minus sign for negative numbers (if min is not set or is negative)
      if (e.keyCode === 189 && (min === undefined || min < 0) && !displayValue.includes('-')) {
        return;
      }
      e.preventDefault();
    }
    
    onKeyDown?.(e);
  };

  return (
    <Input
      type="text" // Use text type to have full control over the display
      inputMode="numeric" // Show numeric keyboard on mobile
      value={displayValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      min={min}
      max={max}
      step={step}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
    />
  );
}