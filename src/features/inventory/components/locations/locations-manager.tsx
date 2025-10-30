'use client';

import { useState } from 'react';
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
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, MapPin, GripVertical, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductLocation } from '../../types';

type LocationsManagerProps = {
  locations: ProductLocation[];
  onChange: (locations: ProductLocation[]) => void;
};

// Sortable Location Item Component
const SortableLocationItem = ({ 
  location, 
  isEditing, 
  onEdit, 
  onRemove, 
  onToggleActive 
}: { 
  location: ProductLocation;
  isEditing: boolean;
  onEdit: () => void;
  onRemove: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: location.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn("flex items-center justify-between p-3 border rounded-lg cursor-pointer", {
        'ring-2 ring-primary': isEditing,
        'opacity-70': !location.isActive
      })}
      onClick={onEdit}
    >
      <div className="flex items-center space-x-2">
        <button 
          type="button" 
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium">{location.name}</p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <div className="flex items-center space-x-1">
          <span className="text-sm text-muted-foreground">Active</span>
          <Switch
            checked={location.isActive}
            onCheckedChange={(checked) => onToggleActive(location.id, checked)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(location.id);
          }}
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Remove location</span>
        </Button>
      </div>
    </div>
  );
};

export function LocationsManager({ locations, onChange }: LocationsManagerProps) {
  const [editingLocation, setEditingLocation] = useState<ProductLocation | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // Initialize sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle drag end event
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = locations.findIndex(loc => loc.id === active.id);
      const newIndex = locations.findIndex(loc => loc.id === over.id);
      
      const newLocations = arrayMove(locations, oldIndex, newIndex).map((loc, index) => ({
        ...loc,
        order: index
      }));
      
      onChange(newLocations);
    }
  };

  const addLocation = () => {
    const newLocation: ProductLocation = {
      id: `loc_${crypto.randomUUID()}`,
      name: `Location ${locations.length + 1}`,
      address: '',
      isActive: true,
      order: locations.length,
    };
    
    onChange([...locations, newLocation]);
    setEditingLocation(newLocation);
    setIsEditing(true);
  };

  const updateLocation = (id: string, updates: Partial<ProductLocation>) => {
    onChange(
      locations.map((loc) =>
        loc.id === id ? { ...loc, ...updates } : loc
      )
    );
  };

  const removeLocation = (id: string) => {
    onChange(locations.filter((loc) => loc.id !== id));
    if (editingLocation?.id === id) {
      setEditingLocation(null);
      setIsEditing(false);
    }
  };

  const toggleActive = (id: string, isActive: boolean) => {
    updateLocation(id, { isActive });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Locations</h3>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addLocation}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Location
        </Button>
      </div>

      {locations.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/20">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No locations added yet</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={addLocation}
          >
            Add your first location
          </Button>
        </div>
      ) : (
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext 
            items={locations.map(loc => loc.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {locations.map((location) => (
                <SortableLocationItem
                  key={location.id}
                  location={location}
                  isEditing={editingLocation?.id === location.id}
                  onEdit={() => {
                    setEditingLocation(location);
                    setIsEditing(true);
                  }}
                  onRemove={removeLocation}
                  onToggleActive={toggleActive}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {isEditing && editingLocation && (
        <div className="mt-6 p-4 border rounded-lg bg-muted/10">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">
              {locations.some(loc => loc.id === editingLocation.id) ? 'Edit' : 'Add'} Location
            </h4>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditing(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          <div className="space-y-2 grid sm:grid-cols-2 gap-4">
            <div className='space-y-2'>
              <Label htmlFor="location-name">Location Name</Label>
              <Input
                id="location-name"
                value={editingLocation.name}
                onChange={(e) =>
                  setEditingLocation({ ...editingLocation, name: e.target.value })
                }
                onBlur={() =>
                  updateLocation(editingLocation.id, { name: editingLocation.name })
                }
                placeholder="e.g. Main Warehouse, Store Front, etc."
              />
            </div>
            <div className='space-y-2'>
              <Label htmlFor="location-address">Address (Optional)</Label>
              <Input
                id="location-address"
                value={editingLocation.address || ''}
                onChange={(e) =>
                  setEditingLocation({ ...editingLocation, address: e.target.value })
                }
                onBlur={() =>
                  updateLocation(editingLocation.id, { 
                    address: editingLocation.address || undefined
                  })
                }
                placeholder="e.g. 123 Main St, City, Country"
              />
            </div>
          </div>
            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  updateLocation(editingLocation.id, editingLocation);
                  setIsEditing(false);
                }}
              >
                Save Changes
              </Button>
            </div>
        </div>
      )}
    </div>
  );
}
