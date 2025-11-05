'use client'
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { logout as apiLogout } from '@/lib/logout';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const userData = localStorage.getItem('user');
        
        if (token && userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Error checking auth:', error);
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
