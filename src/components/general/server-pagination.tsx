'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface ServerPaginationProps {
  currentPage: number;
  totalPages: number;
  totalDocs: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  pageSize?: number;
  pageSizeOptions?: number[];
  className?: string;
  itemName?: string;
}

export function ServerPagination({
  currentPage,
  totalPages,
  totalDocs,
  hasNextPage,
  hasPrevPage,
  pageSize = 10,
  pageSizeOptions = [10, 20, 30, 40, 50],
  className = '',
  itemName = 'items'
}: ServerPaginationProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigateToPage = (page: number): void => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', page.toString());
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handlePageSizeChange = (value: string): void => {
    const newPageSize = Number(value);
    const params = new URLSearchParams(searchParams.toString());
    params.set('limit', newPageSize.toString());
    params.set('page', '1'); // Reset to first page when page size changes
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleFirstPage = (): void => {
    navigateToPage(1);
  };

  const handleLastPage = (): void => {
    navigateToPage(totalPages);
  };

  const handlePreviousPage = (): void => {
    navigateToPage(currentPage - 1);
  };

  const handleNextPage = (): void => {
    navigateToPage(currentPage + 1);
  };

  const startItem = totalDocs === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalDocs);

  // Generate page numbers to display
  const getPageNumbers = (): (number | string)[] => {
    const maxVisiblePages = 5;
    const pages: (number | string)[] = [];

    if (totalPages <= maxVisiblePages) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    // Calculate start and end pages
    let startPage = Math.max(2, currentPage - 1);
    let endPage = Math.min(totalPages - 1, currentPage + 1);

    // Adjust if we're at the start or end
    if (currentPage <= 3) {
      endPage = 4;
    } else if (currentPage >= totalPages - 2) {
      startPage = totalPages - 3;
    }

    // Add ellipsis after first page if needed
    if (startPage > 2) {
      pages.push('...');
    }

    // Add middle pages
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    // Add ellipsis before last page if needed
    if (endPage < totalPages - 1) {
      pages.push('...');
    }

    // Always show last page if there is more than one page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className={cn(`my-1 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 w-full`, className)}>
      <div className="flex items-center space-x-2">
        <p className="text-sm text-muted-foreground">
          Showing <span className="font-medium">{startItem}</span> - <span className="font-medium">{endItem}</span> of{' '}
          <span className="font-medium">{totalDocs}</span> {itemName}
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select value={`${pageSize}`} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={`${size}`}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-1">
          <Button variant="outline" className="h-8 w-8 p-0" onClick={handleFirstPage} disabled={!hasPrevPage}>
            <span className="sr-only">First page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-8 w-8 p-0" onClick={handlePreviousPage} disabled={!hasPrevPage}>
            <span className="sr-only">Previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center">
            {getPageNumbers().map((page, i) =>
              typeof page === 'number' ? (
                <Button
                  key={page}
                  variant={page === currentPage ? 'default' : 'ghost'}
                  className="h-8 w-8 p-0"
                  onClick={() => navigateToPage(page)}
                >
                  {page}
                </Button>
              ) : (
                <span key={`ellipsis-${i}`} className="px-2 py-1 text-muted-foreground">
                  {page}
                </span>
              )
            )}
          </div>

          <Button variant="outline" className="h-8 w-8 p-0" onClick={handleNextPage} disabled={!hasNextPage}>
            <span className="sr-only">Next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" className="h-8 w-8 p-0" onClick={handleLastPage} disabled={!hasNextPage}>
            <span className="sr-only">Last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
