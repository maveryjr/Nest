import React, { useState, useEffect } from 'react';
import { Bookmark, Plus, Sidebar, Settings, ExternalLink } from 'lucide-react';
import './popup.css';

const Popup: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<chrome.tabs.Tab | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getCurrentTab();
    // Automatically open sidebar when popup loads
    openSidepanel();
  }, []);

  const getCurrentTab = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0]) {
      setCurrentTab(tabs[0]);
    }
  };

  const saveCurrentPage = async () => {
    if (!currentTab) return;
    
    console.log('Popup: Sending saveCurrentPage message...');
    setIsLoading(true);
    setError(null);
    try {
      const response = await chrome.runtime.sendMessage({ action: 'saveCurrentPage' });
      if (!response.success) {
        throw new Error(response.error || 'An unknown error occurred.');
      }
      // Show success feedback
      setTimeout(() => {
        window.close();
      }, 1000);
    } catch (error) {
      console.error('Failed to save page:', error);
      setError((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const openSidepanel = async () => {
    // Try to open the side panel directly (must be in response to user gesture)
    try {
      if (chrome.sidePanel && chrome.sidePanel.open) {
        const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tabs[0] && tabs[0].windowId) {
          await chrome.sidePanel.open({ windowId: tabs[0].windowId });
          window.close();
          return;
        }
      }
    } catch (err) {
      // Fallback to message if direct call fails
      try {
        const response = await chrome.runtime.sendMessage({ action: 'openSidePanel' });
        if (response?.success) {
          window.close();
        } else {
          console.error('Failed to open side panel:', response?.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Failed to open sidepanel:', error);
      }
    }
  };

  const canSavePage = currentTab && 
    currentTab.url && 
    !currentTab.url.startsWith('chrome://') && 
    !currentTab.url.startsWith('chrome-extension://');

  return (
    <div className="popup">
      <div className="popup-header">
        <div className="popup-title">
          <Bookmark className="popup-icon" />
          <h1>Nest</h1>
        </div>
      </div>

      <div className="popup-content">
        {currentTab && (
          <div className="current-tab">
            <div className="tab-info">
              <div className="tab-favicon">
                {currentTab.favIconUrl ? (
                  <img src={currentTab.favIconUrl} alt="" width="16" height="16" />
                ) : (
                  <div className="favicon-placeholder">
                    {currentTab.url ? new URL(currentTab.url).hostname.charAt(0).toUpperCase() : '?'}
                  </div>
                )}
              </div>
              <div className="tab-details">
                <div className="tab-title">{currentTab.title || 'Untitled'}</div>
                <div className="tab-url">
                  {currentTab.url ? new URL(currentTab.url).hostname : ''}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="popup-actions">
          <button
            onClick={saveCurrentPage}
            disabled={!canSavePage || isLoading}
            className="action-button primary"
          >
            <Plus size={16} />
            {isLoading ? 'Saving...' : 'Save to Nest'}
          </button>

          <button
            onClick={openSidepanel}
            className="action-button secondary"
          >
            <Sidebar size={16} />
            Open Sidebar
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}
        
        {!canSavePage && currentTab && (
          <div className="warning">
            <p>Cannot save this type of page</p>
          </div>
        )}
      </div>

      <div className="popup-footer">
        <button className="footer-link" onClick={openSidepanel}>
          <ExternalLink size={12} />
          View all saved links
        </button>
      </div>
    </div>
  );
};

export default Popup; 