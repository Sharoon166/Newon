'use client';

import {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
	VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Search, X, ChevronDown, ChevronUp, ChevronsLeft, ChevronsRight, Download, FileSpreadsheet, MoreHorizontal, Pencil, LucideColumns3Cog } from 'lucide-react';
import { EnhancedVariants, ProductLocation } from '../types';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { ImageZoom } from '@/components/ui/shadcn-io/image-zoom';
import type { Color } from 'jspdf-autotable';
import { exportToCsv, prepareProductExportData } from '../utils/export-utils';
import { exportToPdf } from '@/lib/export-utils';
import { TablePagination } from '@/components/general/table-pagination';

// Define columns
const columns: ColumnDef<EnhancedVariants>[] = [
	{
		accessorKey: 'productName',
		header: ({ column }) => {
			const isSorted = column.getIsSorted();
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className="p-0 hover:bg-transparent"
				>
					Product
					{isSorted ? (
						isSorted === 'asc' ? (
							<ChevronUp className="ml-2 h-4 w-4" />
						) : (
							<ChevronDown className="ml-2 h-4 w-4" />
						)
					) : (
						<ChevronDown className="ml-2 h-4 w-4 opacity-50" />
					)}
				</Button>
			);
		},
		cell: ({ row }) => (
			<>
				<div className="flex items-center gap-3">
					<div
						className="cursor-pointer hover:opacity-80 transition-opacity"
					>
						<ImageZoom>
							<Avatar className="h-8 w-8 rounded-md sm:h-10 sm:w-10">
								<AvatarImage
									src={row.original.image}
									alt={row.original.productName}
									className='object-contain'
								/>
								<AvatarFallback className="text-xs rounded-md sm:text-sm">
									{row.original.productName.charAt(0)}
								</AvatarFallback>
							</Avatar>
						</ImageZoom>
					</div>
					<div className="min-w-0">
						<div className="truncate font-medium">{row.original.productName}</div>
						<div className="text-xs text-muted-foreground truncate">SKU: {row.original.sku}</div>
					</div>
				</div>
			</>
		),
		minSize: 200,
		size: 300
	},
	{
		accessorKey: 'categories',
		header: 'Categories',
		cell: ({ row }) => (
			<div className="flex flex-wrap gap-1 max-w-[300px]">
				{row.original.categories.length === 0 && (
					<Badge variant="outline" className="text-xs truncate">
						No categories
					</Badge>
				)}
				{row.original.categories.slice(0, 2).map(category => (
					<Badge key={category} variant="outline" className="text-xs truncate">
						{category}
					</Badge>
				))}
				{row.original.categories.length > 2 && (
					<Popover>
						<PopoverTrigger asChild>
							<Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
								<Plus className="h-3 w-3 mr-1" />
								{row.original.categories.length - 2} more
							</Badge>
						</PopoverTrigger>
						<PopoverContent className="w-auto p-2" align="start">
							<div className="flex flex-col gap-1">
								{row.original.categories.slice(2).map(category => (
									<Badge key={category} variant="outline" className="text-xs w-full justify-start">
										{category}
									</Badge>
								))}
							</div>
						</PopoverContent>
					</Popover>
				)}
			</div>
		),
		minSize: 250,
		size: 350
	},
	{
		accessorKey: 'retailPrice',
		header: 'Retail Price',
		cell: ({ row }) => (
			<div className="font-medium whitespace-nowrap">
				{formatCurrency(row.original.retailPrice)}
			</div>
		),
		minSize: 100,
		size: 120
	},
	{
		accessorKey: 'purchasePrice',
		header: 'Purchase Price',
		cell: ({ row }) => (
			<div className="text-sm text-muted-foreground whitespace-nowrap">
				{formatCurrency(row.original.purchasePrice)}
			</div>
		),
		minSize: 100,
		size: 120
	},
	{
		accessorKey: 'wholesalePrice',
		header: 'Wholesale Price',
		cell: ({ row }) => (
			<div className={`font-medium ${row.original.availableStock <= 0 ? 'text-destructive' : ''}`}>
				{formatCurrency(row.original.wholesalePrice)}
			</div>
		),
		minSize: 100,
		size: 100
	},
	{
		accessorKey: 'availableStock',
		header: 'In Stock',
		cell: ({ row }) => (
			<div className={row.original.availableStock < 10 ? 'text-amber-500 font-medium' : ''}>
				{row.original.availableStock}
			</div>
		)
	},
	{
		accessorKey: 'stockOnBackorder',
		header: 'Backorder',
		cell: ({ row }) => (
			<Badge className={row.original.stockOnBackorder > 0 ? 'font-medium' : ''}>
				{row.original.stockOnBackorder || '-'}
			</Badge>
		)
	},
	{
		accessorKey: 'supplier',
		header: ({ column }) => {
			const isSorted = column.getIsSorted();
			return (
				<Button
					variant="ghost"
					onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
					className="p-0 hover:bg-transparent"
				>
					Supplier
					{isSorted ? (
						isSorted === 'asc' ? (
							<ChevronUp className="ml-2 h-4 w-4" />
						) : (
							<ChevronDown className="ml-2 h-4 w-4" />
						)
					) : (
						<ChevronDown className="ml-2 h-4 w-4 opacity-50" />
					)}
				</Button>
			);
		},
		cell: ({ row }) => (
			<div className="text-sm text-muted-foreground truncate max-w-[120px]">{row.original.supplier}</div>
		),
		minSize: 100,
		size: 120
	},
	{
		accessorKey: 'inventory',
		header: () => (
			<div className="text-sm font-medium text-center">Locations</div>
		),
		cell: ({ row }) => {
			const inventory = row.original.inventory || [];

			if (inventory.length === 0) {
				return <div className="text-sm text-muted-foreground text-center">-</div>;
			}

			return (
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="ghost"
							className="h-auto p-0 text-sm font-normal hover:bg-transparent hover:underline underline-offset-2"
						>
							{inventory.length} location{inventory.length !== 1 ? 's' : ''}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-64 p-2" align="start">
						<div className="space-y-2 divide-y-2 divide-muted">
							{inventory.map((item, index) => {
								const location: Partial<ProductLocation> = item.location || {};
								return (
									<div
										key={location.id}
										className="flex flex-col gap-1 text-sm not-last:pb-2"
									>
										<div className="font-medium">{index + 1}. {location.name || 'Unknown Location'}</div>
										<div className="flex justify-between items-center">
											{location.address && (
												<span className="text-muted-foreground text-xs">
													{location.address}
												</span>
											)}
										</div>
										<div className="flex gap-2">
											<Badge variant={item.availableStock > 0 ? 'default' : 'secondary'}>
												{item.availableStock} in stock
											</Badge>
											{item.backorderStock > 0 && (
												<Badge variant="outline" className="border-amber-500 text-amber-500">
													{item.backorderStock} backorder
												</Badge>
											)}
										</div>
									</div>
								);
							})}
						</div>
					</PopoverContent>
				</Popover>
			);
		},
		minSize: 120,
		size: 140,
		enableSorting: false
	},
	{
		id: 'actions',
		cell: ({ row }) => (
			<div className="flex justify-end pr-2">
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" className="h-8 w-8">
							<MoreHorizontal className="h-4 w-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end" className="w-[160px]">
						<DropdownMenuItem asChild>
							<Link href={`/inventory/${row.original.productId}/edit`} className="flex items-center cursor-pointer">
								<Pencil className="mr-2 h-4 w-4" />
								<span>Modify</span>
							</Link>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		),
		enableHiding: false,
		minSize: 50,
		size: 50,
	}
];

