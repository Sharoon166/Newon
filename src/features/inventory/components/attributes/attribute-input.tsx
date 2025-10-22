'use client';

import { useState, KeyboardEvent } from 'react';
import { Plus, X, GripVertical, XCircle, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ProductAttribute } from '../../types';

export function AttributeInput({
  attribute,
  onUpdate,
  onRemove,
  onValuesChange
}: {
  attribute: ProductAttribute;
  onUpdate: (updated: ProductAttribute) => void;
  onRemove: (id: string) => void;
  onValuesChange: (id: string, values: string[]) => void;
}) {
  const [newValue, setNewValue] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [attributeName, setAttributeName] = useState(attribute.name);

  const {
    attributes: dndAttributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: attribute.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 'auto'
  };

  const addValue = (e?: React.FormEvent) => {
    e?.preventDefault();
    const value = newValue.trim();
    if (value && !attribute.values.includes(value)) {
      const updatedValues = [...attribute.values, value];
      onValuesChange(attribute.id, updatedValues);
      setNewValue('');
    }
  };

  const removeValue = (valueToRemove: string) => {
    const updatedValues = attribute.values.filter(v => v !== valueToRemove);
    onValuesChange(attribute.id, updatedValues);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addValue();
    } else if (e.key === 'Backspace' && !newValue && attribute.values.length > 0) {
      // Remove last value on backspace when input is empty
      const lastValue = attribute.values[attribute.values.length - 1];
      removeValue(lastValue);
    }
  };

  const handleNameUpdate = () => {
    if (attributeName.trim()) {
      onUpdate({ ...attribute, name: attributeName.trim() });
    }
    setIsEditingName(false);
  };

  return (
    <div ref={setNodeRef} style={style} className="relative rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button {...listeners} {...dndAttributes} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={() => setIsEditingName(true)}
            aria-label="Edit attribute name"
          >
            <Edit className="h-4 w-4" />
          </Button>
          {isEditingName ? (
            <input
              type="text"
              value={attributeName}
              onChange={e => setAttributeName(e.target.value)}
              onBlur={handleNameUpdate}
              onKeyDown={e => e.key === 'Enter' && handleNameUpdate()}
              className="h-8 rounded border px-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
          ) : (
            <h4 className="text-sm font-medium hover:bg-muted/50 px-2 py-1 rounded cursor-text">{attribute.name}</h4>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6" type="button" onClick={() => onRemove(attribute.id)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <form onSubmit={addValue} className="flex items-center gap-2">
          <Input
            type="text"
            value={newValue}
            onChange={e => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add value and press Enter or comma"
            className="w-full"
          />
          <Button
            type="submit"
            size="icon"
            variant="outline"
            className={cn('shrink-0', !newValue.trim() && 'opacity-50 cursor-not-allowed')}
            disabled={!newValue.trim()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </form>
        <div className="flex flex-wrap gap-2 mb-2">
          {attribute.values.map(value => (
            <Badge key={value} className="gap-3 text-sm border border-muted">
              {value}
              <button type="button" onClick={() => removeValue(value)} className="cursor-pointer">
                <XCircle className="h-3.5 w-3.5" />
              </button>
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
}
