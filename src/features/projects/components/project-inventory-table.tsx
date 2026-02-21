'use client';

import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { MoreHorizontal, Trash2, Search, ChevronDown, ChevronUp, Package } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { InventoryItem } from '../types';
import { deleteInventoryItem } from '../actions';
import { toast } from 'sonner';

interface ProjectInventoryTableProps {
  data: InventoryItem[];
  projectId: string;
  userId: string;
  userName: string;
  canDelete: boolean;
  onRefresh: () => void;
  pendingItems?: string[];
  onRemovePending?: (itemId: string) => void;
}

export function ProjectInventoryTable({ data, projectId, userId, userName, canDelete, onRefresh, pendingItems = [], onRemovePending }: ProjectInventoryTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const matchesSearch =
        searchQuery === '' ||
        item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesSearch;
    });
  }, [data, searchQuery]);

  const handleDeleteClick = (item: InventoryItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setIsDeleting(true);
    try {
      await deleteInventoryItem(projectId, itemToDelete.id!, userId, userName);
      toast.success('Inventory item deleted successfully');
      onRefresh();
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast.error('Failed to delete inventory item');
    } finally {
      setIsDeleting(false);
    }
  };

  const toggleRow = (itemId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No inventory items yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search inventory..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]"></TableHead>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Total Cost</TableHead>
              <TableHead>Added By</TableHead>
              <TableHead>Date</TableHead>
              {canDelete && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canDelete ? 9 : 8} className="text-center py-8 text-muted-foreground">
                  No inventory items found
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map(item => (
                <>
                  <TableRow key={item.id} className={pendingItems.includes(item.id!) ? 'bg-yellow-50' : ''}>
                    <TableCell>
                      {item.isVirtualProduct && item.componentBreakdown && item.componentBreakdown.length > 0 && (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => toggleRow(item.id!)}
                          className="h-6 w-6"
                        >
                          {expandedRows.has(item.id!) ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{item.productName}</div>
                        <div className="flex gap-1 mt-1">
                          {item.isVirtualProduct && (
                            <Badge variant="secondary" className="text-xs">
                              Virtual Product
                            </Badge>
                          )}
                          {pendingItems.includes(item.id!) && (
                            <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-600">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">{item.sku}</span>
                    </TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.rate)}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(item.totalCost)}</TableCell>
                    <TableCell>
                      <div className="text-sm">{item.addedByName || 'Unknown'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{formatDate(new Date(item.addedAt))}</div>
                    </TableCell>
                    {canDelete && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                if (pendingItems.includes(item.id!) && onRemovePending) {
                                  onRemovePending(item.id!);
                                } else {
                                  handleDeleteClick(item);
                                }
                              }}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              {pendingItems.includes(item.id!) ? 'Remove' : 'Delete'}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>

                  {/* Expandable row for component breakdown */}
                  {item.isVirtualProduct &&
                    item.componentBreakdown &&
                    item.componentBreakdown.length > 0 &&
                    expandedRows.has(item.id!) && (
                      <TableRow>
                        <TableCell colSpan={canDelete ? 9 : 8} className="bg-muted/50">
                          <div className="py-2 px-4 space-y-2">
                            <h4 className="font-semibold text-sm">Component Breakdown:</h4>
                            <div className="grid gap-2">
                              {item.componentBreakdown.map((comp, idx) => (
                                <div key={idx} className="flex justify-between text-sm border-b pb-2 last:border-0">
                                  <div>
                                    <span className="font-medium">{comp.productName}</span>
                                    <span className="text-muted-foreground ml-2">({comp.sku})</span>
                                  </div>
                                  <div className="text-right">
                                    <div>Qty: {comp.quantity}</div>
                                    <div className="text-muted-foreground">
                                      {formatCurrency(comp.unitCost)} × {comp.quantity} = {formatCurrency(comp.totalCost)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>

                            {item.customExpenses && item.customExpenses.length > 0 && (
                              <>
                                <h4 className="font-semibold text-sm mt-3">Custom Expenses:</h4>
                                <div className="grid gap-2">
                                  {item.customExpenses.map((exp, idx) => (
                                    <div key={idx} className="flex justify-between text-sm border-b pb-2 last:border-0">
                                      <div>
                                        <span className="font-medium">{exp.name}</span>
                                        <span className="text-muted-foreground ml-2 capitalize">({exp.category})</span>
                                      </div>
                                      <div>{formatCurrency(exp.amount)}</div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            )}

                            {item.notes && (
                              <div className="mt-3 pt-2 border-t">
                                <h4 className="font-semibold text-sm">Notes:</h4>
                                <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.productName}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
