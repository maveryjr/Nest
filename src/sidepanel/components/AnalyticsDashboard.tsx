import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Clock, Brain, Target, BookOpen, Lightbulb, Calendar } from 'lucide-react';
import { AnalyticsService } from '../../utils/analytics';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

interface AnalyticsInsights {
  totalItems: number;
  averageDaily: number;
  mostActiveDay: string;
  topTopics: string[];
  readingStreak: number;
  knowledgeGrowth: number;
  peakHours: number[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ onClose }) => {
  const [insights, setInsights] = useState<AnalyticsInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'week' | 'month'>('week');

  useEffect(() => {
    loadAnalytics();
  }, [timeframe]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const analyticsService = AnalyticsService.getInstance();
      const insights = await analyticsService.calculateInsights();
      setInsights(insights);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatHour = (hour: number): string => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}${ampm}`;
  };

  const getKnowledgeGrowthColor = (growth: number): string => {
    if (growth > 20) return 'text-green-600';
    if (growth > 0) return 'text-blue-600';
    if (growth === 0) return 'text-gray-600';
    return 'text-orange-600';
  };

  const getKnowledgeGrowthIcon = (growth: number) => {
    if (growth > 0) return <TrendingUp size={16} className="text-green-600" />;
    return <BarChart3 size={16} className="text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="analytics-dashboard">
        <div className="dashboard-header">
          <button onClick={onClose} className="close-button">×</button>
          <h2><BarChart3 size={20} /> Reading Analytics</h2>
        </div>
        <div className="dashboard-loading">
          <div className="loading-spinner">Loading analytics...</div>
        </div>
      </div>
    );
  }

  if (!insights) {
    return (
      <div className="analytics-dashboard">
        <div className="dashboard-header">
          <button onClick={onClose} className="close-button">×</button>
          <h2><BarChart3 size={20} /> Reading Analytics</h2>
        </div>
        <div className="dashboard-empty">
          <BookOpen size={48} className="empty-icon" />
          <p>Start reading and highlighting to see your analytics!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <button onClick={onClose} className="close-button">×</button>
        <h2><BarChart3 size={20} /> Reading Analytics</h2>
        
        <div className="timeframe-selector">
          <button 
            className={timeframe === 'week' ? 'active' : ''}
            onClick={() => setTimeframe('week')}
          >
            Week
          </button>
          <button 
            className={timeframe === 'month' ? 'active' : ''}
            onClick={() => setTimeframe('month')}
          >
            Month
          </button>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Summary Stats */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <BookOpen size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{insights.totalItems}</div>
              <div className="stat-label">Items This {timeframe}</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Target size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{insights.averageDaily.toFixed(1)}</div>
              <div className="stat-label">Daily Average</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Calendar size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{insights.readingStreak}</div>
              <div className="stat-label">Day Streak</div>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              {getKnowledgeGrowthIcon(insights.knowledgeGrowth)}
            </div>
            <div className="stat-content">
              <div className={`stat-value ${getKnowledgeGrowthColor(insights.knowledgeGrowth)}`}>
                {insights.knowledgeGrowth > 0 ? '+' : ''}{insights.knowledgeGrowth}%
              </div>
              <div className="stat-label">Knowledge Growth</div>
            </div>
          </div>
        </div>

        {/* Insights Section */}
        <div className="insights-section">
          <h3><Brain size={20} /> Your Reading Insights</h3>
          
          <div className="insight-cards">
            {insights.mostActiveDay !== 'N/A' && (
              <div className="insight-card">
                <Clock size={16} />
                <div>
                  <strong>Most Active Day:</strong> {insights.mostActiveDay}
                </div>
              </div>
            )}

            {insights.peakHours.length > 0 && (
              <div className="insight-card">
                <Clock size={16} />
                <div>
                  <strong>Peak Hours:</strong> {insights.peakHours.map(formatHour).join(', ')}
                </div>
              </div>
            )}

            {insights.topTopics.length > 0 && (
              <div className="insight-card">
                <Lightbulb size={16} />
                <div>
                  <strong>Top Topics:</strong> {insights.topTopics.slice(0, 3).join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {insights.totalItems > 0 && (
          <div className="recommendations-section">
            <h3><TrendingUp size={20} /> Recommendations</h3>
            <div className="recommendation-cards">
              {insights.readingStreak === 0 && (
                <div className="recommendation-card">
                  <Target size={16} />
                  <div>
                    <strong>Build a Streak:</strong> Try to read or highlight something every day to build consistency!
                  </div>
                </div>
              )}

              {insights.averageDaily < 1 && (
                <div className="recommendation-card">
                  <BookOpen size={16} />
                  <div>
                    <strong>Increase Activity:</strong> Aim for at least 1-2 highlights or saved links per day.
                  </div>
                </div>
              )}

              {insights.topTopics.length < 3 && (
                <div className="recommendation-card">
                  <Brain size={16} />
                  <div>
                    <strong>Explore More:</strong> Try reading about different topics to broaden your knowledge base.
                  </div>
                </div>
              )}

              {insights.knowledgeGrowth > 50 && (
                <div className="recommendation-card">
                  <TrendingUp size={16} />
                  <div>
                    <strong>Great Progress!</strong> You're learning rapidly. Consider reviewing past highlights to reinforce knowledge.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 