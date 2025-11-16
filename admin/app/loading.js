'use client'
import React from 'react';
import Image from 'next/image';
import logo from '../public/img/logo.jpg';

export default function Loading() {
  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ 
      background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 50%, #1a365d 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated Background */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        opacity: 0.1,
        backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 80%, white 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        animation: 'moveBackground 20s linear infinite'
      }}></div>

      <div className="text-center">
        {/* Logo with Pulse Animation */}
        <div className="mb-3" style={{ 
          animation: 'pulse 2s ease-in-out infinite'
        }}>
          <Image
            src={logo}
            alt="Urbanesta Realtors Logo"
            width={100}
            height={100}
            className="rounded-circle shadow-lg"
            priority
            style={{
              border: '3px solid white',
              boxShadow: '0 8px 30px rgba(0,0,0,0.3)'
            }}
          />
        </div>

        {/* Loading Spinner */}
        <div className="mb-3">
          <div className="spinner-border text-light" role="status" style={{ 
            width: '3rem', 
            height: '3rem',
            borderWidth: '0.25rem'
          }}>
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>

        {/* Loading Text */}
        <h5 className="text-white fw-bold mb-2" style={{ 
          textShadow: '0 2px 10px rgba(0,0,0,0.3)',
          fontSize: '1.25rem'
        }}>
          Loading...
        </h5>
        <p className="text-white-50" style={{ 
          fontSize: '0.9rem',
          textShadow: '0 2px 8px rgba(0,0,0,0.3)'
        }}>
          <i className="bi bi-hourglass-split me-1"></i>
          Please wait while we prepare your content
        </p>

        {/* Progress Bar */}
        <div className="mt-3 mx-auto" style={{ maxWidth: '250px' }}>
          <div className="progress" style={{ 
            height: '5px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255,255,255,0.2)'
          }}>
            <div 
              className="progress-bar progress-bar-striped progress-bar-animated"
              role="progressbar"
              style={{ 
                width: '100%',
                background: 'linear-gradient(90deg, #10b981, #059669)',
                borderRadius: '8px'
              }}
            ></div>
          </div>
        </div>

        {/* Company Name */}
        <div className="mt-4 pt-3">
          <p className="text-white mb-0" style={{ 
            fontSize: '1rem',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)',
            fontWeight: '600'
          }}>
            <i className="bi bi-building me-2"></i>
            Urbanesta Realtors
          </p>
          <p className="text-white-50 mb-0" style={{ 
            fontSize: '0.85rem',
            textShadow: '0 2px 8px rgba(0,0,0,0.3)'
          }}>
            Admin Panel
          </p>
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.05);
            opacity: 0.9;
          }
        }

        @keyframes moveBackground {
          0% {
            transform: translate(0, 0);
          }
          100% {
            transform: translate(50px, 50px);
          }
        }
      `}</style>
    </div>
  );
}

