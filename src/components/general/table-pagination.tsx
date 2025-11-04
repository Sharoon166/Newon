'use client';

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table } from '@tanstack/react-table';
import { cn } from '@/lib/utils';

interface TablePaginationProps<TData> {
    table: Table<TData>;
    pageSizeOptions?: number[];
    className?: string;
    onPageChange?: (pageIndex: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    itemName?: string;
}

export function TablePagination<TData>({
    table,
    pageSizeOptions = [10, 20, 30, 40, 50],
    className = '',
    onPageChange = () => {},
    onPageSizeChange = () => {},
    itemName = 'items'
}: TablePaginationProps<TData>) {
    const pageIndex = table.getState().pagination.pageIndex;
    const pageSize = table.getState().pagination.pageSize;
    const totalRows = table.getFilteredRowModel().rows.length;
    const pageCount = table.getPageCount();
    const canPreviousPage = table.getCanPreviousPage();
    const canNextPage = table.getCanNextPage();

    const handlePageChange = (newPageIndex: number) => {
        table.setPageIndex(newPageIndex);
        onPageChange?.(newPageIndex);
    };

    const handlePreviousPage = () => {
        const newPageIndex = pageIndex - 1;
        table.previousPage();
        onPageChange?.(newPageIndex);
    };

    const handleNextPage = () => {
        const newPageIndex = pageIndex + 1;
        table.nextPage();
        onPageChange?.(newPageIndex);
    };

    const handlePageSizeChange = (value: string) => {
        const newPageSize = Number(value);
        table.setPageSize(newPageSize);
        table.setPageIndex(0); // Reset to first page when page size changes
        onPageSizeChange?.(newPageSize);
    };

    const handleFirstPage = () => {
        table.setPageIndex(0);
        onPageChange?.(0);
    };

    const handleLastPage = () => {
        const lastPageIndex = pageCount - 1;
        table.setPageIndex(lastPageIndex);
        onPageChange?.(lastPageIndex);
    };

    // Generate page numbers to display
    const getPageNumbers = (): (number | string)[] => {
        const maxVisiblePages = 5;
        const pages: (number | string)[] = [];
        const currentPage = pageIndex + 1; // Convert to 1-based index for display

        if (pageCount <= maxVisiblePages) {
            return Array.from({ length: pageCount }, (_, i) => i + 1);
        }

        // Always show first page
        pages.push(1);

        // Calculate start and end pages
        let startPage = Math.max(2, currentPage - 1);
        let endPage = Math.min(pageCount - 1, currentPage + 1);

        // Adjust if we're at the start or end
        if (currentPage <= 3) {
            endPage = 4;
        } else if (currentPage >= pageCount - 2) {
            startPage = pageCount - 3;
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
        if (endPage < pageCount - 1) {
            pages.push('...');
        }

        // Always show last page if there is more than one page
        if (pageCount > 1) {
            pages.push(pageCount);
        }

        return pages;
    };

    return (
        <div className={cn(`my-1 mt-4 flex flex-col sm:flex-row items-center justify-between gap-3 w-full`, className)}>
            <div className="flex items-center space-x-2">
                <p className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">
                        {pageIndex * pageSize + 1}
                    </span> - {" "}
                    <span className="font-medium">
                        {Math.min((pageIndex + 1) * pageSize, totalRows)}
                    </span> of <span className="font-medium">{totalRows}</span> {itemName}
                </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2">
                <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Rows per page</p>
                    <Select
                        value={`${pageSize}`}
                        onValueChange={handlePageSizeChange}
                    >
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
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={handleFirstPage}
                        disabled={!canPreviousPage}
                    >
                        <span className="sr-only">First page</span>
                        <ChevronsLeft className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={handlePreviousPage}
                        disabled={!canPreviousPage}
                    >
                        <span className="sr-only">Previous page</span>
                        <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <div className="flex items-center">
                        {getPageNumbers().map((page, i) =>
                            typeof page === 'number' ? (
                                <Button
                                    key={page}
                                    variant={page === pageIndex + 1 ? 'default' : 'ghost'}
                                    className="h-8 w-8 p-0"
                                    onClick={() => handlePageChange(page - 1)} // Convert 1-based to 0-based index
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

                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={handleNextPage}
                        disabled={!canNextPage}
                    >
                        <span className="sr-only">Next page</span>
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button
                        variant="outline"
                        className="h-8 w-8 p-0"
                        onClick={handleLastPage}
                        disabled={!canNextPage}
                    >
                        <span className="sr-only">Last page</span>
                        <ChevronsRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
