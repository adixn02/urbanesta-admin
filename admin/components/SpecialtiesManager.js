'use client'
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Item Component
function SortableItem({ id, value, onEdit, onRemove, canRemove }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="d-flex align-items-center mb-2 p-2 border rounded bg-light"
      {...attributes}
    >
      <div
        {...listeners}
        className="me-3 cursor-grab"
        style={{ cursor: 'grab' }}
      >
        <i className="bi bi-grip-vertical text-muted"></i>
      </div>
      <div className="flex-grow-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onEdit(id, e.target.value)}
          className="form-control"
          placeholder="e.g. Luxury Homes"
        />
      </div>
      {canRemove && (
        <button
          type="button"
          className="btn btn-outline-danger btn-sm ms-2"
          onClick={() => onRemove(id)}
        >
          <i className="bi bi-trash"></i>
        </button>
      )}
    </div>
  );
}

// Main Specialties Manager Component
export default function SpecialtiesManager({ 
  specialties, 
  onSpecialtiesChange, 
  disabled = false 
}) {
  const [localSpecialties, setLocalSpecialties] = useState(
    specialties.length > 0 ? specialties : [{ id: '1', value: '' }]
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setLocalSpecialties((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);
        const values = newItems.map(item => item.value);
        onSpecialtiesChange(values);
        return newItems;
      });
    }
  };

  const handleEdit = (id, value) => {
    setLocalSpecialties((items) => {
      const newItems = items.map(item => 
        item.id === id ? { ...item, value } : item
      );
      const values = newItems.map(item => item.value);
      onSpecialtiesChange(values);
      return newItems;
    });
  };

  const handleRemove = (id) => {
    if (localSpecialties.length > 1) {
      setLocalSpecialties((items) => {
        const newItems = items.filter(item => item.id !== id);
        const values = newItems.map(item => item.value);
        onSpecialtiesChange(values);
        return newItems;
      });
    }
  };

  const handleAdd = () => {
    const newId = (Math.max(...localSpecialties.map(item => parseInt(item.id))) + 1).toString();
    setLocalSpecialties((items) => {
      const newItems = [...items, { id: newId, value: '' }];
      const values = newItems.map(item => item.value);
      onSpecialtiesChange(values);
      return newItems;
    });
  };

  // Update local state when props change
  React.useEffect(() => {
    if (specialties.length > 0) {
      const items = specialties.map((value, index) => ({
        id: (index + 1).toString(),
        value: value || ''
      }));
      setLocalSpecialties(items);
    } else {
      setLocalSpecialties([{ id: '1', value: '' }]);
    }
  }, [specialties]);

  return (
    <div className="specialties-manager">
      <label className="form-label">Specialties</label>
      <div className="mb-3">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localSpecialties.map(item => item.id)}
            strategy={verticalListSortingStrategy}
          >
            {localSpecialties.map((item) => (
              <SortableItem
                key={item.id}
                id={item.id}
                value={item.value}
                onEdit={handleEdit}
                onRemove={handleRemove}
                canRemove={localSpecialties.length > 1}
              />
            ))}
          </SortableContext>
        </DndContext>
      </div>
      
      <button
        type="button"
        className="btn btn-sm btn-outline-primary"
        onClick={handleAdd}
        disabled={disabled}
      >
        <i className="bi bi-plus-circle me-1"></i>
        Add Specialty
      </button>
      
      <div className="mt-2">
        <small className="text-muted">
          <i className="bi bi-info-circle me-1"></i>
          Drag and drop to reorder specialties. The order will be saved when you submit the form.
        </small>
      </div>
    </div>
  );
}
