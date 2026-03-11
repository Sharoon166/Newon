'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';

interface YearSelectorProps {
  label?: string;
}

export function YearSelector({ label = 'Year' }: YearSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentYear = new Date().getFullYear();
  const selectedYear = searchParams.get('year') || currentYear.toString();

  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const handleYearChange = (year: string) => {
    router.push(`/reports?year=${year}`);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium">{label}:</span>
      <Select value={selectedYear} onValueChange={handleYearChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select year" />
        </SelectTrigger>
        <SelectContent>
          {years.map(year => (
            <SelectItem key={year} value={year.toString()}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
