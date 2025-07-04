import React, { useState, useEffect } from 'react';
import { Search, Plus, ChevronDown, ChevronRight, Bookmark, FolderPlus, Settings, ExternalLink, LogOut } from 'lucide-react';
import { SavedLink, Collection, StorageData } from '../types';
import { storage } from '../utils/storage';
import LinkCard from './components/LinkCard';
import CollectionCard from './components/CollectionCard';
import AddNoteModal from './components/AddNoteModal';
import CreateCollectionModal from './components/CreateCollectionModal';
import { supabase } from '../utils/supabase';
import { Session } from '@supabase/supabase-js';
import './sidepanel.css';

const Sidepanel: React.FC = () => {
  const [data, setData] = useState<StorageData>({
    links: [],
    collections: [],
    categories: [],
    settings: { defaultCategory: 'general', autoSummarize: true }
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState({
    holdingArea: true,
    collections: true
  });
  const [selectedLink, setSelectedLink] = useState<SavedLink | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
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
      }
    });

    // Listen for authentication state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session);
      setSession(session);
      if (session) {
        loadData();
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
    const { error } = await supabase.auth.signInWithOtp({ email });

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

  const filteredLinks = data.links.filter(link => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      link.title.toLowerCase().includes(term) ||
      link.url.toLowerCase().includes(term) ||
      link.userNote.toLowerCase().includes(term) ||
      link.aiSummary?.toLowerCase().includes(term) ||
      link.category.toLowerCase().includes(term)
    );
  });

  const holdingAreaLinks = filteredLinks.filter(link => !link.collectionId);
  const getCollectionLinks = (collectionId: string) => 
    filteredLinks.filter(link => link.collectionId === collectionId);

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

      {/* Search */}
      <div className="search-container">
        <Search className="search-icon" size={16} />
        <input
          type="text"
          placeholder="Search links..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Content */}
      <div className="content">
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
                    />
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <button className="footer-button" title="Settings">
          <Settings size={16} />
        </button>
        <span className="footer-text">
          {data.links.length} links saved
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
    </div>
  );
};

export default Sidepanel; 