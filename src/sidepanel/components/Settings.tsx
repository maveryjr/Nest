import React, { useState, useEffect } from 'react';
import { 
  X, User, Palette, Database, Share2, Cog, Info, 
  Download, Trash2, Eye, EyeOff, Mail, Calendar,
  Tag, FileText, BarChart3, ExternalLink, HelpCircle, Sparkles,
  ChevronLeft, ChevronRight, Zap, Bot, Link, Bell
} from 'lucide-react';
import { storage } from '../../utils/storage';
import { supabase } from '../../utils/supabase';
import DigestSettings from './DigestSettings';

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
    openaiApiKey: '',
    highlightColor: 'yellow',
    highlightStyle: 'gradient',
    enableEmbeddings: false,
    enableCorpusChat: false,
    // Phase 3: Smart Features
    enableSmartSuggestions: true,
    enableBackgroundProcessing: true,
    enableNotifications: true,
    enableLinkMonitoring: true,
    enableDuplicateDetection: true,
    enableDeadLinkRecovery: true,
    linkCheckFrequency: 'daily',
    suggestionFrequency: 'every4hours',
    duplicateCheckFrequency: 'weekly'
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
      const settingsResult = await chrome.storage.local.get('nest_settings');
      
      const savedSettings = settingsResult.nest_settings || {};
      
      const loadedSettings = {
        autoSummarize: savedSettings.autoSummarize ?? data.settings?.autoSummarize ?? true,
        defaultCategory: data.settings?.defaultCategory || 'general',
        defaultPrivacy: false,
        showTooltips: true,
        compactView: false,
        darkMode: savedSettings.darkMode ?? false,
        autoTagging: savedSettings.autoTagging ?? data.settings?.autoTagging ?? false,
        autoCategorization: savedSettings.autoCategorization ?? data.settings?.autoCategorization ?? false,
        openaiApiKey: savedSettings.openaiApiKey ?? data.settings?.openaiApiKey ?? '',
        highlightColor: savedSettings.highlightColor ?? data.settings?.highlightColor ?? 'yellow',
        highlightStyle: savedSettings.highlightStyle ?? data.settings?.highlightStyle ?? 'gradient',
        enableEmbeddings: savedSettings.enableEmbeddings ?? data.settings?.enableEmbeddings ?? false,
        enableCorpusChat: savedSettings.enableCorpusChat ?? data.settings?.enableCorpusChat ?? false,
        // Phase 3: Smart Features
        enableSmartSuggestions: savedSettings.enableSmartSuggestions ?? true,
        enableBackgroundProcessing: savedSettings.enableBackgroundProcessing ?? true,
        enableNotifications: savedSettings.enableNotifications ?? true,
        enableLinkMonitoring: savedSettings.enableLinkMonitoring ?? true,
        enableDuplicateDetection: savedSettings.enableDuplicateDetection ?? true,
        enableDeadLinkRecovery: savedSettings.enableDeadLinkRecovery ?? true,
        linkCheckFrequency: savedSettings.linkCheckFrequency ?? 'daily',
        suggestionFrequency: savedSettings.suggestionFrequency ?? 'every4hours',
        duplicateCheckFrequency: savedSettings.duplicateCheckFrequency ?? 'weekly'
      };
      
      setSettings(loadedSettings);
      
      // Apply dark mode if it's enabled
      if (loadedSettings.darkMode) {
        document.body.classList.add('dark-mode');
      }
      
      console.log('Settings loaded:', loadedSettings);
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
      // Apply dark mode immediately
      if (newSettings.darkMode !== settings.darkMode) {
        if (newSettings.darkMode) {
          document.body.classList.add('dark-mode');
        } else {
          document.body.classList.remove('dark-mode');
        }
      }
      
      // Save other settings to the main storage system
      const currentData = await storage.getData();
      const updatedData = {
        ...currentData,
        settings: {
          ...currentData.settings,
          autoSummarize: newSettings.autoSummarize,
          autoTagging: newSettings.autoTagging,
          autoCategorization: newSettings.autoCategorization,
          openaiApiKey: newSettings.openaiApiKey,
          highlightColor: newSettings.highlightColor,
          highlightStyle: newSettings.highlightStyle
        }
      };
      
      // Save updated data back to storage (the storage system will handle persistence)
      // We don't need to explicitly call saveData as the storage is managed internally
      
      // Save to Chrome storage for persistence with all settings
      await chrome.storage.local.set({
        'nest_settings': {
          autoSummarize: newSettings.autoSummarize,
          autoTagging: newSettings.autoTagging,
          autoCategorization: newSettings.autoCategorization,
          openaiApiKey: newSettings.openaiApiKey,
          highlightColor: newSettings.highlightColor,
          highlightStyle: newSettings.highlightStyle,
          darkMode: newSettings.darkMode,
          enableEmbeddings: newSettings.enableEmbeddings,
          enableCorpusChat: newSettings.enableCorpusChat,
          // Phase 3: Smart Features
          enableSmartSuggestions: newSettings.enableSmartSuggestions,
          enableBackgroundProcessing: newSettings.enableBackgroundProcessing,
          enableNotifications: newSettings.enableNotifications,
          enableLinkMonitoring: newSettings.enableLinkMonitoring,
          enableDuplicateDetection: newSettings.enableDuplicateDetection,
          enableDeadLinkRecovery: newSettings.enableDeadLinkRecovery,
          linkCheckFrequency: newSettings.linkCheckFrequency,
          suggestionFrequency: newSettings.suggestionFrequency,
          duplicateCheckFrequency: newSettings.duplicateCheckFrequency
        }
      });
      
      // Update local state to prevent re-selection
      setSettings(newSettings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
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

  const updateSetting = (key: string, value: any) => {
    setSettings((prev: typeof settings) => ({ ...prev, [key]: value }));
  };

  const handleOpenFloatingWindow = async () => {
    try {
      await chrome.runtime.sendMessage({ action: 'openFloatingWindow' });
    } catch (error) {
      console.error('Failed to open floating window:', error);
      setMessage('Failed to open floating window');
    }
  };

  const tabs = [
    { id: 'account', label: 'Account', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Palette },
    { id: 'smart', label: 'Smart Features', icon: Zap },
    { id: 'digest', label: 'Daily Digest', icon: Mail },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'sharing', label: 'Sharing', icon: Share2 },
    { id: 'about', label: 'About', icon: Info }
  ];

  if (loading) {
    return (
      <div className="settings-sidebar">
        <div className="settings-header">
          <button onClick={onClose} className="settings-back-button">
            <ChevronLeft size={20} />
          </button>
          <h2>Settings</h2>
        </div>
        <div className="settings-loading">
          <div className="loading-spinner">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-sidebar">
      <div className="settings-header">
        <button onClick={onClose} className="settings-back-button">
          <ChevronLeft size={20} />
        </button>
        <h2>Settings</h2>
      </div>

      <div className="settings-tabs-horizontal">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`settings-tab-horizontal ${activeTab === tab.id ? 'active' : ''}`}
              title={tab.label}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>

      <div className="settings-content-sidebar">
        {activeTab === 'account' && (
          <div className="settings-section">
            <h3>Account</h3>
            <div className="account-info">
              <div className="account-item">
                <Mail size={16} />
                <div>
                  <div className="account-label">Email</div>
                  <div className="account-value">{userEmail}</div>
                </div>
              </div>
            </div>

            <h3>Statistics</h3>
            <div className="stats-grid-sidebar">
              <div className="stat-card-sidebar">
                <div className="stat-number">{userStats.linkCount}</div>
                <div className="stat-label">Links</div>
              </div>
              <div className="stat-card-sidebar">
                <div className="stat-number">{userStats.collectionCount}</div>
                <div className="stat-label">Collections</div>
              </div>
              <div className="stat-card-sidebar">
                <div className="stat-number">{userStats.tagCount}</div>
                <div className="stat-label">Tags</div>
              </div>
              <div className="stat-card-sidebar">
                <div className="stat-number">{userStats.totalViews}</div>
                <div className="stat-label">Views</div>
              </div>
            </div>
            
            <div className="setting-actions">
              <button onClick={handleLogout} className="button danger">
                Logout
              </button>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div className="settings-content">
            <div className="settings-section">
              <h3>General Preferences</h3>
              
              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.autoSummarize}
                    onChange={(e) => setSettings({...settings, autoSummarize: e.target.checked})}
                  />
                  Auto-summarize saved links
                </label>
                <p className="setting-description">
                  Automatically generate AI summaries for saved links
                </p>
              </div>

              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.autoTagging}
                    onChange={(e) => setSettings({...settings, autoTagging: e.target.checked})}
                  />
                  Auto-tag saved links
                </label>
                <p className="setting-description">
                  Automatically suggest tags based on content
                </p>
              </div>

              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.autoCategorization}
                    onChange={(e) => setSettings({...settings, autoCategorization: e.target.checked})}
                  />
                  Auto-categorize saved links
                </label>
                <p className="setting-description">
                  Automatically categorize links based on content and domain
                </p>
              </div>

              <div className="setting-item">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.darkMode}
                    onChange={(e) => setSettings({...settings, darkMode: e.target.checked})}
                  />
                  Dark mode
                </label>
                <p className="setting-description">
                  Use dark theme for the interface
                </p>
              </div>
            </div>

            <div className="settings-section">
              <h3>Interface Options</h3>
              
              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <div>
                    <div className="setting-label">Floating Window</div>
                    <div className="setting-description">Open Nest in a floating window (like Raycast)</div>
                  </div>
                </div>
                <button 
                  onClick={handleOpenFloatingWindow} 
                  className="button-small"
                >
                  Open Floating Window
                </button>
              </div>
            </div>

            <div className="settings-section">
              <h3>Highlight Settings</h3>
              <div className="setting-item">
                <label htmlFor="highlight-color">Highlight Color</label>
                <select
                  id="highlight-color"
                  value={settings.highlightColor || 'yellow'}
                  onChange={(e) => updateSetting('highlightColor', e.target.value)}
                  className="setting-select"
                >
                  <option value="yellow">Yellow</option>
                  <option value="blue">Blue</option>
                  <option value="green">Green</option>
                  <option value="pink">Pink</option>
                  <option value="purple">Purple</option>
                  <option value="orange">Orange</option>
                  <option value="red">Red</option>
                </select>
              </div>
              
              <div className="setting-item">
                <label htmlFor="highlight-style">Highlight Style</label>
                <select
                  id="highlight-style"
                  value={settings.highlightStyle || 'gradient'}
                  onChange={(e) => updateSetting('highlightStyle', e.target.value)}
                  className="setting-select"
                >
                  <option value="gradient">Gradient</option>
                  <option value="solid">Solid</option>
                  <option value="underline">Underline</option>
                  <option value="outline">Outline</option>
                </select>
              </div>
              
              <div className="setting-description">
                Choose your preferred highlight color and style for visual text highlighting on supported websites.
              </div>
            </div>

            <div className="settings-section">
              <h3>Advanced</h3>
              <div className="setting-item">
                <label htmlFor="openai-key">OpenAI API Key</label>
                <input
                  id="openai-key"
                  type="password"
                  value={settings.openaiApiKey || ''}
                  onChange={(e) => updateSetting('openaiApiKey', e.target.value)}
                  placeholder="sk-..."
                  className="setting-input"
                />
                <p className="setting-description">
                  For enhanced AI features like auto-summarization, tagging, and Ask Nest
                </p>
              </div>

              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <div className="setting-label">Enable Embeddings</div>
                  <div className="setting-description">
                    Build a searchable knowledge base using AI embeddings (requires OpenAI API key)
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enableEmbeddings}
                    onChange={(e) => updateSetting('enableEmbeddings', e.target.checked)}
                    disabled={!settings.openaiApiKey || saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <div className="setting-label">Enable Ask Nest Chat</div>
                  <div className="setting-description">
                    Chat with your saved content using AI (requires embeddings)
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enableCorpusChat}
                    onChange={(e) => updateSetting('enableCorpusChat', e.target.checked)}
                    disabled={!settings.enableEmbeddings || saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-actions">
              <button
                onClick={() => saveSettings(settings)}
                disabled={saving}
                className="save-button"
              >
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'smart' && (
          <div className="settings-content">
            <div className="settings-section">
              <h3>
                <Zap size={18} className="inline mr-2" />
                Smart Suggestions & Automation
              </h3>
              
              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <div className="setting-label">Smart Suggestions</div>
                  <div className="setting-description">
                    Get AI-powered suggestions for organizing your library and next-best actions
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enableSmartSuggestions}
                    onChange={(e) => updateSetting('enableSmartSuggestions', e.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <div className="setting-label">Background Processing</div>
                  <div className="setting-description">
                    Allow Nest to perform automated tasks in the background (link checks, suggestions, etc.)
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enableBackgroundProcessing}
                    onChange={(e) => updateSetting('enableBackgroundProcessing', e.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <label htmlFor="suggestion-frequency">Suggestion Generation Frequency</label>
                <select
                  id="suggestion-frequency"
                  value={settings.suggestionFrequency || 'every4hours'}
                  onChange={(e) => updateSetting('suggestionFrequency', e.target.value)}
                  className="setting-select"
                  disabled={!settings.enableSmartSuggestions || saving}
                >
                  <option value="hourly">Every Hour</option>
                  <option value="every4hours">Every 4 Hours</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
                <p className="setting-description">
                  How often to generate new smart suggestions
                </p>
              </div>
            </div>

            <div className="settings-section">
              <h3>
                <Link size={18} className="inline mr-2" />
                Link Health Monitoring
              </h3>
              
              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <div className="setting-label">Link Monitoring</div>
                  <div className="setting-description">
                    Automatically check saved links for dead/broken URLs
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enableLinkMonitoring}
                    onChange={(e) => updateSetting('enableLinkMonitoring', e.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <div className="setting-label">Dead Link Recovery</div>
                  <div className="setting-description">
                    Automatically find archived versions of dead links using Wayback Machine
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enableDeadLinkRecovery}
                    onChange={(e) => updateSetting('enableDeadLinkRecovery', e.target.checked)}
                    disabled={!settings.enableLinkMonitoring || saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <label htmlFor="link-check-frequency">Link Check Frequency</label>
                <select
                  id="link-check-frequency"
                  value={settings.linkCheckFrequency || 'daily'}
                  onChange={(e) => updateSetting('linkCheckFrequency', e.target.value)}
                  className="setting-select"
                  disabled={!settings.enableLinkMonitoring || saving}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p className="setting-description">
                  How often to check link health (only recent links are checked)
                </p>
              </div>
            </div>

            <div className="settings-section">
              <h3>
                <Bot size={18} className="inline mr-2" />
                Duplicate Detection & Management
              </h3>
              
              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <div className="setting-label">Duplicate Detection</div>
                  <div className="setting-description">
                    Automatically detect and suggest merging of duplicate links
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enableDuplicateDetection}
                    onChange={(e) => updateSetting('enableDuplicateDetection', e.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>

              <div className="setting-item">
                <label htmlFor="duplicate-check-frequency">Duplicate Check Frequency</label>
                <select
                  id="duplicate-check-frequency"
                  value={settings.duplicateCheckFrequency || 'weekly'}
                  onChange={(e) => updateSetting('duplicateCheckFrequency', e.target.value)}
                  className="setting-select"
                  disabled={!settings.enableDuplicateDetection || saving}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
                <p className="setting-description">
                  How often to scan for duplicate content
                </p>
              </div>
            </div>

            <div className="settings-section">
              <h3>
                <Bell size={18} className="inline mr-2" />
                Notifications
              </h3>
              
              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <div className="setting-label">Enable Notifications</div>
                  <div className="setting-description">
                    Get notified about dead links, suggestions, and other important updates
                  </div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.enableNotifications}
                    onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>

            <div className="settings-actions">
              <button
                onClick={() => saveSettings(settings)}
                disabled={saving}
                className="save-button"
              >
                {saving ? 'Saving...' : 'Save Smart Features'}
              </button>
            </div>

            <div className="settings-section">
              <h3>Manual Actions</h3>
              <p className="setting-description mb-4">
                Run these smart features manually to test them or get immediate results.
              </p>
              
              <div className="setting-list">
                <div className="setting-item-sidebar">
                  <div className="setting-info">
                    <Link size={16} />
                    <div>
                      <div className="setting-label">Check Link Health</div>
                      <div className="setting-description">Manually check recent links for dead URLs</div>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        setMessage('Checking link health...');
                        await chrome.runtime.sendMessage({ action: 'triggerHealthCheck' });
                        setMessage('Link health check completed!');
                        setTimeout(() => setMessage(''), 3000);
                      } catch (error) {
                        setMessage('Failed to check link health');
                      }
                    }}
                    className="button-small"
                    disabled={saving}
                  >
                    Check Now
                  </button>
                </div>
                
                <div className="setting-item-sidebar">
                  <div className="setting-info">
                    <Bot size={16} />
                    <div>
                      <div className="setting-label">Detect Duplicates</div>
                      <div className="setting-description">Scan your library for potential duplicates</div>
                    </div>
                  </div>
                  <button 
                    onClick={async () => {
                      try {
                        setMessage('Detecting duplicates...');
                        await chrome.runtime.sendMessage({ action: 'triggerDuplicateDetection' });
                        setMessage('Duplicate detection completed!');
                        setTimeout(() => setMessage(''), 3000);
                      } catch (error) {
                        setMessage('Failed to detect duplicates');
                      }
                    }}
                    className="button-small"
                    disabled={saving}
                  >
                    Scan Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'digest' && (
          <div className="settings-section">
            <DigestSettings />
          </div>
        )}

        {activeTab === 'data' && (
          <div className="settings-section">
            <h3>Data Management</h3>
            <div className="setting-list">
              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <Download size={16} />
                  <div>
                    <div className="setting-label">Export Data</div>
                    <div className="setting-description">Download all your data</div>
                  </div>
                </div>
                <button onClick={handleExportData} className="button-small">Export</button>
              </div>
              
              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <Trash2 size={16} />
                  <div>
                    <div className="setting-label">Cleanup Tags</div>
                    <div className="setting-description">Remove unused tags</div>
                  </div>
                </div>
                <button onClick={handleCleanupTags} className="button-small danger">Cleanup</button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sharing' && (
          <div className="settings-section">
            <h3>Sharing & Privacy</h3>
            <div className="setting-list">
              <div className="setting-item-sidebar">
                <div className="setting-info">
                  <div className="setting-label">Default Privacy</div>
                  <div className="setting-description">Make collections public by default</div>
                </div>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={settings.defaultPrivacy}
                    onChange={(e) => saveSettings({ ...settings, defaultPrivacy: e.target.checked })}
                    disabled={saving}
                  />
                  <span className="toggle-slider"></span>
                </label>
              </div>
            </div>
            
            <h3>Analytics</h3>
            <div className="stats-grid-sidebar">
              <div className="stat-card-sidebar">
                <div className="stat-number">{userStats.publicCollections}</div>
                <div className="stat-label">Public collections</div>
              </div>
              <div className="stat-card-sidebar">
                <div className="stat-number">{userStats.totalViews}</div>
                <div className="stat-label">Total views</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'about' && (
          <div className="settings-section">
            <h3>About Nest</h3>
            <div className="about-info-sidebar">
              <div className="app-info-sidebar">
                <div className="app-logo-sidebar">N</div>
                <div>
                  <div className="app-name">Nest</div>
                  <div className="app-version">Version 1.0.0</div>
                </div>
              </div>
              <p className="app-description">
                Smart bookmarks & notes with AI-powered summaries and flexible organization.
              </p>
            </div>
            
            <div className="support-links-sidebar">
              <h4>Support</h4>
              <div className="support-link-list">
                <a href="https://github.com" target="_blank" rel="noopener" className="support-link-sidebar">
                  <ExternalLink size={14} />
                  <span>Documentation</span>
                </a>
                <a href="https://github.com/issues" target="_blank" rel="noopener" className="support-link-sidebar">
                  <HelpCircle size={14} />
                  <span>Report Issues</span>
                </a>
                <a href="mailto:support@nest.dev" className="support-link-sidebar">
                  <Mail size={14} />
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
  );
};

export default Settings; 