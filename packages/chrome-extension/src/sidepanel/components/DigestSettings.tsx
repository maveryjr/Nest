import React, { useState, useEffect } from 'react';
import { Mail, Clock, Calendar, Eye, Settings as SettingsIcon, Send, FileText } from 'lucide-react';
import { digest } from '../../utils/digest';
import { DigestPreferences, DigestContent } from '../../types';

interface DigestSettingsProps {
  onClose?: () => void;
}

const DigestSettings: React.FC<DigestSettingsProps> = ({ onClose }) => {
  const [preferences, setPreferences] = useState<DigestPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [previewDigest, setPreviewDigest] = useState<DigestContent | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const prefs = await digest.getPreferences();
      setPreferences(prefs);
    } catch (error) {
      console.error('Failed to load digest preferences:', error);
      setMessage('Failed to load preferences');
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async (newPreferences: DigestPreferences) => {
    setSaving(true);
    setMessage('');

    try {
      await digest.savePreferences(newPreferences);
      setPreferences(newPreferences);
      setMessage('Digest preferences saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save digest preferences:', error);
      setMessage('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  };

  const generatePreview = async () => {
    if (!preferences) return;
    
    setPreviewLoading(true);
    try {
      const preview = await digest.generatePreview();
      setPreviewDigest(preview);
      setShowPreview(true);
    } catch (error) {
      console.error('Failed to generate preview:', error);
      setMessage('Failed to generate preview');
    } finally {
      setPreviewLoading(false);
    }
  };

  const sendTestDigest = async () => {
    if (!preferences || !previewDigest) return;

    try {
      const emailHTML = await digest.generateEmailHTML(previewDigest);
      
      // In a real implementation, you'd send this via email service
      // For now, we'll open it in a new tab to show the user
      const blob = new Blob([emailHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      
      setMessage('Test digest opened in new tab!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to generate test digest:', error);
      setMessage('Failed to generate test digest');
    }
  };

  if (loading || !preferences) {
    return (
      <div className="digest-settings">
        <div className="loading-spinner">Loading digest settings...</div>
      </div>
    );
  }

  return (
    <div className="digest-settings">
      <div className="digest-header">
        <div className="digest-header-content">
          <Mail size={24} className="digest-icon" />
          <div>
            <h3>Daily Digest Email</h3>
            <p>Get personalized summaries of your saved content delivered to your inbox</p>
          </div>
        </div>
        <label className="toggle-switch" title="Enable daily digest emails">
          <input
            type="checkbox"
            checked={preferences.enabled}
            onChange={(e) => savePreferences({ ...preferences, enabled: e.target.checked })}
            disabled={saving}
            aria-label="Enable daily digest emails"
          />
          <span className="toggle-slider"></span>
        </label>
      </div>

      {preferences.enabled && (
        <div className="digest-config">
          {/* Frequency Settings */}
          <div className="setting-group">
            <h4>Schedule</h4>
            <div className="setting-item">
              <div className="setting-info">
                <Calendar size={16} />
                <div>
                  <div className="setting-label">Frequency</div>
                  <div className="setting-description">How often to receive digests</div>
                </div>
              </div>
              <select
                value={preferences.frequency}
                onChange={(e) => savePreferences({ ...preferences, frequency: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                className="form-control"
                disabled={saving}
                title="Select digest frequency"
                aria-label="Digest frequency"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <Clock size={16} />
                <div>
                  <div className="setting-label">Delivery Time</div>
                  <div className="setting-description">When to send the digest</div>
                </div>
              </div>
              <input
                type="time"
                value={preferences.time}
                onChange={(e) => savePreferences({ ...preferences, time: e.target.value })}
                className="form-control"
                disabled={saving}
                title="Select delivery time"
                aria-label="Delivery time"
              />
            </div>
          </div>

          {/* Content Settings */}
          <div className="setting-group">
            <h4>Content</h4>
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Include Statistics</div>
                <div className="setting-description">Show your activity stats and streaks</div>
              </div>
              <label className="toggle-switch" title="Include statistics in digest">
                <input
                  type="checkbox"
                  checked={preferences.includeStats}
                  onChange={(e) => savePreferences({ ...preferences, includeStats: e.target.checked })}
                  disabled={saving}
                  aria-label="Include statistics"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Recent Saves</div>
                <div className="setting-description">Your latest bookmarked links</div>
              </div>
              <label className="toggle-switch" title="Include recent saves in digest">
                <input
                  type="checkbox"
                  checked={preferences.includeRecentSaves}
                  onChange={(e) => savePreferences({ ...preferences, includeRecentSaves: e.target.checked })}
                  disabled={saving}
                  aria-label="Include recent saves"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Trending Links</div>
                <div className="setting-description">Popular content from your collection</div>
              </div>
              <label className="toggle-switch" title="Include trending links in digest">
                <input
                  type="checkbox"
                  checked={preferences.includePopularLinks}
                  onChange={(e) => savePreferences({ ...preferences, includePopularLinks: e.target.checked })}
                  disabled={saving}
                  aria-label="Include trending links"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Smart Collections</div>
                <div className="setting-description">AI-curated content collections</div>
              </div>
              <label className="toggle-switch" title="Include smart collections in digest">
                <input
                  type="checkbox"
                  checked={preferences.includeSmartCollections}
                  onChange={(e) => savePreferences({ ...preferences, includeSmartCollections: e.target.checked })}
                  disabled={saving}
                  aria-label="Include smart collections"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-label">Activity Summary</div>
                <div className="setting-description">Your reading and organizing activity</div>
              </div>
              <label className="toggle-switch" title="Include activity summary in digest">
                <input
                  type="checkbox"
                  checked={preferences.includeActivitySummary}
                  onChange={(e) => savePreferences({ ...preferences, includeActivitySummary: e.target.checked })}
                  disabled={saving}
                  aria-label="Include activity summary"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div>
                  <div className="setting-label">Links per Section</div>
                  <div className="setting-description">Maximum number of links to include in each section</div>
                </div>
              </div>
              <input
                type="number"
                min="1"
                max="10"
                value={preferences.maxLinksPerSection}
                onChange={(e) => savePreferences({ ...preferences, maxLinksPerSection: parseInt(e.target.value) || 5 })}
                className="form-control"
                style={{ width: '80px' }}
                disabled={saving}
                title="Maximum links per section"
                aria-label="Links per section"
              />
            </div>
          </div>

          {/* Preview & Test */}
          <div className="setting-group">
            <h4>Preview & Test</h4>
            <div className="digest-actions">
              <button
                onClick={generatePreview}
                disabled={previewLoading}
                className="button secondary"
              >
                <Eye size={16} />
                {previewLoading ? 'Generating...' : 'Preview Digest'}
              </button>
              
              {previewDigest && (
                <button
                  onClick={sendTestDigest}
                  className="button primary"
                >
                  <Send size={16} />
                  Open Test Email
                </button>
              )}
            </div>
          </div>

          {/* Preview Display */}
          {showPreview && previewDigest && (
            <div className="digest-preview">
              <h4>Digest Preview</h4>
              <div className="preview-content">
                <div className="preview-header">
                  <h5>📚 Your Nest Digest</h5>
                  <p>{previewDigest.period.start.toLocaleDateString()} - {previewDigest.period.end.toLocaleDateString()}</p>
                </div>
                
                <div className="preview-stats">
                  <div className="preview-stat">
                    <span className="stat-number">{previewDigest.stats.linksSaved}</span>
                    <span className="stat-label">Links Saved</span>
                  </div>
                  <div className="preview-stat">
                    <span className="stat-number">{previewDigest.stats.linksRead}</span>
                    <span className="stat-label">Links Read</span>
                  </div>
                  <div className="preview-stat">
                    <span className="stat-number">{previewDigest.stats.currentStreak}</span>
                    <span className="stat-label">Day Streak</span>
                  </div>
                </div>

                <div className="preview-sections">
                  {previewDigest.sections.map((section, index) => (
                    <div key={index} className="preview-section">
                      <h6>{section.title}</h6>
                      <p>{section.content.length} items</p>
                      {section.aiSummary && (
                        <div className="preview-ai-summary">
                          <em>{section.aiSummary}</em>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {previewDigest.aiInsights && (
                  <div className="preview-insights">
                    <h6>✨ AI Insights</h6>
                    <p>{previewDigest.aiInsights}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {message && (
        <div className={`digest-message ${message.includes('Failed') ? 'error' : 'success'}`}>
          {message}
        </div>
      )}
    </div>
  );
};

export default DigestSettings; 