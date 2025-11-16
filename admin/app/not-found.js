'use client'
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import logo from '../public/img/logo.jpg';
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function NotFound() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ 
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #1a365d 100%)',
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

                {/* 404 Icon */}
                <div className="mb-3">
                  <i className="bi bi-exclamation-triangle-fill" style={{
                    fontSize: '3.5rem',
                    color: '#f59e0b',
                    opacity: 0.9
                  }}></i>
                </div>

                {/* Error Message */}
                <h1 className="fw-bold mb-2" style={{ color: '#1a365d', fontSize: '2.5rem' }}>
                  404
                </h1>
                <h5 className="mb-2" style={{ color: '#2c5282', fontWeight: '600' }}>
                  Page Not Found
                </h5>
                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>
                  <i className="bi bi-info-circle me-1"></i>
                  The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                {/* Security Notice */}
                <div className="alert alert-warning d-flex align-items-start mb-3 py-2 px-3" role="alert" style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.85rem'
                }}>
                  <i className="bi bi-shield-lock-fill me-2 mt-1" style={{ fontSize: '1.1rem' }}></i>
                  <div className="text-start">
                    <strong>Access Restricted:</strong> This admin panel requires proper authentication.
                    <br />
                    <small style={{ fontSize: '0.8rem' }}>If you&apos;re trying to access unauthorized pages, your activity may be logged.</small>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="d-flex gap-2 justify-content-center mb-3">
                  <Link 
                    href="/"
                    className="btn px-4 py-2"
                    style={{
                      background: 'linear-gradient(135deg, #2c5282 0%, #1a365d 100%)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(44, 82, 130, 0.3)'
                    }}
                  >
                    <i className="bi bi-house-door-fill me-2"></i>
                    Go to Login
                  </Link>

                  <button 
                    onClick={() => window.history.back()}
                    className="btn btn-outline-secondary px-4 py-2"
                    style={{
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      borderWidth: '1px'
                    }}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Go Back
                  </button>
                </div>

                {/* Additional Info */}
                <div className="pt-3" style={{ borderTop: '1px solid #e5e7eb' }}>
                  <p className="text-muted mb-1" style={{ fontSize: '0.85rem' }}>
                    <i className="bi bi-building me-1"></i>
                    <strong>Urbanesta Realtors</strong> - Admin Panel
                  </p>
                  <p className="text-muted mb-0" style={{ fontSize: '0.75rem' }}>
                    Need help? Contact your system administrator.
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
                <i className="bi bi-lock-fill me-1"></i>
                This is a secure admin area. Unauthorized access is prohibited.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

