import React, { useState, useEffect } from 'react';
import { 
  X, 
  TabletSmartphone, 
  Plus, 
  CheckSquare, 
  Square,
  ExternalLink,
  Bookmark,
  FolderPlus,
  Archive,
  RefreshCw,
  Monitor
} from 'lucide-react';
import { Collection } from '../../types';

interface TabInfo {
  id: number;
  title: string;
  url: string;
  favicon?: string;
  windowId: number;
  index: number;
  active: boolean;
  domain: string;
  pinned: boolean;
}

interface TabSyncProps {
  isOpen: boolean;
  onClose: () => void;
  collections: Collection[];
  onSaveTabs: (tabs: TabInfo[], collectionId?: string, toInbox?: boolean) => Promise<void>;
}

const TabSync: React.FC<TabSyncProps> = ({
  isOpen,
  onClose,
  collections,
  onSaveTabs
}) => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<Set<number>>(new Set());
  const [groupedTabs, setGroupedTabs] = useState<Record<number, TabInfo[]>>({});
  const [saving, setSaving] = useState(false);
  const [filterPinned, setFilterPinned] = useState(false);
  const [filterDomain, setFilterDomain] = useState<string>('');

  // Load all tabs when component opens
  useEffect(() => {
    if (isOpen) {
      loadTabs();
    }
  }, [isOpen]);

  // Group tabs by window
  useEffect(() => {
    const grouped = tabs.reduce((acc, tab) => {
      if (!acc[tab.windowId]) {
        acc[tab.windowId] = [];
      }
      acc[tab.windowId].push(tab);
      return acc;
    }, {} as Record<number, TabInfo[]>);
    
    setGroupedTabs(grouped);
  }, [tabs]);

  const loadTabs = async () => {
    setLoading(true);
    try {
      const allTabs = await chrome.tabs.query({});
      const tabsInfo: TabInfo[] = allTabs
        .filter(tab => tab.url && !tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://'))
        .map(tab => ({
          id: tab.id!,
          title: tab.title || 'Untitled',
          url: tab.url!,
          favicon: tab.favIconUrl,
          windowId: tab.windowId,
          index: tab.index,
          active: tab.active,
          domain: new URL(tab.url!).hostname,
          pinned: tab.pinned
        }));
      
      setTabs(tabsInfo);
      setSelectedTabs(new Set());
    } catch (error) {
      console.error('Failed to load tabs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleTabSelection = (tabId: number) => {
    const newSelected = new Set(selectedTabs);
    if (newSelected.has(tabId)) {
      newSelected.delete(tabId);
    } else {
      newSelected.add(tabId);
    }
    setSelectedTabs(newSelected);
  };

  const selectAllTabs = () => {
    const filteredTabs = getFilteredTabs();
    if (selectedTabs.size === filteredTabs.length) {
      setSelectedTabs(new Set());
    } else {
      setSelectedTabs(new Set(filteredTabs.map(tab => tab.id)));
    }
  };

  const selectWindowTabs = (windowId: number) => {
    const windowTabs = groupedTabs[windowId] || [];
    const windowTabIds = windowTabs.map(tab => tab.id);
    const newSelected = new Set(selectedTabs);
    
    const allWindowTabsSelected = windowTabIds.every(id => newSelected.has(id));
    
    if (allWindowTabsSelected) {
      // Deselect all tabs in this window
      windowTabIds.forEach(id => newSelected.delete(id));
    } else {
      // Select all tabs in this window
      windowTabIds.forEach(id => newSelected.add(id));
    }
    
    setSelectedTabs(newSelected);
  };

  const getFilteredTabs = () => {
    return tabs.filter(tab => {
      if (filterPinned && !tab.pinned) return false;
      if (filterDomain && !tab.domain.toLowerCase().includes(filterDomain.toLowerCase())) return false;
      return true;
    });
  };

  const handleSaveSelected = async (collectionId?: string, toInbox?: boolean) => {
    if (selectedTabs.size === 0) return;
    
    setSaving(true);
    try {
      const selectedTabsInfo = tabs.filter(tab => selectedTabs.has(tab.id));
      await onSaveTabs(selectedTabsInfo, collectionId, toInbox);
      setSelectedTabs(new Set());
    } catch (error) {
      console.error('Failed to save tabs:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTab = async (tab: TabInfo, collectionId?: string, toInbox?: boolean) => {
    setSaving(true);
    try {
      await onSaveTabs([tab], collectionId, toInbox);
    } catch (error) {
      console.error('Failed to save tab:', error);
    } finally {
      setSaving(false);
    }
  };

  const getDomainCounts = () => {
    const counts: Record<string, number> = {};
    tabs.forEach(tab => {
      counts[tab.domain] = (counts[tab.domain] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5);
  };

  const filteredTabs = getFilteredTabs();
  const domainCounts = getDomainCounts();

  if (!isOpen) return null;

  return (
    <div className="tab-sync-overlay" onClick={onClose}>
      <div className="tab-sync-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tab-sync-header">
          <div className="tab-sync-title">
            <TabletSmartphone size={20} />
            <h2>Tab Sync Mode</h2>
            <span className="tab-count">{tabs.length} open tabs</span>
          </div>
          <div className="tab-sync-actions">
            <button 
              onClick={loadTabs} 
              className="tab-sync-refresh"
              disabled={loading}
              title="Refresh tabs"
            >
              <RefreshCw size={16} className={loading ? 'spinning' : ''} />
            </button>
            <button onClick={onClose} className="tab-sync-close" title="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="tab-sync-filters">
          <div className="tab-sync-filter-row">
            <label className="tab-sync-filter-checkbox">
              <input
                type="checkbox"
                checked={filterPinned}
                onChange={(e) => setFilterPinned(e.target.checked)}
              />
              Show only pinned tabs
            </label>
            <input
              type="text"
              placeholder="Filter by domain..."
              value={filterDomain}
              onChange={(e) => setFilterDomain(e.target.value)}
              className="tab-sync-domain-filter"
            />
          </div>
          
          {domainCounts.length > 0 && (
            <div className="tab-sync-domain-pills">
              <span className="domain-pills-label">Quick filters:</span>
              {domainCounts.map(([domain, count]) => (
                <button
                  key={domain}
                  onClick={() => setFilterDomain(filterDomain === domain ? '' : domain)}
                  className={`domain-pill ${filterDomain === domain ? 'active' : ''}`}
                >
                  {domain} ({count})
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="tab-sync-bulk-actions">
          <button
            onClick={selectAllTabs}
            className="bulk-action-btn"
            title={selectedTabs.size === filteredTabs.length ? 'Deselect all' : 'Select all'}
          >
            {selectedTabs.size === filteredTabs.length ? <Square size={16} /> : <CheckSquare size={16} />}
            {selectedTabs.size === filteredTabs.length ? 'Deselect All' : 'Select All'}
          </button>
          
          {selectedTabs.size > 0 && (
            <>
              <button
                onClick={() => handleSaveSelected(undefined, true)}
                className="bulk-action-btn primary"
                disabled={saving}
              >
                <Archive size={16} />
                Save to Inbox ({selectedTabs.size})
              </button>
              
                             <select
                 onChange={(e) => {
                   if (e.target.value) {
                     handleSaveSelected(e.target.value);
                     e.target.value = '';
                   }
                 }}
                 className="bulk-collection-select"
                 disabled={saving}
                 title="Save selected tabs to collection"
                 aria-label="Save selected tabs to collection"
               >
                <option value="">Save to Collection...</option>
                {collections.map(collection => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </select>
            </>
          )}
        </div>

        <div className="tab-sync-content">
          {loading ? (
            <div className="tab-sync-loading">
              <RefreshCw size={24} className="spinning" />
              <p>Loading tabs...</p>
            </div>
          ) : Object.keys(groupedTabs).length === 0 ? (
            <div className="tab-sync-empty">
              <Monitor size={48} />
              <h3>No tabs found</h3>
              <p>Open some tabs and refresh to see them here</p>
            </div>
          ) : (
            Object.entries(groupedTabs).map(([windowId, windowTabs]) => (
              <div key={windowId} className="tab-window-group">
                <div className="tab-window-header">
                  <button
                    onClick={() => selectWindowTabs(parseInt(windowId))}
                    className="window-select-btn"
                  >
                    <Monitor size={16} />
                    Window {windowId} ({windowTabs.length} tabs)
                  </button>
                </div>
                
                <div className="tab-list">
                  {windowTabs
                    .filter(tab => {
                      if (filterPinned && !tab.pinned) return false;
                      if (filterDomain && !tab.domain.toLowerCase().includes(filterDomain.toLowerCase())) return false;
                      return true;
                    })
                    .map(tab => (
                    <div
                      key={tab.id}
                      className={`tab-item ${selectedTabs.has(tab.id) ? 'selected' : ''} ${tab.active ? 'active' : ''}`}
                    >
                      <div className="tab-item-content">
                                                 <input
                           type="checkbox"
                           checked={selectedTabs.has(tab.id)}
                           onChange={() => toggleTabSelection(tab.id)}
                           className="tab-checkbox"
                           title={`Select ${tab.title}`}
                           aria-label={`Select ${tab.title}`}
                         />
                        
                        <img
                          src={tab.favicon || `https://www.google.com/s2/favicons?domain=${tab.domain}&sz=16`}
                          alt="favicon"
                          className="tab-favicon"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = `https://www.google.com/s2/favicons?domain=${tab.domain}&sz=16`;
                          }}
                        />
                        
                        <div className="tab-info">
                          <div className="tab-title">
                            {tab.pinned && <span className="tab-pin-indicator">📌</span>}
                            {tab.title}
                            {tab.active && <span className="tab-active-indicator">•</span>}
                          </div>
                          <div className="tab-url">{tab.domain}</div>
                        </div>
                      </div>
                      
                      <div className="tab-actions">
                        <button
                          onClick={() => handleSaveTab(tab, undefined, true)}
                          className="tab-action-btn"
                          title="Save to inbox"
                          disabled={saving}
                        >
                          <Archive size={14} />
                        </button>
                        
                                                 <select
                           onChange={(e) => {
                             if (e.target.value) {
                               handleSaveTab(tab, e.target.value);
                               e.target.value = '';
                             }
                           }}
                           className="tab-collection-select"
                           disabled={saving}
                           title="Save to collection"
                           aria-label="Save to collection"
                         >
                          <option value="">📁</option>
                          {collections.map(collection => (
                            <option key={collection.id} value={collection.id}>
                              {collection.name}
                            </option>
                          ))}
                        </select>
                        
                        <a
                          href={tab.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tab-action-btn"
                          title="Open tab"
                        >
                          <ExternalLink size={14} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="tab-sync-footer">
          <div className="tab-sync-stats">
            <span>{selectedTabs.size} of {filteredTabs.length} tabs selected</span>
            {filterDomain && <span>• Filtered by "{filterDomain}"</span>}
            {filterPinned && <span>• Pinned only</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabSync; 