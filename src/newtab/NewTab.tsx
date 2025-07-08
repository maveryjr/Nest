import React, { useState, useEffect } from 'react';
import {
  Bookmark,
  Search,
  Plus,
  BookOpen,
  Clock,
  ExternalLink,
  Settings,
  Target,
  Sparkles,
  Calendar,
  Flame,
  Archive,
  Eye,
  EyeOff,
  Folder,
  AlertTriangle
} from 'lucide-react';
import { SavedLink, Collection, SmartCollection } from '../types';
import { storage } from '../utils/storage';
import { supabase } from '../utils/supabase';
import './newtab.css';

interface QuickStat {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

const NewTab: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [recentLinks, setRecentLinks] = useState<SavedLink[]>([]);
  const [smartCollections, setSmartCollections] = useState<SmartCollection[]>([]);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [greeting, setGreeting] = useState('');
  const [isRestrictedContext, setIsRestrictedContext] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      // First check extension context and wait for it to complete
      await checkExtensionContext();
      
      // Then run other initialization functions
      checkIfEnabled();
      loadData();
      setGreeting(getTimeBasedGreeting());
      
      // Load dark mode setting
      loadDarkModeSetting();
    };

    initializeApp();
  }, []);

  const checkExtensionContext = async () => {
    try {
      // Test if Chrome extension APIs are working properly
      if (!chrome?.windows || !chrome?.sidePanel || !chrome?.storage) {
        setIsRestrictedContext(true);
        return;
      }

      // Try to get current window to see if API is actually functional
      const windows = await chrome.windows.getCurrent();
      if (!windows || windows.id === undefined || windows.id < 0) {
        setIsRestrictedContext(true);
        return;
      }

      setIsRestrictedContext(false);
    } catch (error) {
      console.error('Extension context check failed:', error);
      setIsRestrictedContext(true);
    }
  };

  const checkIfEnabled = async () => {
    try {
      if (isRestrictedContext) {
        // In restricted context, assume enabled since we can't check storage reliably
        setIsEnabled(true);
        return;
      }

      const result = await chrome.storage.local.get('nest_newtab_enabled');
      // Default to enabled (true) instead of disabled - fix the missing logic
      const enabled = result.nest_newtab_enabled !== false;
      setIsEnabled(enabled);
    } catch (error) {
      console.error('Failed to check if enabled:', error);
      // Default to enabled if we can't check
      setIsEnabled(true);
    }
  };

  const loadData = async () => {
    try {
      if (isRestrictedContext) {
        // In restricted context, show minimal data
        setRecentLinks([]);
        setSmartCollections([]);
        setQuickStats([
          { label: 'Links Saved', value: 0, icon: <Bookmark size={20} />, color: '#3b82f6' },
          { label: 'Collections', value: 0, icon: <Folder size={20} />, color: '#8b5cf6' },
          { label: 'This Week', value: 0, icon: <Calendar size={20} />, color: '#10b981' },
          { label: 'Streak', value: 0, icon: <Flame size={20} />, color: '#f59e0b' }
        ]);
        setCurrentStreak(0);
        setLoading(false);
        return;
      }

      const data = await storage.getData();
      const recentSaves = data.links
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 6);
      
      setRecentLinks(recentSaves);
      setSmartCollections(data.smartCollections || []);
      
      // Calculate stats
      const thisWeekStart = new Date();
      thisWeekStart.setDate(thisWeekStart.getDate() - 7);
      const thisWeekCount = data.links.filter(link => 
        new Date(link.createdAt) >= thisWeekStart
      ).length;

      // Calculate current streak
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      let streak = 0;
      let checkDate = new Date(today);
      
      while (true) {
        const dayStart = new Date(checkDate);
        const dayEnd = new Date(checkDate);
        dayEnd.setHours(23, 59, 59, 999);
        
        const hasActivityThisDay = data.links.some(link => {
          const linkDate = new Date(link.createdAt);
          return linkDate >= dayStart && linkDate <= dayEnd;
        });
        
        if (hasActivityThisDay) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      setCurrentStreak(streak);
      
      setQuickStats([
        { label: 'Links Saved', value: data.links.length, icon: <Bookmark size={20} />, color: '#3b82f6' },
        { label: 'Collections', value: data.collections.length, icon: <Folder size={20} />, color: '#8b5cf6' },
        { label: 'This Week', value: thisWeekCount, icon: <Calendar size={20} />, color: '#10b981' },
        { label: 'Streak', value: streak, icon: <Flame size={20} />, color: '#f59e0b' }
      ]);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadDarkModeSetting = async () => {
    try {
      if (isRestrictedContext) {
        // In restricted context, skip dark mode detection
        return;
      }

      const result = await chrome.storage.local.get('nest_settings');
      const settings = result.nest_settings || {};
      if (settings.darkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    } catch (error) {
      console.error('Failed to load dark mode setting:', error);
    }
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      if (isRestrictedContext) {
        // Show user-friendly message when APIs are not available
        alert('Search functionality is not available when the new tab override is disabled in browser settings. Please re-enable Nest as your new tab page or use the extension popup/sidebar instead.');
        return;
      }

      try {
        // Get the current window ID dynamically instead of using WINDOW_ID_CURRENT
        const windows = await chrome.windows.getCurrent();
        if (windows && windows.id && windows.id > 0) {
          await chrome.sidePanel.open({ windowId: windows.id });
          // Store search term for sidepanel to pick up
          await chrome.storage.local.set({ 'nest_search_query': searchTerm.trim() });
        } else {
          console.error('Could not get valid current window for search');
          throw new Error('Invalid window ID');
        }
      } catch (error) {
        console.error('Failed to open sidepanel for search:', error);
        // Fallback: try to send message to background script
        try {
          await chrome.runtime.sendMessage({ action: 'openSidePanel' });
          await chrome.storage.local.set({ 'nest_search_query': searchTerm.trim() });
        } catch (fallbackError) {
          console.error('Fallback sidepanel open also failed:', fallbackError);
          alert('Unable to open search. Please try clicking the extension icon in the browser toolbar.');
        }
      }
    }
  };

  const handleSaveCurrentPage = async () => {
    if (isRestrictedContext) {
      alert('Save functionality is not available when the new tab override is disabled in browser settings. Please click the extension icon in the browser toolbar to save pages.');
      return;
    }

    try {
      await chrome.runtime.sendMessage({ action: 'saveCurrentPage' });
    } catch (error) {
      console.error('Failed to save current page:', error);
      alert('Unable to save page. Please try clicking the extension icon in the browser toolbar.');
    }
  };

  const handleOpenSidepanel = async () => {
    if (isRestrictedContext) {
      // Show user-friendly message when APIs are not available
      alert('Sidepanel functionality is not available when the new tab override is disabled in browser settings. Please re-enable Nest as your new tab page or click the extension icon in the browser toolbar.');
      return;
    }

    try {
      // Get the current window ID dynamically instead of using WINDOW_ID_CURRENT
      const windows = await chrome.windows.getCurrent();
      if (windows && windows.id && windows.id > 0) {
        await chrome.sidePanel.open({ windowId: windows.id });
      } else {
        console.error('Could not get valid current window for sidepanel');
        throw new Error('Invalid window ID');
      }
    } catch (error) {
      console.error('Failed to open sidepanel:', error);
      // Fallback: try to send message to background script
      try {
        await chrome.runtime.sendMessage({ action: 'openSidePanel' });
      } catch (fallbackError) {
        console.error('Fallback sidepanel open also failed:', fallbackError);
        alert('Unable to open sidepanel. Please try clicking the extension icon in the browser toolbar.');
      }
    }
  };

  const handleLinkClick = async (link: SavedLink) => {
    // Log read activity
    await storage.logActivity('read', link.id, link.collectionId, {
      source: 'newtab'
    });
    
    // Open link
    window.open(link.url, '_blank');
  };

  const handleToggleNewTab = async () => {
    if (isRestrictedContext) {
      alert('Settings cannot be changed when the extension is in restricted mode. Please re-enable Nest as your new tab page in browser settings.');
      return;
    }

    const newValue = !isEnabled;
    setIsEnabled(newValue);
    
    try {
      await chrome.storage.local.set({ 'nest_newtab_enabled': newValue });
      
      if (!newValue) {
        // Show a simple page with option to re-enable
        // Don't redirect to chrome://newtab/ as this doesn't work properly
        // The disabled state is handled by the component rendering
      }
    } catch (error) {
      console.error('Failed to toggle new tab setting:', error);
      // Revert the state if saving failed
      setIsEnabled(!newValue);
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isEnabled) {
    return (
      <div className="newtab-disabled">
        <div className="disabled-content">
          <Bookmark className="disabled-icon" size={48} />
          <h2>Nest New Tab is Disabled</h2>
          <p>Click below to re-enable the Nest home interface</p>
          <button onClick={handleToggleNewTab} className="enable-button">
            <Eye size={16} />
            Enable Nest New Tab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="newtab-container">
      {/* Restricted Context Banner */}
      {isRestrictedContext && (
        <div className="restricted-context-banner">
          <AlertTriangle size={20} />
          <div className="banner-content">
            <strong>Limited Functionality</strong>
            <span>Some features are disabled because Nest new tab override was disabled in browser settings. Click the extension icon in the toolbar for full functionality.</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="newtab-header">
        <div className="header-left">
          <div className="logo">
            <Bookmark className="logo-icon" size={24} />
            <span className="logo-text">Nest</span>
          </div>
          <div className="greeting">
            <h1>{greeting}!</h1>
            {currentStreak > 0 && (
              <div className="streak-badge">
                <Flame size={16} />
                <span>{currentStreak} day streak</span>
              </div>
            )}
          </div>
        </div>
        <div className="header-actions">
          <button 
            onClick={handleToggleNewTab} 
            className="header-button" 
            title={isRestrictedContext ? "Settings unavailable in restricted mode" : "Disable Nest New Tab"}
            disabled={isRestrictedContext}
          >
            <EyeOff size={18} />
          </button>
          <button 
            onClick={handleOpenSidepanel} 
            className="header-button" 
            title={isRestrictedContext ? "Limited functionality - use toolbar icon instead" : "Open Nest Sidepanel"}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      {loading ? (
        <div className="newtab-loading">
          <div className="loading-spinner"></div>
          <span>Loading your knowledge hub...</span>
        </div>
      ) : (
        <main className="newtab-main">
          {/* Search Section */}
          <section className="search-section">
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input-container">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search your saved links..."
                  className="search-input"
                  autoFocus
                />
              </div>
              <button type="submit" className="search-button">
                Search
              </button>
            </form>
          </section>

          {/* Quick Stats */}
          <section className="stats-section">
            <div className="stats-grid">
              {quickStats.map((stat, index) => (
                <div key={index} className="stat-card" style={{ '--stat-color': stat.color } as any}>
                  <div className="stat-icon">{stat.icon}</div>
                  <div className="stat-content">
                    <div className="stat-value">{stat.value}</div>
                    <div className="stat-label">{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Quick Actions */}
          <section className="actions-section">
            <button onClick={handleSaveCurrentPage} className="action-button primary">
              <Plus size={20} />
              Save This Page
            </button>
            <button onClick={handleOpenSidepanel} className="action-button secondary">
              <BookOpen size={20} />
              Open Nest
            </button>
          </section>

          {/* Content Grid */}
          <div className="content-grid">
            {/* Recent Links */}
            <section className="content-section recent-links">
              <div className="section-header">
                <h2>
                  <Clock size={20} />
                  Recent Saves
                </h2>
                <button onClick={handleOpenSidepanel} className="see-all-button">
                  See all
                  <ExternalLink size={14} />
                </button>
              </div>
              <div className="links-grid">
                {recentLinks.length === 0 ? (
                  <div className="empty-state">
                    <Target size={32} />
                    <p>No saved links yet</p>
                    <span>Start building your knowledge collection!</span>
                  </div>
                ) : (
                  recentLinks.map(link => (
                    <div key={link.id} className="link-card" onClick={() => handleLinkClick(link)}>
                      <div className="link-favicon">
                        {link.favicon ? (
                          <img src={link.favicon} alt="" />
                        ) : (
                          <div className="favicon-placeholder">
                            {link.domain.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="link-content">
                        <h3 className="link-title">{link.title}</h3>
                        <p className="link-domain">{link.domain}</p>
                        <span className="link-time">{formatTimeAgo(link.createdAt)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Smart Collections */}
            <section className="content-section smart-collections">
              <div className="section-header">
                <h2>
                  <Sparkles size={20} />
                  Smart Collections
                </h2>
                <button onClick={handleOpenSidepanel} className="see-all-button">
                  See all
                  <ExternalLink size={14} />
                </button>
              </div>
              <div className="collections-grid">
                {smartCollections.length === 0 ? (
                  <div className="empty-state">
                    <Sparkles size={32} />
                    <p>Smart collections will appear here</p>
                    <span>Save more links to unlock AI-powered collections!</span>
                  </div>
                ) : (
                  smartCollections.slice(0, 6).map(collection => (
                    <div key={collection.id} className="collection-card" onClick={handleOpenSidepanel}>
                      <div className="collection-icon">{collection.icon}</div>
                      <div className="collection-content">
                        <h3 className="collection-name">{collection.name}</h3>
                        <p className="collection-description">{collection.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        </main>
      )}
    </div>
  );
};

export default NewTab; 