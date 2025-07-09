'use client';

import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Lock, User } from 'lucide-react';

interface LoginFormProps {
  onSuccess?: () => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isMagicLink, setIsMagicLink] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, signUp, signInWithMagicLink, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    // Validation
    if (!email) {
      setError('Email is required');
      setIsSubmitting(false);
      return;
    }

    if (isMagicLink) {
      // Magic link flow
      try {
        const result = await signInWithMagicLink(email);
        if (result.success) {
          setSuccess('Magic link sent! Check your email and click the link to sign in.');
        } else {
          setError(result.error || 'Failed to send magic link');
        }
      } catch {
        setError('An unexpected error occurred');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // Regular email/password flow
    if (!password) {
      setError('Password is required');
      setIsSubmitting(false);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError('Passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);

      if (result.success) {
        onSuccess?.();
      } else {
        setError(result.error || 'Authentication failed');
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setIsMagicLink(false);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  const toggleMagicLink = () => {
    setIsMagicLink(!isMagicLink);
    setIsSignUp(false);
    setError('');
    setSuccess('');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-2xl font-bold">N</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isMagicLink 
              ? 'Sign in with Magic Link' 
              : isSignUp 
                ? 'Create your account' 
                : 'Sign in to your account'
            }
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {isMagicLink
              ? 'Enter your email to receive a secure sign-in link'
              : isSignUp 
                ? 'Join Nest to start organizing your knowledge' 
                : 'Welcome back to Nest'
            }
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="text-red-800 text-sm">{error}</div>
              </div>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-md p-4">
              <div className="flex">
                <div className="text-green-800 text-sm">{success}</div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email address
              </label>
              <div className="mt-1 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {!isMagicLink && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={isSignUp ? 'new-password' : 'current-password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {!isMagicLink && isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="appearance-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={isSubmitting || loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting || loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isMagicLink 
                    ? 'Sending magic link...' 
                    : isSignUp 
                      ? 'Creating account...' 
                      : 'Signing in...'
                  }
                </div>
              ) : (
                <>
                  <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                    <User className="h-5 w-5 text-blue-500 group-hover:text-blue-400" />
                  </span>
                  {isMagicLink 
                    ? 'Send Magic Link' 
                    : isSignUp 
                      ? 'Create Account' 
                      : 'Sign In'
                  }
                </>
              )}
            </button>
          </div>

          <div className="text-center space-y-2">
            {!isMagicLink && (
              <button
                type="button"
                onClick={toggleMode}
                className="text-blue-600 hover:text-blue-500 text-sm font-medium block w-full"
              >
                {isSignUp 
                  ? 'Already have an account? Sign in' 
                  : "Don&apos;t have an account? Sign up"}
              </button>
            )}
            
            <button
              type="button"
              onClick={toggleMagicLink}
              className="text-purple-600 hover:text-purple-500 text-sm font-medium block w-full"
            >
              {isMagicLink 
                ? 'Use password instead' 
                : '✨ Sign in with Magic Link'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 