interface ProductsTableProps {
	data?: EnhancedVariants[];
}

export function ProductsTable({ data = [] }: ProductsTableProps) {
	const router = useRouter();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = useState({});
	const [pagination, setPagination] = useState({
		pageIndex: 0,
		pageSize: 10
	});
	const [supplierFilter, setSupplierFilter] = useState<string>('all');
	const [stockFilter, setStockFilter] = useState<string>('all');
	const [searchTerm, setSearchTerm] = useState('');

	// Get unique suppliers for filter
	const suppliers = useMemo(() => {
		const supplierSet = new Set<string>();
		if (Array.isArray(data)) {
			data.forEach(item => {
				if (item.supplier) {
					supplierSet.add(item.supplier);
				}
			});
		}
		return Array.from(supplierSet);
	}, [data]);

	// Handle CSV export
	const handleExportCsv = () => {
		const data = prepareProductExportData(filteredData);
		exportToCsv(data, `products-${new Date().toISOString().split('T')[0]}`);
	};

	// Handle PDF export
	const handleExportPdf = () => {
		const data = prepareProductExportData(filteredData);
		exportToPdf(data, `products-${new Date().toISOString().split('T')[0]}`);
	};

	// Filter data based on search and filters
	const filteredData = useMemo(() => {
		if (!Array.isArray(data)) return [];

		const search = searchTerm.toLowerCase();
		return data.filter(item => {
			// Search filter
			const matchesSearch =
				item.productName.toLowerCase().includes(search) ||
				item.sku.toLowerCase().includes(search) ||
				item.supplier?.toLowerCase().includes(search) ||
				item.categories.some(cat => cat.toLowerCase().includes(search));

			// Supplier filter
			const matchesSupplier = supplierFilter === 'all' || item.supplier === supplierFilter;

			// Stock filter
			let matchesStock = true;
			if (stockFilter === 'in-stock') {
				matchesStock = item.availableStock > 0;
			} else if (stockFilter === 'out-of-stock') {
				matchesStock = item.availableStock <= 0 && (item.stockOnBackorder || 0) <= 0;
			} else if (stockFilter === 'backorder') {
				matchesStock = (item.stockOnBackorder || 0) > 0;
			}

			return matchesSearch && matchesSupplier && matchesStock;
		});
	}, [data, searchTerm, supplierFilter, stockFilter]);

	const table = useReactTable<EnhancedVariants>({
		data: filteredData,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		onPaginationChange: setPagination,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
			pagination
		},
		initialState: {
			pagination: {
				pageSize: 10
			}
		}
	});

	return (
		<div className="w-full max-w-6xl mx-auto">
			<div className="flex flex-col gap-4 py-4">
				<InputGroup>
					<InputGroupInput
						placeholder="Search by name, SKU, or supplier..."
						value={searchTerm}
						onChange={event => setSearchTerm(event.target.value)}
					/>
					<InputGroupAddon>
						<Search />
					</InputGroupAddon>
				</InputGroup>
				<div className="grid gap-2 grid-cols-2 max-md:*:w-full md:flex">
					<Select value={supplierFilter} onValueChange={setSupplierFilter}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="All Suppliers" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Suppliers</SelectItem>
							{suppliers.map((supplier, index) => (
								<SelectItem key={index} value={supplier}>
									{supplier}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<Select value={stockFilter} onValueChange={setStockFilter}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Stock Status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Products</SelectItem>
							<SelectItem value="in-stock">In Stock</SelectItem>
							<SelectItem value="out-of-stock">Out of Stock</SelectItem>
							<SelectItem value="backorder">On Backorder</SelectItem>
						</SelectContent>
					</Select>
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline">
								<LucideColumns3Cog />
								View <ChevronDown className="ml-2 h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{table
								.getAllColumns()
								.filter(column => column.getCanHide())
								.map(column => (
									<DropdownMenuCheckboxItem
										key={column.id}
										className="capitalize"
										checked={column.getIsVisible()}
										onCheckedChange={value => column.toggleVisibility(!!value)}
									>
										{column.id.replace(/([A-Z])/g, ' $1').trim()}
									</DropdownMenuCheckboxItem>
								))}
						</DropdownMenuContent>
					</DropdownMenu>

					<div className="contents md:flex justify-end w-full">
						<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button>
								<Download className="mr-2 h-4 w-4" />
								Export
								<ChevronDown className="ml-2 h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleExportPdf}>
								<Download className="mr-2 h-4 w-4" />
								Export as PDF
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleExportCsv}>
								<FileSpreadsheet className="mr-2 h-4 w-4" />
								Export as CSV
							</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
				</div>

				{supplierFilter !== 'all' || stockFilter !== 'all' ? (
					<div className="flex flex-wrap gap-2">
						{supplierFilter && supplierFilter !== 'all' && (
							<Badge variant="secondary" className="gap-1">
								Supplier: {supplierFilter}
								<button
									onClick={() => setSupplierFilter('all')}
									className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5"
								>
									<span className="sr-only">Remove filter</span>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						)}
						{stockFilter !== 'all' && (
							<Badge variant="secondary" className="gap-1">
								{
									{
										'in-stock': 'In Stock',
										'out-of-stock': 'Out of Stock',
										backorder: 'On Backorder'
									}[stockFilter]
								}
								<button
									onClick={() => setStockFilter('all')}
									className="ml-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 p-0.5"
								>
									<span className="sr-only">Remove filter</span>
									<X className="h-3 w-3" />
								</button>
							</Badge>
						)}
					</div>
				) : null}
			</div>
			<div className="rounded-md border">
				<Table className="grow">
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead key={header.id} className="whitespace-nowrap px-2 py-3 text-left text-sm font-medium text-gray-900">
											{header.isPlaceholder
												? null
												: flexRender(
													header.column.columnDef.header,
													header.getContext()
												)}
										</TableHead>
									)
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow
									key={row.id}
									data-state={row.getIsSelected() && "selected"}
									className="cursor-pointer hover:bg-muted/50 transition-colors"
									onClick={(e) => {
										// Don't navigate if clicking on interactive elements
										const target = e.target as HTMLElement;
										if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
											return;
										}
										router.push(`/inventory/${row.original.productId}`);
									}}
								>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id} className="whitespace-nowrap px-3 py-3 text-sm text-gray-900">
											{flexRender(
												cell.column.columnDef.cell,
												cell.getContext()
											)}
										</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center px-3 py-3 text-sm text-gray-500"
								>
									No results.
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			<TablePagination table={table} itemName="Products" className='mt-4' />
		</div>
	);
}
