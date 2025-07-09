import { NextRequest, NextResponse } from 'next/server';
import { createNestApiClient } from '@nest/shared';

// Configuration from environment variables
const API_CONFIG = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

// Validate configuration
function validateConfig() {
  if (!API_CONFIG.supabaseUrl || !API_CONFIG.supabaseAnonKey) {
    throw new Error('Missing required Supabase configuration. Please check your environment variables.');
  }
}

export async function POST(request: NextRequest) {
  try {
    validateConfig();
    
    const body = await request.json();
    const { action, email, password } = body;
    
    if (!action) {
      return NextResponse.json(
        { success: false, error: 'Action is required' },
        { status: 400 }
      );
    }
    
    const apiClient = createNestApiClient(API_CONFIG);
    
    switch (action) {
      case 'signin':
        if (!email || !password) {
          return NextResponse.json(
            { success: false, error: 'Email and password are required' },
            { status: 400 }
          );
        }
        
        const signInResult = await apiClient.signIn(email, password);
        
        if (signInResult.error) {
          return NextResponse.json(
            { success: false, error: signInResult.error.message },
            { status: 401 }
          );
        }
        
        return NextResponse.json({
          success: true,
          data: {
            user: signInResult.data.user,
            session: signInResult.data.session,
          },
        });
        
      case 'magic-link':
        if (!email) {
          return NextResponse.json(
            { success: false, error: 'Email is required' },
            { status: 400 }
          );
        }
        
        try {
          const origin = request.headers.get('origin') || 'http://localhost:3000';
          console.log('Magic link request:', { email, redirectTo: `${origin}/auth/callback` });
          
          const magicLinkResult = await apiClient.signInWithMagicLink(email, `${origin}/auth/callback`);
          
          console.log('Magic link result:', magicLinkResult);
          
          if (magicLinkResult.error) {
            console.error('Magic link error:', magicLinkResult.error);
            return NextResponse.json(
              { success: false, error: magicLinkResult.error.message },
              { status: 400 }
            );
          }
          
          return NextResponse.json({
            success: true,
            message: 'Magic link sent to your email',
          });
        } catch (error) {
          console.error('Magic link catch error:', error);
          return NextResponse.json(
            { success: false, error: 'Failed to send magic link' },
            { status: 500 }
          );
        }
        
      case 'signup':
        if (!email || !password) {
          return NextResponse.json(
            { success: false, error: 'Email and password are required' },
            { status: 400 }
          );
        }
        
        const signUpResult = await apiClient.signUp(email, password);
        
        if (signUpResult.error) {
          return NextResponse.json(
            { success: false, error: signUpResult.error.message },
            { status: 400 }
          );
        }
        
        return NextResponse.json({
          success: true,
          data: {
            user: signUpResult.data.user,
            session: signUpResult.data.session,
          },
        });
        
      case 'signout':
        const signOutResult = await apiClient.signOut();
        
        if (signOutResult.error) {
          return NextResponse.json(
            { success: false, error: signOutResult.error.message },
            { status: 500 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: 'Signed out successfully',
        });
        
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Authentication error:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('Missing required Supabase configuration')) {
        return NextResponse.json(
          { success: false, error: 'Server configuration error. Please contact support.' },
          { status: 500 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    validateConfig();
    
    const apiClient = createNestApiClient(API_CONFIG);
    const user = await apiClient.getCurrentUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    
    return NextResponse.json(
      { success: false, error: 'Failed to get user' },
      { status: 500 }
    );
  }
} 