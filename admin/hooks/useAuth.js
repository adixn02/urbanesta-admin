'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logout as apiLogout } from '@/lib/logout';

// Helper function to check if JWT token is expired
const isTokenExpired = (token) => {
  try {
    if (!token) return true;
    
    // Decode JWT token (it's base64 encoded)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Check if token has expiry time
    if (!payload.exp) return false; // No expiry means it's valid
    
    // Check if token is expired (exp is in seconds, Date.now() is in milliseconds)
    const isExpired = payload.exp * 1000 < Date.now();
    
    if (isExpired) {
      console.log('🔴 JWT token has expired');
    }
    
    return isExpired;
  } catch (error) {
    console.error('Error checking token expiry:', error);
    return true; // Treat as expired if we can't decode it
  }
};

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      try {
        // Check if we're on login page with redirect param or recent auth failure
        const isOnLoginWithRedirect = typeof window !== 'undefined' && 
          window.location.pathname === '/' && 
          (window.location.search.includes('redirect=') || sessionStorage.getItem('auth_redirect'));
        
        if (isOnLoginWithRedirect) {
          // We're on login page due to auth failure, force clear everything
          console.log('🔴 On login page with redirect - clearing auth');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          sessionStorage.removeItem('auth_redirect');
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
          return;
        }
        
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
          // Check if token is expired
          if (isTokenExpired(token)) {
            console.log('🔴 Token expired, clearing auth state');
            // Token is expired, clear everything
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
            sessionStorage.removeItem('auth_redirect');
            setUser(null);
            setIsAuthenticated(false);
          } else {
            const parsedUser = JSON.parse(userData);
            setUser(parsedUser);
            setIsAuthenticated(true);
          }
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        // If there's an error, clear auth state
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('auth_redirect');
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (userData, token) => {
    try {
      localStorage.setItem('user', JSON.stringify(userData));
      localStorage.setItem('token', token);
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const logout = async () => {
    try {
      // Call API to log the logout activity
      await apiLogout();
      // Clear local state
      setUser(null);
      setIsAuthenticated(false);
      // Redirect to login page
      router.push('/');
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if API call fails, clear local state and redirect
      try {
        localStorage.clear();
        document.cookie = 'urbanesta_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
        document.cookie = 'urbanesta_refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;';
        setUser(null);
        setIsAuthenticated(false);
        router.push('/');
      } catch (clearError) {
        console.error('Error clearing storage:', clearError);
      }
    }
  };

  const requireAuth = () => {
    if (!loading && !isAuthenticated) {
      router.push('/');
      return false;
    }
    return isAuthenticated;
  };

  return {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    requireAuth
  };
};
