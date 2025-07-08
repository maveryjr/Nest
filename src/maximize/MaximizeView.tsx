import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Bookmark,
  Grid3x3,
  List,
  Filter,
  Settings,
  Star,
  Calendar,
  Clock,
  TrendingUp,
  Eye,
  FolderOpen,
  Tags,
  Sparkles,
  ArrowLeft,
  BarChart3,
  Users,
  Activity
} from 'lucide-react';
import { SavedLink, Collection } from '../types';
import { storage } from '../utils/storage';
import './maximize.css';

interface QuickStat {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
}

interface ActivityItem {
  id: string;
  type: 'save' | 'organize' | 'read';
  title: string;
  time: Date;
  icon: React.ReactNode;
}

const MaximizeView: React.FC = () => {
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'unread' | 'recent' | 'starred'>('all');
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [quickStats, setQuickStats] = useState<QuickStat[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await storage.getData();
      setLinks(data.links || []);
      setCollections(data.collections || []);
      
      // Calculate stats
      const totalLinks = data.links?.length || 0;
      const totalCollections = data.collections?.length || 0;
      const unreadCount = data.links?.filter(link => !link.lastReadAt).length || 0;
      const thisWeekCount = data.links?.filter(link => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return new Date(link.createdAt) >= weekAgo;
      }).length || 0;

      setQuickStats([
        {
          label: 'Total Links',
          value: totalLinks,
          icon: <Bookmark size={24} />,
          color: '#3b82f6',
          trend: 12
        },
        {
          label: 'Collections',
          value: totalCollections,
          icon: <FolderOpen size={24} />,
          color: '#8b5cf6',
          trend: 5
        },
        {
          label: 'Unread',
          value: unreadCount,
          icon: <Eye size={24} />,
          color: '#f59e0b',
          trend: -8
        },
        {
          label: 'This Week',
          value: thisWeekCount,
          icon: <Calendar size={24} />,
          color: '#10b981',
          trend: 23
        }
      ]);

      // Generate recent activity
      const activities: ActivityItem[] = [
        {
          id: '1',
          type: 'save',
          title: 'Saved "Understanding React Hooks"',
          time: new Date(Date.now() - 10 * 60 * 1000), // 10 mins ago
          icon: <Plus size={16} />
        },
        {
          id: '2',
          type: 'organize',
          title: 'Moved 3 links to "Learning" collection',
          time: new Date(Date.now() - 45 * 60 * 1000), // 45 mins ago
          icon: <FolderOpen size={16} />
        },
        {
          id: '3',
          type: 'read',
          title: 'Read "Modern CSS Techniques"',
          time: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          icon: <Eye size={16} />
        }
      ];
      setRecentActivity(activities);

    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLinks = links.filter(link => {
    const matchesSearch = link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         link.domain.toLowerCase().includes(searchTerm.toLowerCase());
    
    switch (selectedFilter) {
      case 'unread':
        return matchesSearch && !link.lastReadAt;
      case 'recent':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return matchesSearch && new Date(link.createdAt) >= weekAgo;
      case 'starred':
        return matchesSearch && link.isStarred;
      default:
        return matchesSearch;
    }
  });

  const handleBack = () => {
    window.close();
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) {
    return (
      <div className="maximize-view loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your knowledge base...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="maximize-view">
      {/* Header */}
      <header className="maximize-header">
        <div className="header-left">
          <button onClick={handleBack} className="back-button">
            <ArrowLeft size={20} />
          </button>
          <div className="logo">
            <div className="logo-icon">
              <Bookmark size={24} />
            </div>
            <h1>Nest</h1>
          </div>
        </div>
        
        <div className="header-center">
          <div className="search-container">
            <Search size={20} className="search-icon" />
            <input
              type="text"
              placeholder="Search across all your saved content..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <div className="header-right">
          <div className="view-controls">
            <button
              className={`view-button ${view === 'grid' ? 'active' : ''}`}
              onClick={() => setView('grid')}
              title="Grid view"
            >
              <Grid3x3 size={18} />
            </button>
            <button
              className={`view-button ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
          <button className="settings-button">
            <Settings size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="maximize-main">
        {/* Stats Dashboard */}
        <section className="stats-dashboard">
          <div className="stats-grid">
            {quickStats.map((stat, index) => (
              <div key={index} className="stat-card" style={{ '--accent-color': stat.color } as React.CSSProperties}>
                <div className="stat-icon">
                  {stat.icon}
                </div>
                <div className="stat-content">
                  <div className="stat-label">{stat.label}</div>
                  <div className="stat-value">{stat.value.toLocaleString()}</div>
                  {stat.trend && (
                    <div className={`stat-trend ${stat.trend > 0 ? 'positive' : 'negative'}`}>
                      <TrendingUp size={12} />
                      {Math.abs(stat.trend)}%
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quick Actions */}
        <section className="quick-actions">
          <h2>Quick Actions</h2>
          <div className="action-grid">
            <button className="action-card primary">
              <Plus size={24} />
              <span>Save Current Page</span>
            </button>
            <button className="action-card">
              <FolderOpen size={24} />
              <span>New Collection</span>
            </button>
            <button className="action-card">
              <Sparkles size={24} />
              <span>AI Organize</span>
            </button>
            <button className="action-card">
              <BarChart3 size={24} />
              <span>Analytics</span>
            </button>
          </div>
        </section>

        <div className="content-grid">
          {/* Links Section */}
          <section className="links-section">
            <div className="section-header">
              <h2>Your Links</h2>
              <div className="filter-controls">
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value as any)}
                  className="filter-select"
                >
                  <option value="all">All Links</option>
                  <option value="unread">Unread</option>
                  <option value="recent">Recent</option>
                  <option value="starred">Starred</option>
                </select>
              </div>
            </div>

            <div className={`links-container ${view}`}>
              {filteredLinks.length === 0 ? (
                <div className="empty-state">
                  <Bookmark size={48} />
                  <h3>No links found</h3>
                  <p>Start building your knowledge base by saving interesting content.</p>
                </div>
              ) : (
                filteredLinks.map((link) => (
                  <div key={link.id} className="link-card">
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
                      {link.aiSummary && (
                        <p className="link-summary">{link.aiSummary}</p>
                      )}
                      <div className="link-meta">
                        <span className="link-date">
                          {formatRelativeTime(new Date(link.createdAt))}
                        </span>
                        {link.category && (
                          <span className="link-category">{link.category}</span>
                        )}
                      </div>
                    </div>
                    <div className="link-actions">
                      <button className="action-btn" title="Open link">
                        <Eye size={16} />
                      </button>
                      <button className="action-btn" title="Star">
                        <Star size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Sidebar */}
          <aside className="sidebar">
            {/* Collections */}
            <section className="collections-panel">
              <h3>Collections</h3>
              <div className="collections-list">
                {collections.length === 0 ? (
                  <p className="empty-message">No collections yet</p>
                ) : (
                  collections.map((collection) => (
                    <div key={collection.id} className="collection-item">
                      <FolderOpen size={16} />
                      <span>{collection.name}</span>
                      <span className="collection-count">
                        {links.filter(l => l.collectionId === collection.id).length}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </section>

            {/* Recent Activity */}
            <section className="activity-panel">
              <h3>Recent Activity</h3>
              <div className="activity-list">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="activity-item">
                    <div className="activity-icon">
                      {activity.icon}
                    </div>
                    <div className="activity-content">
                      <p className="activity-title">{activity.title}</p>
                      <span className="activity-time">
                        {formatRelativeTime(activity.time)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default MaximizeView;