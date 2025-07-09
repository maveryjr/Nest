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

export async function GET() {
  try {
    validateConfig();
    
    const apiClient = createNestApiClient(API_CONFIG);
    
    // Get current user first
    const user = await apiClient.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch real links from Supabase
    const links = await apiClient.getLinks();
    
    return NextResponse.json({
      success: true,
      data: links,
      total: links.length,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Error fetching links:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('Missing required Supabase configuration')) {
        return NextResponse.json(
          { success: false, error: 'Server configuration error. Please contact support.' },
          { status: 500 }
        );
      }
      if (error.message.includes('Authentication required')) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch links' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    validateConfig();
    
    const body = await request.json();
    const apiClient = createNestApiClient(API_CONFIG);
    
    // Get current user first
    const user = await apiClient.getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!body.url || !body.title) {
      return NextResponse.json(
        { success: false, error: 'URL and title are required' },
        { status: 400 }
      );
    }

    // Create new link using real API
    const newLink = await apiClient.addLink({
      url: body.url,
      title: body.title,
      userNote: body.userNote || '',
      category: body.category || 'Uncategorized',
      tags: body.tags || [],
      favicon: body.favicon || '',
      domain: new URL(body.url).hostname,
      readingTime: body.readingTime || 0,
      contentType: body.contentType || 'webpage',
      author: body.author || '',
      publishDate: body.publishDate ? new Date(body.publishDate) : undefined,
    });

    return NextResponse.json({
      success: true,
      data: newLink,
    });
  } catch (error) {
    console.error('Error creating link:', error);
    
    // Return appropriate error response
    if (error instanceof Error) {
      if (error.message.includes('Missing required Supabase configuration')) {
        return NextResponse.json(
          { success: false, error: 'Server configuration error. Please contact support.' },
          { status: 500 }
        );
      }
      if (error.message.includes('Authentication required')) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to create link' },
      { status: 500 }
    );
  }
} 