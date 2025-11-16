'use client'
import React from 'react';

export default function GlobalError({ error, reset }) {
  return (
    <html>
      <head>
        <title>Critical Error - Urbanesta Admin</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.0/font/bootstrap-icons.css" />
      </head>
      <body>
        <div className="min-vh-100 d-flex align-items-center justify-content-center bg-danger bg-opacity-10">
          <div className="container">
            <div className="row justify-content-center">
              <div className="col-12 col-md-8 col-lg-6">
                <div className="card shadow-lg border-0">
                  <div className="card-body text-center p-5">
                    <i className="bi bi-exclamation-diamond-fill text-danger" style={{ fontSize: '5rem' }}></i>
                    <h1 className="display-4 fw-bold mt-4 mb-3">Critical Error</h1>
                    <p className="lead mb-4">
                      A critical error has occurred. Please refresh the page or contact support.
                    </p>
                    
                    {process.env.NODE_ENV === 'development' && error?.message && (
                      <div className="alert alert-danger text-start mb-4">
                        <strong>Error:</strong>
                        <pre className="mb-0 mt-2" style={{ fontSize: '0.85rem', whiteSpace: 'pre-wrap' }}>
                          {error.message}
                        </pre>
                      </div>
                    )}

                    <div className="d-flex gap-3 justify-content-center">
                      <button 
                        onClick={reset}
                        className="btn btn-danger btn-lg"
                      >
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        Try Again
                      </button>
                      <button 
                        onClick={() => window.location.href = '/'}
                        className="btn btn-outline-secondary btn-lg"
                      >
                        <i className="bi bi-house-door-fill me-2"></i>
                        Go Home
                      </button>
                    </div>

                    <div className="mt-4 pt-4 border-top">
                      <p className="text-muted mb-0">
                        <i className="bi bi-building me-2"></i>
                        Urbanesta Realtors - Admin Panel
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}

