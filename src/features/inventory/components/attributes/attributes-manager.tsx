'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { ProductAttribute } from '../../types';
import { AttributeInput } from './attribute-input';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

type AttributesManagerProps = {
  attributes: ProductAttribute[];
  onChange: (attributes: ProductAttribute[]) => void;
};

export function AttributesManager({ attributes, onChange }: AttributesManagerProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const addAttribute = () => {
    onChange([
      ...attributes,
      {
        id: `attr_${crypto.randomUUID()}`,
        name: `Attribute ${attributes.length + 1}`,
        values: [],
        isRequired: false,
        order: attributes.length
      }
    ]);
  };

  const updateAttribute = (id: string, updated: Partial<ProductAttribute>) => {
    onChange(attributes.map(attr => (attr.id === id ? { ...attr, ...updated } : attr)));
  };

  const removeAttribute = (id: string) => {
    onChange(attributes.filter(attr => attr.id !== id));
  };

  const updateAttributeValues = (id: string, values: string[]) => {
    updateAttribute(id, { values });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = attributes.findIndex(attr => attr.id === active.id);
      const newIndex = attributes.findIndex(attr => attr.id === over.id);
      const newAttributes = arrayMove(attributes, oldIndex, newIndex).map((attr, index) => ({
        ...attr,
        order: index
      }));
      onChange(newAttributes);
    }
  };

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={attributes.map(attr => attr.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {attributes.map(attribute => (
              <AttributeInput
                key={attribute.id}
                attribute={attribute}
                onUpdate={updated => updateAttribute(attribute.id, updated)}
                onRemove={removeAttribute}
                onValuesChange={updateAttributeValues}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {attributes.length === 0 && (
        <div className="rounded-md border border-dashed p-8 text-center">
          <p className="text-muted-foreground">
            No attributes added yet. Click &quot;Add Attribute&quot; to get started.
          </p>
        </div>
      )}
      
      <div className="flex justify-center">
        <Button
          type="button"
          onClick={addAttribute}
          variant="secondary"
          size="sm"
          disabled={attributes.at(-1)?.values.length == 0}
          className="w-full max-w-md"
        >
          {' '}
          <Plus /> Add Attribute
        </Button>
      </div>

    </div>
  );
}
