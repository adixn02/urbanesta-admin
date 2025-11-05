'use client';

import { useState } from "react";

export default function FilePreview({ label, value, onChange, accept = "image/*" }) {
  const [preview, setPreview] = useState(value || "");
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    // Create preview URL
    const previewUrl = URL.createObjectURL(selectedFile);
    setPreview(previewUrl);
    
    // Call onChange with the file object
    onChange && onChange(selectedFile);
  };

  const removeFile = () => {
    setFile(null);
    setPreview("");
    onChange && onChange(null);
  };

  return (
    <div className="mb-3">
      {label && <label className="form-label fw-semibold text-dark">{label}</label>}

      <div className="d-flex align-items-center gap-3">
        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="form-control"
        />

        {preview && (
          <button
            type="button"
            onClick={removeFile}
            className="btn btn-sm btn-outline-danger"
          >
            Remove
          </button>
        )}
      </div>

      {preview && (
        <div className="mt-3">
          <img
            src={preview}
            alt="Preview"
            className="img-thumbnail"
            style={{ width: "128px", height: "128px", objectFit: "cover" }}
          />
        </div>
      )}
    </div>
  );
}
