import React, { useState, useEffect } from 'react';
import { 
  X, User, Palette, Database, Share2, Cog, Info, 
  Download, Trash2, Eye, EyeOff, Mail, Calendar,
  Tag, FileText, BarChart3, ExternalLink, HelpCircle, Sparkles
} from 'lucide-react';
import { storage } from '../../utils/storage';
import { supabase } from '../../utils/supabase';

interface SettingsProps {
  onClose: () => void;
}

interface UserStats {
  linkCount: number;
  collectionCount: number;
  tagCount: number;
  publicCollections: number;
  totalViews: number;
}

const Settings: React.FC<SettingsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState('account');
  const [userEmail, setUserEmail] = useState('');
  const [userStats, setUserStats] = useState<UserStats>({
    linkCount: 0,
    collectionCount: 0,
    tagCount: 0,
    publicCollections: 0,
    totalViews: 0
  });
  const [settings, setSettings] = useState({
    autoSummarize: true,
    defaultCategory: 'general',
    defaultPrivacy: false,
    showTooltips: true,
    compactView: false,
    darkMode: false,
    autoTagging: false,
    autoCategorization: false,
    openaiApiKey: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadUserData();
    loadSettings();
    loadUserStats();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || 'Unknown');
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const data = await storage.getData();
      setSettings({
        autoSummarize: data.settings.autoSummarize,
        defaultCategory: data.settings.defaultCategory,
        defaultPrivacy: false,
        showTooltips: true,
        compactView: false,
        darkMode: false,
        autoTagging: data.settings.autoTagging,
        autoCategorization: data.settings.autoCategorization,
        openaiApiKey: data.settings.openaiApiKey
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUserStats = async () => {
    try {
      const data = await storage.getData();
      const tags = await storage.getUserTags();
      
      // Get public collection stats
      const { data: publicStats } = await supabase
        .from('collections')
        .select('view_count')
        .eq('is_public', true);

      const publicCollections = publicStats?.length || 0;
      const totalViews = publicStats?.reduce((sum, col) => sum + (col.view_count || 0), 0) || 0;

      setUserStats({
        linkCount: data.links.length,
        collectionCount: data.collections.length,
        tagCount: tags.length,
        publicCollections,
        totalViews
      });
    } catch (error) {
      console.error('Failed to load user stats:', error);
    }
  };

  const saveSettings = async (newSettings: typeof settings) => {
    setSaving(true);
    setMessage('');

    try {
      // Here you would save settings to your backend/storage
      // For now, we'll just update local state
      setSettings(newSettings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await storage.getData();
      const tags = await storage.getUserTags();
      
      const exportData = {
        exported_at: new Date().toISOString(),
        user_email: userEmail,
        links: data.links,
        collections: data.collections,
        tags: tags,
        stats: userStats
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nest-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setMessage('Data exported successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to export data');
    }
  };

  const handleCleanupTags = async () => {
    try {
      const count = await storage.cleanupUnusedTags();
      setMessage(`Cleaned up ${count} unused tags`);
      loadUserStats(); // Refresh stats
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Failed to cleanup tags');
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      onClose();
    } catch (error) {
      setMessage('Failed to logout');
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'sharing', label: 'Sharing', icon: Share2 },
    { id: 'about', label: 'About', icon: Info }
  ];

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content settings-modal">
          <div className="modal-header">
            <h2 className="modal-title">Settings</h2>
            <button onClick={onClose} className="modal-close-button" title="Close">
              <X size={20} />
            </button>
          </div>
          <div className="settings-content">
            <div className="loading-spinner" style={{margin: 'auto'}}>Loading settings...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content settings-modal">
        <div className="settings-content">
          <div className="settings-tabs">
            <div style={{ padding: 'var(--space-1)', marginBottom: 'var(--space-4)' }}>
              <h2 className="modal-title">Settings</h2>
            </div>
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
            <div style={{ marginTop: 'auto', paddingTop: 'var(--space-4)'}}>
                <button onClick={onClose} className="button" style={{width: '100%'}}>
                    Close
                </button>
            </div>
          </div>

          <div className="settings-panel">
            {activeTab === 'account' && (
              <div className="settings-section">
                <h3>Account Information</h3>
                <div className="setting-group">
                  <div className="setting-item">
                    <div className="setting-info">
                      <Mail size={16} />
                      <div>
                        <div className="setting-label">Email Address</div>
                        <div className="setting-description">{userEmail}</div>
                      </div>
                    </div>
                  </div>
                  <div className="setting-item">
                    <div className="setting-info">
                      <Calendar size={16} />
                      <div>
                        <div className="setting-label">Account Created</div>
                        <div className="setting-description">Connected via Supabase</div>
                      </div>
                    </div>
                  </div>
                </div>

                <h3>Statistics</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-number">{userStats.linkCount}</div>
                    <div className="stat-label">Links Saved</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{userStats.collectionCount}</div>
                    <div className="stat-label">Collections</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-number">{userStats.tagCount}</div>
                    <div className="stat-label">Tags Used</div>
                  </div>
                   <div className="stat-card">
                    <div className="stat-number">{userStats.totalViews}</div>
                    <div className="stat-label">Total Views</div>
                  </div>
                </div>
                 <div className="setting-actions" style={{marginTop: 'var(--space-5)'}}>
                  <button onClick={handleLogout} className="button danger">
                    Logout
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="settings-section">
                <h3>Preferences</h3>
                <div className="setting-group">
                    <div className="setting-item">
                        <div className="setting-info">
                            <div className="setting-label">Auto-summarize Links</div>
                        </div>
                        <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={settings.autoSummarize}
                            onChange={(e) => saveSettings({ ...settings, autoSummarize: e.target.checked })}
                            disabled={saving}
                            aria-label="Auto-summarize Links"
                        />
                        <span className="toggle-slider"></span>
                        </label>
                    </div>
                    <div className="setting-item">
                        <div className="setting-info">
                            <div className="setting-label">Auto-tagging</div>
                        </div>
                        <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={settings.autoTagging || false}
                            onChange={(e) => saveSettings({ ...settings, autoTagging: e.target.checked })}
                            disabled={saving}
                            aria-label="Auto-tagging"
                        />
                        <span className="toggle-slider"></span>
                        </label>
                    </div>
                    <div className="setting-item">
                        <div className="setting-info">
                            <div className="setting-label">Auto-categorization</div>
                        </div>
                        <label className="toggle-switch">
                        <input
                            type="checkbox"
                            checked={settings.autoCategorization || false}
                            onChange={(e) => saveSettings({ ...settings, autoCategorization: e.target.checked })}
                            disabled={saving}
                            aria-label="Auto-categorization"
                        />
                        <span className="toggle-slider"></span>
                        </label>
                    </div>
                </div>
                <h3 style={{marginTop: 'var(--space-5)'}}>Advanced</h3>
                <div className="setting-group">
                    <div className="setting-item">
                        <div className="setting-info">
                            <div>
                                <div className="setting-label">OpenAI API Key</div>
                                <div className="setting-description">Used for enhanced AI features.</div>
                            </div>
                        </div>
                        <input
                            type="password"
                            value={settings.openaiApiKey || ''}
                            onChange={(e) => saveSettings({ ...settings, openaiApiKey: e.target.value })}
                            placeholder="sk-..."
                            className="form-control"
                            style={{width: '200px'}}
                            disabled={saving}
                        />
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'data' && (
                <div className="settings-section">
                    <h3>Data Management</h3>
                    <div className="setting-group">
                        <div className="setting-item">
                            <div className="setting-info">
                                <Download size={16} />
                                <div>
                                    <div className="setting-label">Export Data</div>
                                    <div className="setting-description">Download all your data as a JSON file.</div>
                                </div>
                            </div>
                            <button onClick={handleExportData} className="button">Export</button>
                        </div>
                        <div className="setting-item">
                            <div className="setting-info">
                                <Trash2 size={16} />
                                <div>
                                    <div className="setting-label">Cleanup Unused Tags</div>
                                    <div className="setting-description">Remove any tags that are not associated with any links.</div>
                                </div>
                            </div>
                            <button onClick={handleCleanupTags} className="button danger">Cleanup</button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'sharing' && (
              <div className="settings-section">
                <h3>Sharing & Privacy</h3>
                <div className="setting-group">
                  <div className="setting-item">
                    <div className="setting-info">
                        <div>
                            <div className="setting-label">Default Collection Privacy</div>
                            <div className="setting-description">Make new collections public by default</div>
                        </div>
                    </div>
                    <label className="toggle-switch" title="Toggle default privacy">
                      <input
                        type="checkbox"
                        checked={settings.defaultPrivacy}
                        onChange={(e) => saveSettings({ ...settings, defaultPrivacy: e.target.checked })}
                        disabled={saving}
                        aria-label="Default collection privacy"
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
                 <div className="sharing-stats" style={{marginTop: 'var(--space-5)'}}>
                  <h4>Sharing Analytics</h4>
                   <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-number">{userStats.publicCollections}</div>
                            <div className="stat-label">Public collections</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">{userStats.totalViews}</div>
                            <div className="stat-label">Total views</div>
                        </div>
                    </div>
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="settings-section">
                <h3>About Nest</h3>
                <div className="about-info">
                  <div className="app-info">
                    <div className="app-logo">N</div>
                    <div>
                      <div className="app-name">Nest - Smart Bookmarks & Notes</div>
                      <div className="app-version">Version 1.0.0</div>
                    </div>
                  </div>
                  <p className="app-description">
                    Nest is a powerful browser extension that helps you save, organize, and share your bookmarks 
                    with AI-powered summaries, flexible tagging, and beautiful collections.
                  </p>
                </div>
                <div className="support-links">
                  <h4>Support & Resources</h4>
                  <div className="link-grid">
                    <a href="https://github.com" target="_blank" rel="noopener" className="support-link">
                      <ExternalLink size={16} />
                      <span>Documentation</span>
                    </a>
                    <a href="https://github.com/issues" target="_blank" rel="noopener" className="support-link">
                      <HelpCircle size={16} />
                      <span>Report Issues</span>
                    </a>
                    <a href="mailto:support@nest.dev" className="support-link">
                      <Mail size={16} />
                      <span>Contact Support</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {message && (
                <div className={`settings-message ${message.includes('Failed') ? 'error' : 'success'}`}>
                    {message}
                </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings; 