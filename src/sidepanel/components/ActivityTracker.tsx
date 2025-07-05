import React, { useState, useEffect } from 'react';
import { Flame, Trophy, Calendar, TrendingUp, Target, Zap, Award, Clock, X, BookOpen, FolderPlus, Search, Circle } from 'lucide-react';
import { storage } from '../../utils/storage';

interface ActivityTrackerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ActivityStats {
  totalSaves: number;
  totalReads: number;
  totalHighlights: number;
  totalOrganizations: number;
  totalSearches: number;
  activeDays: number;
  currentStreak: number;
  bestStreak: number;
  thisWeekActivity: number;
  lastActiveDate?: Date;
}

const ActivityTracker: React.FC<ActivityTrackerProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadActivityData();
    }
  }, [isOpen]);

  const loadActivityData = async () => {
    setLoading(true);
    try {
      const [activityStats, activities] = await Promise.all([
        storage.getActivityStats(),
        storage.getActivities(10)
      ]);
      
      setStats(activityStats);
      setRecentActivities(activities);
    } catch (error) {
      console.error('Failed to load activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStreakMessage = () => {
    if (!stats) return '';
    
    if (stats.currentStreak === 0) {
      return 'Start your saving streak today!';
    } else if (stats.currentStreak === 1) {
      return 'Great start! Keep it up tomorrow.';
    } else if (stats.currentStreak < 7) {
      return `${stats.currentStreak} days strong! You're building momentum.`;
    } else if (stats.currentStreak < 30) {
      return `${stats.currentStreak} days! You're on fire! 🔥`;
    } else {
      return `${stats.currentStreak} days! You're a Nest champion! 🏆`;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'save': return <Target size={14} className="activity-icon save" />;
      case 'read': return <BookOpen size={14} className="activity-icon read" />;
      case 'highlight': return <Zap size={14} className="activity-icon highlight" />;
      case 'organize': return <FolderPlus size={14} className="activity-icon organize" />;
      case 'search': return <Search size={14} className="activity-icon search" />;
      default: return <Circle size={14} className="activity-icon default" />;
    }
  };

  const getActivityDescription = (activity: any) => {
    switch (activity.type) {
      case 'save':
        return activity.metadata?.withContext 
          ? 'Saved with context' 
          : 'Saved a link';
      case 'read':
        return 'Opened a saved link';
      case 'highlight':
        return 'Created a highlight';
      case 'organize':
        return activity.metadata?.action === 'move_from_inbox' 
          ? 'Organized from inbox' 
          : 'Moved to collection';
      case 'search':
        return 'Searched links';
      default:
        return 'Activity';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content activity-tracker-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <TrendingUp size={20} />
            Activity & Streaks
          </h2>
          <button onClick={onClose} className="modal-close-button" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {loading ? (
            <div className="activity-loading">
              <div className="loading-spinner"></div>
              <span>Loading your activity...</span>
            </div>
          ) : stats ? (
            <>
              {/* Streak Section */}
              <div className="streak-section">
                <div className="streak-card main-streak">
                  <div className="streak-icon">
                    <Flame size={32} className={stats.currentStreak > 0 ? 'flame-active' : 'flame-inactive'} />
                  </div>
                  <div className="streak-content">
                    <div className="streak-number">{stats.currentStreak}</div>
                    <div className="streak-label">Day Streak</div>
                    <div className="streak-message">{getStreakMessage()}</div>
                  </div>
                  {stats.bestStreak > 0 && (
                    <div className="best-streak">
                      <Trophy size={16} />
                      <span>Best: {stats.bestStreak}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats Grid */}
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-icon">
                    <Target size={20} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">{stats.totalSaves}</div>
                    <div className="stat-label">Links Saved</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <Calendar size={20} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">{stats.activeDays}</div>
                    <div className="stat-label">Active Days</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <Zap size={20} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">{stats.totalHighlights}</div>
                    <div className="stat-label">Highlights</div>
                  </div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon">
                    <Award size={20} />
                  </div>
                  <div className="stat-content">
                    <div className="stat-number">{stats.totalOrganizations}</div>
                    <div className="stat-label">Organized</div>
                  </div>
                </div>
              </div>

              {/* Weekly Activity */}
              <div className="weekly-activity">
                <h3>This Week</h3>
                <div className="weekly-stat">
                  <span className="weekly-number">{stats.thisWeekActivity}</span>
                  <span className="weekly-label">activities</span>
                </div>
              </div>

              {/* Recent Activities */}
              <div className="recent-activities">
                <h3>Recent Activity</h3>
                {recentActivities.length === 0 ? (
                  <div className="no-activities">
                    <Clock size={24} />
                    <p>No recent activity</p>
                    <span>Start saving links to build your activity history!</span>
                  </div>
                ) : (
                  <div className="activities-list">
                    {recentActivities.map((activity, index) => (
                      <div key={activity.id || index} className="activity-item">
                        {getActivityIcon(activity.type)}
                        <div className="activity-content">
                          <div className="activity-description">
                            {getActivityDescription(activity)}
                          </div>
                          <div className="activity-time">
                            {formatTimeAgo(new Date(activity.createdAt))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Motivational Message */}
              <div className="motivation-section">
                <div className="motivation-card">
                  <Flame size={20} />
                  <div className="motivation-content">
                    <h4>Keep Going!</h4>
                    <p>
                      {stats.currentStreak > 0 
                        ? `You're ${stats.currentStreak} day${stats.currentStreak > 1 ? 's' : ''} into your streak. Don't break the chain!`
                        : 'Start a new streak by saving something today!'
                      }
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="activity-error">
              <p>Failed to load activity data</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityTracker; 