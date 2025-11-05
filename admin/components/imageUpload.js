'use client';

import { useState } from "react";

export default function ImageUpload({ label, value, onChange }) {
  const [image, setImage] = useState(value || "");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002'}/api/upload/single`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.imageUrl;
      
      setImage(imageUrl);
      onChange && onChange(imageUrl);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const removeImage = () => {
    setImage("");
    onChange && onChange("");
  };

  return (
    <div className="mb-3">
      {label && <label className="form-label fw-semibold text-dark">{label}</label>}

      <div className="d-flex align-items-center gap-3">
        <input
          type="file"
          accept="image/*,.webp"
          onChange={handleFileChange}
          disabled={isUploading}
          className="form-control"
        />

        {image && (
          <button
            type="button"
            onClick={removeImage}
            className="btn btn-sm btn-outline-danger"
          >
            Remove
          </button>
        )}
      </div>

      {isUploading && (
        <div className="d-flex align-items-center gap-2 mt-2">
          <div
            className="spinner-border spinner-border-sm text-primary"
            role="status"
          >
            <span className="visually-hidden">Loading...</span>
          </div>
          <span className="small text-muted">Uploading...</span>
        </div>
      )}

      {image && (
        <div className="mt-3">
          <img
            src={image}
            alt="Preview"
            className="img-thumbnail"
            style={{ width: "128px", height: "128px", objectFit: "cover" }}
          />
        </div>
      )}
    </div>
  );
}
