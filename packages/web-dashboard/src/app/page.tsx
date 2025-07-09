'use client';

import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState, useCallback } from 'react';
import LoginForm from '../components/LoginForm';
import { Search, Plus, Settings, User, Filter, Grid, LogOut } from 'lucide-react';

interface Link {
  id: string;
  title: string;
  url: string;
  domain: string;
  createdAt: string;
  tags: string[];
  category: string;
  readingTime: number;
  author?: string;
  description?: string;
}

export default function HomePage() {
  const { user, loading, signOut } = useAuth();
  const [links, setLinks] = useState<Link[]>([]);
  const [linksLoading, setLinksLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLinks = useCallback(async () => {
    if (!user) return;
    
    setLinksLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/links');
      const data = await response.json();
      
      if (data.success) {
        setLinks(data.data);
      } else {
        setError(data.error || 'Failed to fetch links');
      }
    } catch {
      setError('Network error occurred');
    } finally {
      setLinksLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm onSuccess={fetchLinks} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-gray-900">Nest</h1>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search by keyword or topic"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-4">
              <button 
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Filter links"
                aria-label="Filter links"
              >
                <Filter className="h-5 w-5" />
              </button>
              <button 
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Grid view"
                aria-label="Switch to grid view"
              >
                <Grid className="h-5 w-5" />
              </button>
              <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                <span>Add Link</span>
              </button>
              <button 
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Settings"
                aria-label="Open settings"
              >
                <Settings className="h-5 w-5" />
              </button>
              <div className="relative">
                <button 
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                  title={`Signed in as ${user.email}`}
                  aria-label="User menu"
                >
                  <User className="h-5 w-5" />
                </button>
              </div>
              <button 
                onClick={handleSignOut}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome back, {user.email}!
          </h2>
          <p className="text-gray-600">
            Here&apos;s your knowledge dashboard
          </p>
        </div>

        {/* Stats Bar */}
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">My Links</h3>
                <p className="text-gray-600">{links.length} links saved</p>
              </div>
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{links.length}</div>
                  <div className="text-sm text-gray-500">Total</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {links.filter(link => !link.readingTime || link.readingTime === 0).length}
                  </div>
                  <div className="text-sm text-gray-500">Unread</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {new Set(links.map(link => link.category)).size}
                  </div>
                  <div className="text-sm text-gray-500">Categories</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {linksLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Links Grid */}
        {!linksLoading && links.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {links.map((link) => (
              <div key={link.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                      <span className="text-sm text-gray-500">{link.domain}</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(link.createdAt)}</span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600">
                      {link.title}
                    </a>
                  </h3>
                  
                  {link.description && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {link.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {link.tags.map((tag, tagIndex) => (
                        <span key={tagIndex} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                          {tag}
                        </span>
                      ))}
                    </div>
                    {link.readingTime > 0 && (
                      <span className="text-xs text-gray-500">{link.readingTime} min read</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!linksLoading && links.length === 0 && !error && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Plus className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No links yet</h3>
            <p className="text-gray-600 mb-4">Start building your knowledge collection by adding your first link</p>
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Add Your First Link
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
