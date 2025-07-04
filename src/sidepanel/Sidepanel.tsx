import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, ChevronDown, ChevronRight, Bookmark, FolderPlus, Settings, ExternalLink, LogOut, X, Tag } from 'lucide-react';
import { SavedLink, Collection, StorageData } from '../types';
import { storage } from '../utils/storage';
import LinkCard from './components/LinkCard';
import CollectionCard from './components/CollectionCard';
import SearchResultCard from './components/SearchResultCard';
import AddNoteModal from './components/AddNoteModal';
import CreateCollectionModal from './components/CreateCollectionModal';
import TagFilters from './components/TagFilters';
import SettingsComponent from './components/Settings';
import { supabase } from '../utils/supabase';
import { Session } from '@supabase/supabase-js';
import './sidepanel.css';

interface UserTag {
  id: string;
  name: string;
  usageCount: number;
}

const Sidepanel: React.FC = () => {
  const [data, setData] = useState<StorageData>({
    links: [],
    collections: [],
    categories: [],
    settings: { defaultCategory: 'general', autoSummarize: true }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SavedLink[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [taggedLinks, setTaggedLinks] = useState<SavedLink[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    holdingArea: true,
    collections: true
  });
  const [selectedLink, setSelectedLink] = useState<SavedLink | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Check for an initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadData();
        loadUserTags();
      }
    });

    // Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session);
      setSession(session);
      if (session) {
        loadData();
        loadUserTags();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const storageData = await storage.getData();
      setData(storageData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserTags = async () => {
    setLoadingTags(true);
    try {
      const tags = await storage.getUserTags();
      setUserTags(tags);
    } catch (error) {
      console.error('Failed to load user tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const handleTagSelect = async (tagName: string | null) => {
    if (tagName === selectedTag) {
      // Deselect if clicking the same tag
      setSelectedTag(null);
      setTaggedLinks([]);
      return;
    }

    setSelectedTag(tagName);
    
    if (tagName) {
      try {
        const links = await storage.getLinksByTag(tagName);
        setTaggedLinks(links);
      } catch (error) {
        console.error('Failed to load links by tag:', error);
        setTaggedLinks([]);
      }
    } else {
      setTaggedLinks([]);
    }

    // Clear search when selecting a tag
    if (tagName && searchMode) {
      clearSearch();
    }
  };

  const handleTagsUpdated = () => {
    // Reload tags when they are updated
    loadUserTags();
    
    // If we're currently filtering by a tag, refresh those results
    if (selectedTag) {
      handleTagSelect(selectedTag);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const saveCurrentPage = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.runtime.sendMessage({ action: 'saveCurrentPage' });
        await loadData(); // Refresh data
        await loadUserTags(); // Refresh tags
      }
    } catch (error) {
      console.error('Failed to save page:', error);
    }
  };

  const handleUpdateLink = async (linkId: string, updates: Partial<SavedLink>) => {
    try {
      await storage.updateLink(linkId, updates);
      await loadData();
    } catch (error) {
      console.error('Failed to update link:', error);
    }
  };

  const handleDeleteLink = async (linkId: string) => {
    try {
      await storage.deleteLink(linkId);
      await loadData();
      await loadUserTags(); // Refresh tags after deletion
      
      // If we're filtering by tag, refresh those results
      if (selectedTag) {
        handleTagSelect(selectedTag);
      }
    } catch (error) {
      console.error('Failed to delete link:', error);
    }
  };

  const handleMoveToCollection = async (linkId: string, collectionId: string) => {
    try {
      await storage.updateLink(linkId, { collectionId });
      await loadData();
    } catch (error) {
      console.error('Failed to move link:', error);
    }
  };

  const handleAddNote = (link: SavedLink) => {
    setSelectedLink(link);
    setShowAddNoteModal(true);
  };

  const handleSaveNote = async (note: string) => {
    if (selectedLink) {
      await handleUpdateLink(selectedLink.id, { userNote: note });
    }
    setShowAddNoteModal(false);
    setSelectedLink(null);
  };

  const handleCreateCollection = async (name: string, description?: string) => {
    try {
      const newCollection: Collection = {
        id: Date.now().toString(),
        name,
        description,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await storage.addCollection(newCollection);
      await loadData();
    } catch (error) {
      console.error('Failed to create collection:', error);
    }
    setShowCreateCollectionModal(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const redirectTo = chrome.runtime.getURL('auth.html');
    console.log('Redirecting to:', redirectTo);

    const { error } = await supabase.auth.signInWithOtp({ 
      email,
      options: {
        emailRedirectTo: redirectTo,
      }
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage('Check your email for the login link!');
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query.trim()) {
        setSearchResults([]);
        setSearchMode(false);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const results = await storage.searchLinks(query);
        setSearchResults(results);
        setSearchMode(true);
        
        // Clear tag filter when searching
        if (selectedTag) {
          setSelectedTag(null);
          setTaggedLinks([]);
        }
      } catch (error) {
        console.error('Search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300),
    [selectedTag]
  );

  // Handle search input changes
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchMode(false);
    setIsSearching(false);
  };

  // Clear all filters
  const clearAllFilters = () => {
    clearSearch();
    setSelectedTag(null);
    setTaggedLinks([]);
  };

  // Filter function for normal (non-search, non-tag) mode
  const filteredLinks = (searchMode || selectedTag) ? [] : data.links;

  const holdingAreaLinks = filteredLinks.filter(link => !link.collectionId);
  const getCollectionLinks = (collectionId: string) => 
    filteredLinks.filter(link => link.collectionId === collectionId);

  // Determine what links to show based on current mode
  const getCurrentViewLinks = () => {
    if (searchMode) return searchResults;
    if (selectedTag) return taggedLinks;
    return filteredLinks;
  };

  const currentViewLinks = getCurrentViewLinks();
  const showNormalView = !searchMode && !selectedTag;

  if (!session) {
    return (
      <div className="sidepanel auth-container">
        <div className="header">
          <div className="header-title">
            <Bookmark className="header-icon" />
            <h1>Nest</h1>
          </div>
        </div>
        <div className="auth-form">
          <h2>Sign In</h2>
          <p>Enter your email to receive a magic login link.</p>
          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-input"
            />
            <button type="submit" className="auth-button" disabled={loading}>
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
          {message && <p className="auth-message">{message}</p>}
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="sidepanel loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="sidepanel">
      {/* Header with Logout button */}
      <div className="header">
        <div className="header-title">
          <Bookmark className="header-icon" />
          <h1>Nest</h1>
        </div>
        <div className="header-actions">
          <button onClick={saveCurrentPage} className="save-button" title="Save current page">
            <Plus size={18} />
          </button>
          <button onClick={handleLogout} className="logout-button" title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Enhanced Search */}
      <div className="search-container">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          placeholder="Search your links..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
        />
        {searchTerm && (
          <button onClick={clearSearch} className="search-clear" title="Clear search">
            <X size={16} />
          </button>
        )}
        {isSearching && <div className="search-spinner">⟳</div>}
      </div>

      {/* Tag Filters */}
      {userTags.length > 0 && (
        <TagFilters
          tags={userTags}
          selectedTag={selectedTag}
          onTagSelect={handleTagSelect}
          loading={loadingTags}
        />
      )}

      {/* Content */}
      <div className="content">
        {searchMode ? (
          /* Search Results */
          <div className="search-results">
            <div className="search-results-header">
              <h3>Search Results ({searchResults.length})</h3>
              <button onClick={clearAllFilters} className="clear-search-btn">
                Show All Links
              </button>
            </div>
            {searchResults.length === 0 && !isSearching ? (
              <div className="no-results">
                <p>No links found for "{searchTerm}"</p>
              </div>
            ) : (
              searchResults.map(link => (
                <SearchResultCard
                  key={link.id}
                  link={link}
                  collections={data.collections}
                  onUpdate={handleUpdateLink}
                  onDelete={handleDeleteLink}
                  onMoveToCollection={handleMoveToCollection}
                  onAddNote={handleAddNote}
                  onTagsUpdated={handleTagsUpdated}
                />
              ))
            )}
          </div>
        ) : selectedTag ? (
          /* Tag Filtered Results */
          <div className="tag-results">
            <div className="tag-results-header">
              <h3>
                <Tag size={16} />
                Tagged with "{selectedTag}" ({taggedLinks.length})
              </h3>
              <button onClick={clearAllFilters} className="clear-search-btn">
                Show All Links
              </button>
            </div>
            {taggedLinks.length === 0 ? (
              <div className="no-results">
                <p>No links found with tag "{selectedTag}"</p>
              </div>
            ) : (
              taggedLinks.map(link => (
                <LinkCard
                  key={link.id}
                  link={link}
                  collections={data.collections}
                  onUpdate={handleUpdateLink}
                  onDelete={handleDeleteLink}
                  onMoveToCollection={handleMoveToCollection}
                  onAddNote={handleAddNote}
                  onTagsUpdated={handleTagsUpdated}
                />
              ))
            )}
          </div>
        ) : (
          /* Normal View - Holding Area and Collections */
          <>
            {/* Holding Area */}
            <div className="section">
              <button
                onClick={() => toggleSection('holdingArea')}
                className="section-header"
              >
                {expandedSections.holdingArea ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span>Holding Area</span>
                <span className="count">{holdingAreaLinks.length}</span>
              </button>
              
              {expandedSections.holdingArea && (
                <div className="section-content">
                  {holdingAreaLinks.length === 0 ? (
                    <div className="empty-state">
                      <p>No links saved yet</p>
                      <button onClick={saveCurrentPage} className="empty-action">
                        Save current page
                      </button>
                    </div>
                  ) : (
                    holdingAreaLinks.map(link => (
                      <LinkCard
                        key={link.id}
                        link={link}
                        collections={data.collections}
                        onUpdate={handleUpdateLink}
                        onDelete={handleDeleteLink}
                        onMoveToCollection={handleMoveToCollection}
                        onAddNote={handleAddNote}
                        onTagsUpdated={handleTagsUpdated}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Collections */}
            <div className="section">
              <button
                onClick={() => toggleSection('collections')}
                className="section-header"
              >
                {expandedSections.collections ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span>Collections</span>
                <span className="count">{data.collections.length}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCreateCollectionModal(true);
                  }}
                  className="add-collection-button"
                  title="Create new collection"
                >
                  <FolderPlus size={14} />
                </button>
              </button>

              {expandedSections.collections && (
                <div className="section-content">
                  {data.collections.length === 0 ? (
                    <div className="empty-state">
                      <p>No collections yet</p>
                      <button
                        onClick={() => setShowCreateCollectionModal(true)}
                        className="empty-action"
                      >
                        Create collection
                      </button>
                    </div>
                  ) : (
                    data.collections.map(collection => {
                      const collectionLinks = getCollectionLinks(collection.id);
                      return (
                        <CollectionCard
                          key={collection.id}
                          collection={collection}
                          links={collectionLinks}
                          onUpdateLink={handleUpdateLink}
                          onDeleteLink={handleDeleteLink}
                          onAddNote={handleAddNote}
                          onTagsUpdated={handleTagsUpdated}
                          onUpdate={loadData}
                        />
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="footer">
        <button 
          onClick={() => setShowSettings(true)} 
          className="footer-button" 
          title="Settings"
        >
          <Settings size={16} />
        </button>
        <span className="footer-text">
          {data.links.length} links • {userTags.length} tags
        </span>
      </div>

      {/* Modals */}
      {showAddNoteModal && selectedLink && (
        <AddNoteModal
          link={selectedLink}
          onSave={handleSaveNote}
          onClose={() => {
            setShowAddNoteModal(false);
            setSelectedLink(null);
          }}
        />
      )}

      {showCreateCollectionModal && (
        <CreateCollectionModal
          onSave={handleCreateCollection}
          onClose={() => setShowCreateCollectionModal(false)}
        />
      )}

      {showSettings && (
        <SettingsComponent
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
};

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default Sidepanel; 