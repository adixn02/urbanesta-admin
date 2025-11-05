'use client'
import React from 'react';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import Image from "next/image";
import logo from "../public/img/logo.jpg";

// Sortable Builder Row Component
function SortableBuilderRow({ builder, onEdit, onDelete, index, rowId, propertyCounts = {} }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: rowId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={isDragging ? 'table-warning' : ''}
    >
      <td style={{ width: "60px" }}>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab d-flex align-items-center justify-content-center"
          style={{ 
            cursor: 'grab',
            height: '50px',
            width: '30px'
          }}
        >
          <i className="bi bi-grip-vertical text-muted"></i>
        </div>
      </td>
      <td style={{ width: "100px" }}>
        <Image
          className="border rounded"
          src={builder.logo || logo}
          alt={`${builder.name || 'Builder'} logo`}
          width={50}
          height={50}
          style={{ objectFit: "cover" }}
        />
      </td>
      <td>
        <strong>{builder.name}</strong>
        <br />
        <small className="text-muted">{builder.description}</small>
      </td>
      <td>{builder.establishedYear || "N/A"}</td>
      <td>
        <span
          className={`badge ${
            builder.isActive ? "bg-success" : "bg-danger"
          }`}
        >
          {builder.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td>
        <span className="badge bg-info">
          Order: {builder.displayOrder}
        </span>
      </td>
      <td>
        <button
          className="btn btn-sm btn-outline-primary me-2"
          onClick={() => onEdit(builder)}
        >
          Edit
        </button>
        <button
          className="btn btn-sm btn-outline-danger"
          onClick={() => onDelete(builder._id)}
          disabled={propertyCounts[builder._id] > 0}
          title={propertyCounts[builder._id] > 0 ? `${propertyCounts[builder._id]} propert${propertyCounts[builder._id] === 1 ? 'y' : 'ies'} exist under this builder` : 'Delete builder'}
        >
          Delete
        </button>
      </td>
    </tr>
  );
}

// Main Builders Table Component
export default function BuildersTable({ 
  builders, 
  loading, 
  onEdit, 
  onDelete, 
  hasChanges,
  isUpdatingOrder,
  onSaveOrder,
  onReset,
  propertyCounts = {}
}) {

  if (loading) {
    return (
      <tr>
        <td colSpan="7" className="text-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </td>
      </tr>
    );
  }

  if (builders.length === 0) {
    return (
      <tr>
        <td colSpan="7" className="text-center text-muted">
          No builders found
        </td>
      </tr>
    );
  }

  return (
    <>
      {builders.map((builder, index) => {
        const rowId = builder._id || builder.id || `${builder.name || 'builder'}-${index}`;
        return (
        <SortableBuilderRow
          key={rowId}
          builder={builder}
          index={index}
          rowId={rowId}
          onEdit={onEdit}
          onDelete={onDelete}
          propertyCounts={propertyCounts}
        />
        );
      })}
      
      {hasChanges && (
        <tr>
          <td colSpan="7" className="text-center bg-light">
            <div className="py-2">
              <span className="text-warning me-3">
                <i className="bi bi-exclamation-triangle me-1"></i>
                Builder order has been changed
              </span>
              <button
                className="btn btn-success btn-sm me-2"
                onClick={onSaveOrder}
                disabled={isUpdatingOrder}
              >
                {isUpdatingOrder ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-1"></i>
                    Save Order
                  </>
                )}
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={onReset}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Reset
              </button>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
