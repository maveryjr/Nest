'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signInWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth');
      const data = await response.json();
      
      if (data.success && data.data.user) {
        setUser(data.data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'signin',
          email,
          password,
        }),
      });

      const data = await response.json();
      
      console.log('Sign in response:', { status: response.status, data });
      
      if (data.success && data.data.user) {
        setUser(data.data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Sign in failed' };
      }
    } catch (error) {
      console.error('Sign in error:', error);
      return { success: false, error: 'Network error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'signup',
          email,
          password,
        }),
      });

      const data = await response.json();
      
      console.log('Sign up response:', { status: response.status, data });
      
      if (data.success && data.data.user) {
        setUser(data.data.user);
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Sign up failed' };
      }
    } catch (error) {
      console.error('Sign up error:', error);
      return { success: false, error: 'Network error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const signInWithMagicLink = async (email: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'magic-link',
          email,
        }),
      });

      const data = await response.json();
      
      console.log('Magic link response:', { status: response.status, data });
      
      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || 'Failed to send magic link' };
      }
    } catch (error) {
      console.error('Magic link error:', error);
      return { success: false, error: 'Network error occurred' };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    setLoading(true);
    try {
      await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'signout',
        }),
      });
      
      setUser(null);
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signInWithMagicLink,
    signOut,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
} 