'use client'
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { user, loading, isAuthenticated, requireAuth } = useAuth();
  const router = useRouter();
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        setIsRedirecting(true);
        // Store the current URL to redirect back after login
        const currentPath = window.location.pathname;
        // Use replace to prevent back button navigation
        window.location.replace(`/?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }

      // Check role-based access
      if (requiredRole && user?.role !== requiredRole) {
        setIsRedirecting(true);
        router.replace('/admin'); // Redirect to admin dashboard if role doesn't match
        return;
      }
    }
  }, [loading, isAuthenticated, user, requiredRole, router]);

  // Show loading spinner while checking auth or redirecting
  if (loading || isRedirecting) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: '#fff' }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Double-check authentication before rendering
  if (!isAuthenticated) {
    setIsRedirecting(true);
    window.location.replace('/');
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh', background: '#fff' }}>
        <LoadingSpinner />
      </div>
    );
  }

  // Check role-based access
  if (requiredRole && user?.role !== requiredRole) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
        <div className="text-center">
          <h3>Access Denied</h3>
          <p>You don&apos;t have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return children;
}
