'use client';

import { useState, useMemo, useCallback } from 'react';
import { Search, Package, Plus, Minus, Info } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatCurrency } from '@/lib/utils';
import type { EnhancedVariants } from '@/features/inventory/types';
import type { Purchase } from '@/features/purchases/types';
import { toast } from 'sonner';

interface ProjectRegularInventorySelectorProps {
  variants: EnhancedVariants[];
  purchases: Purchase[];
  currentItems?: Array<{
    virtualProductId?: string;
    variantId?: string;
    quantity: number;
  }>;
  onAddItem: (item: {
    productId?: string;
    variantId?: string;
    virtualProductId?: string;
    isVirtualProduct: boolean;
    productName: string;
    sku: string;
    description: string;
    quantity: number;
    rate: number;
    purchaseId?: string;
    notes?: string;
  }) => void;
}

export function ProjectRegularInventorySelector({
  variants,
  purchases,
  currentItems = [],
  onAddItem
}: ProjectRegularInventorySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [selectedVariant, setSelectedVariant] = useState<EnhancedVariants | null>(null);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [customPrice, setCustomPrice] = useState(0);
  const [notes, setNotes] = useState('');

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    variants.forEach(v => {
   