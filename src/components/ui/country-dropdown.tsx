'use client';

import React, { useCallback, useState, forwardRef } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { CircleFlag } from 'react-circle-flags';
import { countries } from 'country-data-list';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Country } from '@/lib/countries';

// Re-exported for convenience; the canonical helpers live in lib/countries so
// server components can use them too.
export { getCountryName, DEFAULT_COUNTRY_CODE } from '@/lib/countries';

interface CountryDropdownProps {
  value?: string;
  onChange?: (alpha2: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

const CountryDropdownComponent = (
  { value, onChange, disabled = false, placeholder = 'Select a country', className }: CountryDropdownProps,
  ref: React.ForwardedRef<HTMLButtonElement>
) => {
  const [open, setOpen] = useState(false);

  const options = React.useMemo(
    () =>
      countries.all.filter(
        (country: Country) => country.emoji && country.status !== 'deleted' && country.alpha2
      ),
    []
  );

  const selectedCountry = React.useMemo(
    () => options.find((country: Country) => country.alpha2.toUpperCase() === (value || '').toUpperCase()),
    [options, value]
  );

  const handleSelect = useCallback(
    (country: Country) => {
      onChange?.(country.alpha2);
      setOpen(false);
    },
    [onChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        ref={ref}
        disabled={disabled}
        className={cn(
          'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
          className
        )}
      >
        {selectedCountry ? (
          <div className="flex items-center flex-grow w-0 gap-2 overflow-hidden">
            <div className="inline-flex items-center justify-center w-5 h-5 shrink-0 overflow-hidden rounded-full">
              <CircleFlag countryCode={selectedCountry.alpha2.toLowerCase()} height={20} />
            </div>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{selectedCountry.name}</span>
          </div>
        ) : (
          <span className="flex items-center gap-2 text-muted-foreground">
            <Globe className="h-4 w-4" />
            {placeholder}
          </span>
        )}
        <ChevronDown className="h-4 w-4 opacity-50" />
      </PopoverTrigger>
      <PopoverContent collisionPadding={10} side="bottom" className="min-w-[--radix-popper-anchor-width] p-0">
        <Command className="w-full max-h-[270px]">
          <CommandList>
            <div className="sticky top-0 z-10 bg-popover">
              <CommandInput placeholder="Search country..." />
            </div>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {options.map((option: Country) => (
                <CommandItem
                  key={option.alpha2}
                  className="flex items-center w-full gap-2"
                  value={option.name}
                  onSelect={() => handleSelect(option)}
                >
                  <div className="inline-flex items-center justify-center w-5 h-5 shrink-0 overflow-hidden rounded-full">
                    <CircleFlag countryCode={option.alpha2.toLowerCase()} height={20} />
                  </div>
                  <span className="overflow-hidden text-ellipsis whitespace-nowrap">{option.name}</span>
                  <Check
                    className={cn(
                      'ml-auto h-4 w-4 shrink-0',
                      option.alpha2 === selectedCountry?.alpha2 ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

CountryDropdownComponent.displayName = 'CountryDropdownComponent';

export const CountryDropdown = forwardRef(CountryDropdownComponent);
