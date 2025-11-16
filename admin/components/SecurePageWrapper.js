'use client'
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

/**
 * SecurePageWrapper - Wraps all admin pages to ensure authentication
 * This component prevents ANY content from rendering or API calls from being made
 * until authentication is verified.
 */
export default function SecurePageWrapper({ children }) {
  const { user, loading, isAuthenticated } = useAuth();
  const [isVerifying, setIsVerifying] = useState(true);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    // Double-check authentication
    const verifyAuth = () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const userData = typeof window !== 'undefined' ? localStorage.getItem('user') : null;

      if (!loading) {
        if (!isAuthenticated || !token || !userData) {
          console.warn('🔒 SecurePageWrapper: Authentication failed');
          
          // Clear any stale data
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            
            // Force redirect to login
            const currentPath = window.location.pathname;
            window.location.replace('/?redirect=' + encodeURIComponent(currentPath));
          }
          
          setShouldRender(false);
        } else {
          // Authentication verified
          setShouldRender(true);
        }
        setIsVerifying(false);
      }
    };

    verifyAuth();
  }, [loading, isAuthenticated]);

  // Prevent caching of protected pages
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Disable browser back/forward cache for protected pages
      window.onpageshow = function(event) {
        if (event.persisted) {
          // Page loaded from cache - verify auth again
          const token = localStorage.getItem('token');
          if (!token) {
            window.location.replace('/');
          }
        }
      };

      return () => {
        window.onpageshow = null;
      };
    }
  }, []);

  // Show loading spinner while verifying authentication
  if (loading || isVerifying || !shouldRender) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: '#fff' }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Only render children after authentication is verified
  return children;
}

