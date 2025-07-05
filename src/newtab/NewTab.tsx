import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Bookmark, 
  Clock, 
  TrendingUp, 
  Sparkles, 
  Settings, 
  ExternalLink,
  Calendar,
  Target,
  Flame,
  BookOpen,
  Archive,
  Eye,
  EyeOff
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

  useEffect(() => {
    checkIfEnabled();
    loadData();
    setGreeting(getTimeBasedGreeting());
  }, []);

  const checkIfEnabled = async () => {
    try {
      const result = await chrome.storage.local.get('nest_newtab_enabled');
      setIsEnabled(result.nest_newtab_enabled !== false); // Default to enabled
    } catch (error) {
      console.error('Failed to check new tab setting:', error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setLoading(false);
        return;
      }

      const [data, activityStats] = await Promise.all([
        storage.getData(),
        storage.getActivityStats()
      ]);

      // Get recent links (last 8)
      const recent = data.links
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 8);
      setRecentLinks(recent);

      // Get smart collections
      setSmartCollections(data.smartCollections || []);

      // Set current streak
      setCurrentStreak(activityStats.currentStreak);

      // Set quick stats
      setQuickStats([
        {
          label: 'Links Saved',
          value: data.links.length,
          icon: <Bookmark size={20} />,
          color: '#3b82f6'
        },
        {
          label: 'Collections',
          value: data.collections.length,
          icon: <Archive size={20} />,
          color: '#8b5cf6'
        },
        {
          label: 'This Week',
          value: activityStats.thisWeekActivity,
          icon: <Calendar size={20} />,
          color: '#10b981'
        },
        {
          label: 'Streak',
          value: activityStats.currentStreak,
          icon: <Flame size={20} />,
          color: '#f59e0b'
        }
      ]);
    } catch (error) {
      console.error('Failed to load new tab data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTimeBasedGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      // Open sidepanel with search
      chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
      // Store search term for sidepanel to pick up
      chrome.storage.local.set({ 'nest_search_query': searchTerm.trim() });
    }
  };

  const handleSaveCurrentPage = async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'saveCurrentPage' });
    } catch (error) {
      console.error('Failed to save current page:', error);
    }
  };

  const handleOpenSidepanel = () => {
    chrome.sidePanel.open({ windowId: chrome.windows.WINDOW_ID_CURRENT });
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
    const newValue = !isEnabled;
    setIsEnabled(newValue);
    await chrome.storage.local.set({ 'nest_newtab_enabled': newValue });
    
    if (!newValue) {
      // Redirect to default new tab
      window.location.href = 'chrome://newtab/';
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
          <button onClick={handleToggleNewTab} className="header-button" title="Disable Nest New Tab">
            <EyeOff size={18} />
          </button>
          <button onClick={handleOpenSidepanel} className="header-button" title="Open Nest Sidepanel">
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