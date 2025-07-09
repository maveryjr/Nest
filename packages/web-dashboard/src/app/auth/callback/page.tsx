'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';

export default function AuthCallback() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState<string>('');
  const router = useRouter();
  const { checkAuth } = useAuth();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Check if we have auth tokens in the URL hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        
        if (accessToken) {
          // Store tokens and check auth
          await checkAuth();
          setStatus('success');
          
          // Redirect to home after a brief delay
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          // Check for error in URL
          const errorParam = hashParams.get('error');
          if (errorParam) {
            setError(errorParam);
            setStatus('error');
          } else {
            setError('No authentication tokens found');
            setStatus('error');
          }
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Authentication failed');
        setStatus('error');
      }
    };

    handleAuthCallback();
  }, [checkAuth, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Signing you in...</h2>
          <p className="text-gray-600">Processing your magic link authentication</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Successfully signed in!</h2>
          <p className="text-gray-600">Redirecting you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Authentication Failed</h2>
        <p className="text-gray-600 mb-4">{error || 'Something went wrong during authentication'}</p>
        <button
          onClick={() => router.push('/')}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Return to Login
        </button>
      </div>
    </div>
  );
} 