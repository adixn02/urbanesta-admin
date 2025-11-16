'use client'
import React, { useEffect } from 'react';
import Image from 'next/image';
import logo from '../public/img/logo.jpg';
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function Error({ error, reset }) {
  useEffect(() => {
    // Log the error to console for debugging
    console.error('Application Error:', error);
  }, [error]);

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ 
      background: 'linear-gradient(135deg, #7f1d1d 0%, #dc2626 50%, #7f1d1d 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background Animation */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
        backgroundSize: '50px 50px'
      }}></div>

      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-7 col-lg-5">
            <div className="card shadow-lg border-0" style={{ 
              borderRadius: '16px',
              overflow: 'hidden',
              maxWidth: '480px',
              margin: '0 auto'
            }}>
              <div className="card-body text-center p-4">
                {/* Logo */}
                <div className="mb-3">
                  <Image
                    src={logo}
                    alt="Urbanesta Realtors Logo"
                    width={80}
                    height={80}
                    className="rounded-circle shadow"
                    priority
                  />
                </div>

                {/* Error Icon */}
                <div className="mb-3">
                  <i className="bi bi-x-octagon-fill" style={{
                    fontSize: '3.5rem',
                    color: '#dc2626',
                    opacity: 0.9
                  }}></i>
                </div>

                {/* Error Message */}
                <h1 className="fw-bold mb-2" style={{ color: '#7f1d1d', fontSize: '2rem' }}>
                  Oops!
                </h1>
                <h5 className="mb-2" style={{ color: '#dc2626', fontWeight: '600' }}>
                  Something went wrong
                </h5>
                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                  <i className="bi bi-info-circle me-1"></i>
                  An unexpected error occurred. Please try again or contact support.
                </p>

                {/* Error Details (Development Only) */}
                {process.env.NODE_ENV === 'development' && error?.message && (
                  <div className="alert alert-danger text-start mb-3 py-2 px-3" style={{
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    maxHeight: '120px',
                    overflowY: 'auto'
                  }}>
                    <strong>Error Details:</strong>
                    <pre className="mb-0 mt-1" style={{ 
                      fontSize: '0.75rem',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {error.message}
                    </pre>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="d-flex gap-2 justify-content-center mb-3">
                  <button 
                    onClick={reset}
                    className="btn px-4 py-2"
                    style={{
                      background: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.3)'
                    }}
                  >
                    <i className="bi bi-arrow-clockwise me-2"></i>
                    Try Again
                  </button>

                  <button 
                    onClick={() => window.location.href = '/'}
                    className="btn btn-outline-secondary px-4 py-2"
                    style={{
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderWidth: '1px'
                    }}
                  >
                    <i className="bi bi-house-door-fill me-2"></i>
                    Go to Login
                  </button>
                </div>

                {/* Helpful Tips */}
                <div className="pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                  <h6 className="fw-bold mb-2" style={{ color: '#4b5563', fontSize: '0.9rem' }}>
                    <i className="bi bi-lightbulb me-1"></i>
                    Troubleshooting Tips:
                  </h6>
                  <ul className="list-unstyled text-start mb-3" style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    <li className="mb-1">
                      <i className="bi bi-check-circle text-success me-1"></i>
                      Check your internet connection
                    </li>
                    <li className="mb-1">
                      <i className="bi bi-check-circle text-success me-1"></i>
                      Refresh the page and try again
                    </li>
                    <li className="mb-1">
                      <i className="bi bi-check-circle text-success me-1"></i>
                      Clear your browser cache
                    </li>
                    <li className="mb-1">
                      <i className="bi bi-check-circle text-success me-1"></i>
                      If the problem persists, contact your administrator
                    </li>
                  </ul>
                </div>

                {/* Footer */}
                <div className="pt-2" style={{ borderTop: '1px solid #e5e7eb' }}>
                  <p className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>
                    <i className="bi bi-building me-1"></i>
                    <strong>Urbanesta Realtors</strong> - Admin Panel
                  </p>
                  <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                    Error occurred at: {new Date().toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer Note */}
            <div className="text-center mt-3">
              <p className="text-white mb-0" style={{ 
                fontSize: '0.8rem',
                textShadow: '0 2px 4px rgba(0,0,0,0.3)'
              }}>
                <i className="bi bi-shield-check-fill me-1"></i>
                Your session and data are secure. This error has been logged.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

