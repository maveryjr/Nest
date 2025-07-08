import React, { useState, useEffect, useCallback } from 'react';
import { Search, Plus, ChevronDown, ChevronRight, Bookmark, FolderPlus, Settings, ExternalLink, LogOut, X, Tag, Inbox, Archive, CheckSquare, TabletSmartphone, Command as CommandIcon, Sparkles, MessageCircle, StickyNote, Camera, BarChart3, Brain, List, Grid3X3, Focus, Network, Mic, Edit } from 'lucide-react';
import { SavedLink, Collection, StorageData, SmartCollection, VoiceMemo, RichNote } from '../types';
import { storage } from '../utils/storage';
import LinkCard from './components/LinkCard';
import CollectionCard from './components/CollectionCard';
import SmartCollectionCard from './components/SmartCollectionCard';
import SearchResultCard from './components/SearchResultCard';
import InboxCard from './components/InboxCard';
import CommandPalette from './components/CommandPalette';
import TabSync from './components/TabSync';
import AddNoteModal from './components/AddNoteModal';
import CreateCollectionModal from './components/CreateCollectionModal';
import SavePromptModal from './components/SavePromptModal';
import LinkDetailModal from './components/LinkDetailModal';
import TagFilters from './components/TagFilters';
import SettingsComponent from './components/Settings';
import { supabase } from '../utils/supabase';
import { Session } from '@supabase/supabase-js';
import './sidepanel.css';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import AIInsights from './components/AIInsights';
import FocusModeComponent from './components/FocusMode';
import KnowledgeGraph from './components/KnowledgeGraph';
import RichAnnotations from './components/RichAnnotations';

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
  const [isFloatingWindow, setIsFloatingWindow] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SavedLink[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchMode, setSearchMode] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [taggedLinks, setTaggedLinks] = useState<SavedLink[]>([]);
  const [userTags, setUserTags] = useState<UserTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    inbox: true,
    smartCollections: true,
    holdingArea: true,
    collections: true
  });
  const [selectedLink, setSelectedLink] = useState<SavedLink | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showCreateCollectionModal, setShowCreateCollectionModal] = useState(false);
  const [showLinkDetailModal, setShowLinkDetailModal] = useState(false);
  const [selectedLinkForDetail, setSelectedLinkForDetail] = useState<SavedLink | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [inboxLinks, setInboxLinks] = useState<SavedLink[]>([]);
  const [selectedInboxLinks, setSelectedInboxLinks] = useState<string[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showTabSync, setShowTabSync] = useState(false);
  const [currentPageInfo, setCurrentPageInfo] = useState<any>(null);
  const [showSavePrompt, setShowSavePrompt] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [showKnowledgeGraph, setShowKnowledgeGraph] = useState(false);
  const [showRichAnnotations, setShowRichAnnotations] = useState(false);
  const [annotationTarget, setAnnotationTarget] = useState<{type: 'link' | 'highlight', id: string} | null>(null);
  const [compactView, setCompactView] = useState(false);
  const [isAIOrganizing, setIsAIOrganizing] = useState(false);
  const [isAIOrganizingHolding, setIsAIOrganizingHolding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Toast notification system
  const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    if (type === 'success') {
      setSuccessMessage(message);
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } else if (type === 'error') {
      setError(message);
      setTimeout(() => setError(null), 5000);
    }
  };

  // Enhanced error handling wrapper
  const withErrorHandling = async (fn: () => Promise<any>, errorMessage: string) => {
    try {
      await fn();
    } catch (error) {
      console.error(errorMessage, error);
      showToast(`${errorMessage}: ${error instanceof Error ? error.message : 'Unknown error'}`, 'error');
    }
  };

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

    // Listen for messages from background script to refresh data
    const messageListener = (message: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void) => {
      if (message.action === 'refreshSidebar') {
        console.log('Sidebar: Received refresh request');
        loadData();
        loadInboxLinks();
        loadUserTags();
        sendResponse({ success: true });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      subscription.unsubscribe();
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  useEffect(() => {
    loadData();
    checkForNewTabSearch();
    loadCompactViewSetting();
    loadDarkModeSetting();
    checkFloatingWindowMode();
  }, []);

  // Check if this is a floating window
  const checkFloatingWindowMode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isFloating = urlParams.get('floating') === 'true';
    setIsFloatingWindow(isFloating);
    
    if (isFloating) {
      // Add floating window specific styling
      document.body.classList.add('floating-window');
    }
  };

  // Load compact view setting from storage
  const loadCompactViewSetting = async () => {
    try {
      const result = await chrome.storage.local.get('nest_compact_view');
      setCompactView(result.nest_compact_view === true);
    } catch (error) {
      console.error('Failed to load compact view setting:', error);
    }
  };

  const loadDarkModeSetting = async () => {
    try {
      const result = await chrome.storage.local.get('nest_settings');
      const settings = result.nest_settings || {};
      if (settings.darkMode) {
        document.body.classList.add('dark-mode');
      } else {
        document.body.classList.remove('dark-mode');
      }
    } catch (error) {
      console.error('Failed to load dark mode setting:', error);
    }
  };

  // Save compact view setting to storage
  const saveCompactViewSetting = async (isCompact: boolean) => {
    try {
      await chrome.storage.local.set({ 'nest_compact_view': isCompact });
      setCompactView(isCompact);
    } catch (error) {
      console.error('Failed to save compact view setting:', error);
    }
  };

  // Check for search query from new tab
  const checkForNewTabSearch = async () => {
    try {
      const result = await chrome.storage.local.get('nest_search_query');
      if (result.nest_search_query) {
        setSearchTerm(result.nest_search_query);
        debouncedSearch(result.nest_search_query);
        // Clear the stored search query
        await chrome.storage.local.remove('nest_search_query');
      }
    } catch (error) {
      console.error('Failed to check for new tab search:', error);
    }
  };

  // Global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Command palette shortcut (Cmd/Ctrl + K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  const loadData = async () => {
    try {
      const storageData = await storage.getData();
      setData(storageData);
      await loadInboxLinks();
    } catch (error) {
      console.error('Failed to load data:', error);
      showToast('Failed to load data. Please refresh the page.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const loadInboxLinks = async () => {
    setLoadingInbox(true);
    try {
      const inbox = await storage.getInboxLinks();
      setInboxLinks(inbox);
    } catch (error) {
      console.error('Failed to load inbox links:', error);
    } finally {
      setLoadingInbox(false);
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
      // Get current page info first
      const pageInfoResponse = await chrome.runtime.sendMessage({ action: 'getPageInfo' });
      if (pageInfoResponse.success) {
        setCurrentPageInfo(pageInfoResponse.pageInfo);
        setShowSavePrompt(true);
      } else {
        // Fallback to direct save if we can't get page info
        await saveDirectly();
      }
    } catch (error) {
      console.error('Failed to get page info:', error);
      // Fallback to direct save
      await saveDirectly();
    }
  };

  const toggleFloatingAI = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id!, { action: 'toggleFloatingAI' });
      }
    } catch (error) {
      console.error('Failed to toggle floating AI:', error);
    }
  };

  const toggleStickyNotes = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id!, { action: 'toggleStickyNotes' });
      }
    } catch (error) {
      console.error('Failed to toggle sticky notes:', error);
    }
  };

  const toggleScreenshotTool = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.tabs.sendMessage(tabs[0].id!, { action: 'toggleScreenshotTool' });
      }
    } catch (error) {
      console.error('Failed to toggle screenshot tool:', error);
    }
  };

  const saveDirectly = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        await chrome.runtime.sendMessage({ action: 'saveCurrentPage' });
        await loadData();
        await loadUserTags();
      }
    } catch (error) {
      console.error('Failed to save page:', error);
    }
  };

  const handleUpdateLink = async (linkId: string, updates: Partial<SavedLink>) => {
    await withErrorHandling(async () => {
      await storage.updateLink(linkId, updates);
      
      // Log organize activity if moving between collections
      if (updates.collectionId !== undefined) {
        await storage.logActivity('organize', linkId, updates.collectionId, {
          action: 'move_to_collection'
        });
      }
      
      await loadData();
      showToast('Link updated successfully!');
    }, 'Failed to update link');
  };

  const handleDeleteLink = async (linkId: string) => {
    await withErrorHandling(async () => {
      await storage.deleteLink(linkId);
      await loadData();
      await loadUserTags(); // Refresh tags after deletion
      
      // If we're filtering by tag, refresh those results
      if (selectedTag) {
        handleTagSelect(selectedTag);
      }
      showToast('Link deleted successfully!');
    }, 'Failed to delete link');
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

  const handleOpenLinkDetail = (link: SavedLink) => {
    setSelectedLinkForDetail(link);
    setShowLinkDetailModal(true);
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

  // Inbox-specific handlers
  const handleMoveFromInbox = async (linkId: string, collectionId?: string) => {
    try {
      await storage.moveFromInbox(linkId, collectionId);
      
      // Log organize activity
      await storage.logActivity('organize', linkId, collectionId, {
        action: 'move_from_inbox'
      });
      
      await loadInboxLinks();
      await loadData();
      setSelectedInboxLinks(prev => prev.filter(id => id !== linkId));
    } catch (error) {
      console.error('Failed to move link from inbox:', error);
    }
  };

  const handleSelectInboxLink = (linkId: string) => {
    setSelectedInboxLinks(prev => 
      prev.includes(linkId) 
        ? prev.filter(id => id !== linkId)
        : [...prev, linkId]
    );
  };

  const handleSelectAllInbox = () => {
    if (selectedInboxLinks.length === inboxLinks.length) {
      setSelectedInboxLinks([]);
    } else {
      setSelectedInboxLinks(inboxLinks.map(link => link.id));
    }
  };

  const handleBulkMoveFromInbox = async (collectionId?: string) => {
    if (selectedInboxLinks.length === 0) return;
    
    try {
      await storage.bulkMoveFromInbox(selectedInboxLinks, collectionId);
      await loadInboxLinks();
      await loadData();
      setSelectedInboxLinks([]);
    } catch (error) {
      console.error('Failed to bulk move links from inbox:', error);
    }
  };

  const handleAIAutoOrganize = async () => {
    if (inboxLinks.length === 0 || isAIOrganizing) return;
    
    setIsAIOrganizing(true);
    
    try {
      // Check if user has OpenAI API key configured
      const result = await chrome.storage.local.get('nest_settings');
      const apiKey = result.nest_settings?.openaiApiKey;
      
      if (!apiKey) {
        alert('Please configure your OpenAI API key in settings to use AI auto-organize.');
        setShowSettings(true);
        return;
      }

      // Request AI analysis for all inbox links
      const organizationPromises = inboxLinks.map(async (link) => {
        try {
          const response = await chrome.runtime.sendMessage({ 
            action: 'analyzeLinkContent',
            title: link.title,
            url: link.url,
            content: link.aiSummary || link.userNote || link.title
          });

          if (response.success && response.analysis) {
            const analysis = response.analysis;
            
            // Find best matching collection based on AI analysis
            let bestCollectionId = null;
            let bestMatch = 0;
            
            // Check category suggestions against existing collections
            if (analysis.categorySuggestions && analysis.categorySuggestions.length > 0) {
              for (const suggestion of analysis.categorySuggestions) {
                const matchingCollection = data.collections.find(col => 
                  col.name.toLowerCase().includes(suggestion.category.toLowerCase()) ||
                  suggestion.category.toLowerCase().includes(col.name.toLowerCase())
                );
                
                if (matchingCollection && suggestion.confidence > bestMatch) {
                  bestCollectionId = matchingCollection.id;
                  bestMatch = suggestion.confidence;
                }
              }
            }
            
            // Apply AI suggestions
            const updates: any = {};
            
            // Apply category if confident enough
            if (analysis.categorySuggestions && analysis.categorySuggestions[0]?.confidence > 0.7) {
              updates.category = analysis.categorySuggestions[0].category;
            }
            
            // Move to collection if found good match
            if (bestCollectionId && bestMatch > 0.6) {
              await storage.moveFromInbox(link.id, bestCollectionId);
            } else {
              // Otherwise just move to holding area with updates
              await storage.moveFromInbox(link.id);
              if (Object.keys(updates).length > 0) {
                await storage.updateLink(link.id, updates);
              }
            }
            
            // Add AI suggested tags
            if (analysis.tagSuggestions && analysis.tagSuggestions.length > 0) {
              const highConfidenceTags = analysis.tagSuggestions
                .filter(tag => tag.confidence > 0.6)
                .map(tag => tag.tag)
                .slice(0, 3); // Limit to 3 tags
              
              if (highConfidenceTags.length > 0) {
                await storage.addTagsToLink(link.id, highConfidenceTags);
              }
            }
            
            return { success: true, link: link.id, collection: bestCollectionId };
          }
        } catch (error) {
          console.error(`Failed to analyze link ${link.id}:`, error);
          return { success: false, link: link.id, error };
        }
      });

      const results = await Promise.all(organizationPromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      // Show notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'AI Auto-Organize Complete',
        message: `Organized ${successful} items${failed > 0 ? `, ${failed} failed` : ''}`
      });

      // Refresh data
      await loadInboxLinks();
      await loadData();
      await loadUserTags();
      
    } catch (error) {
      console.error('AI auto-organize failed:', error);
      alert('AI auto-organize failed. Please try again.');
    } finally {
      setIsAIOrganizing(false);
    }
  };

  // Command palette handlers
  const handleOpenLink = (url: string) => {
    window.open(url, '_blank');
  };

  const handleCommandPaletteCreateCollection = () => {
    setShowCreateCollectionModal(true);
  };

  // Tab sync handlers
  const handleSaveTabs = async (tabs: any[], collectionId?: string, toInbox?: boolean) => {
    const saveTasks = tabs.map(async (tab) => {
      const newLink = {
        url: tab.url,
        title: tab.title,
        favicon: tab.favicon || `https://www.google.com/s2/favicons?domain=${tab.domain}&sz=32`,
        userNote: '',
        aiSummary: '',
        category: 'general',
        domain: tab.domain,
        isInInbox: toInbox || false,
        collectionId: toInbox ? undefined : collectionId,
      };

      return await storage.addLink(newLink);
    });

    await Promise.all(saveTasks);
    await loadData();
    await loadInboxLinks();
    
    // Show success notification
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Tabs Saved to Nest',
      message: `Saved ${tabs.length} tab(s) ${toInbox ? 'to inbox' : collectionId ? 'to collection' : 'to holding area'}`
    });
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

  // Save prompt handlers
  const handleSaveWithContext = async (reason: string, tags?: string[]) => {
    try {
      const response = await chrome.runtime.sendMessage({ 
        action: 'saveWithContext', 
        reason, 
        tags 
      });
      
      if (response.success) {
        await loadData();
        await loadUserTags();
        setShowSavePrompt(false);
        setCurrentPageInfo(null);
      } else {
        console.error('Failed to save with context:', response.error);
      }
    } catch (error) {
      console.error('Failed to save with context:', error);
    }
  };

  const handleSkipSavePrompt = async () => {
    setShowSavePrompt(false);
    setCurrentPageInfo(null);
    await saveDirectly();
  };

  const handleCloseSavePrompt = () => {
    setShowSavePrompt(false);
    setCurrentPageInfo(null);
  };

  const handleOpenRichAnnotations = (type: 'link' | 'highlight', id: string) => {
    setAnnotationTarget({ type, id });
    setShowRichAnnotations(true);
  };

  const handleSaveVoiceMemo = async (memo: VoiceMemo) => {
    if (!annotationTarget) return;

    try {
      await withErrorHandling(async () => {
        if (annotationTarget.type === 'link') {
          const link = data.links.find(l => l.id === annotationTarget.id);
          if (link) {
            await handleUpdateLink(link.id, {
              voiceMemos: [...(link.voiceMemos || []), memo]
            });
          }
        }
        showToast('Voice memo saved successfully!', 'success');
        setShowRichAnnotations(false);
        setAnnotationTarget(null);
      }, 'Failed to save voice memo');
    } catch (error) {
      console.error('Error saving voice memo:', error);
    }
  };

  const handleSaveRichNote = async (note: RichNote) => {
    if (!annotationTarget) return;

    try {
      await withErrorHandling(async () => {
        if (annotationTarget.type === 'link') {
          const link = data.links.find(l => l.id === annotationTarget.id);
          if (link) {
            await handleUpdateLink(link.id, {
              richNotes: [...(link.richNotes || []), note]
            });
          }
        }
        showToast('Rich note saved successfully!', 'success');
        setShowRichAnnotations(false);
        setAnnotationTarget(null);
      }, 'Failed to save rich note');
    } catch (error) {
      console.error('Error saving rich note:', error);
    }
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

  // Get collection links
  const getCollectionLinks = (collectionId: string) => 
    filteredLinks.filter(link => link.collectionId === collectionId);

  // Get filtered links (excluding inbox items)
  const filteredLinks = data.links.filter(link => !link.isInInbox);

  // Get holding area links (items without specific collection)
  const holdingAreaLinks = filteredLinks.filter(link => !link.collectionId);

  // AI Auto-Organize for Holding Area
  const handleAIAutoOrganizeHolding = async () => {
    if (holdingAreaLinks.length === 0 || isAIOrganizingHolding) return;
    
    setIsAIOrganizingHolding(true);
    
    try {
      // Check if user has OpenAI API key configured
      const result = await chrome.storage.local.get('nest_settings');
      const apiKey = result.nest_settings?.openaiApiKey;
      
      if (!apiKey) {
        alert('Please configure your OpenAI API key in settings to use AI auto-organize.');
        setIsAIOrganizingHolding(false);
        return;
      }

      // Get user's existing collections
      const collections = data.collections;
      
      // Process each holding area link
      const organizePromises = holdingAreaLinks.map(async (link) => {
        try {
          // Request AI analysis using the new analyzeLinkContent action
          const analysisResponse = await chrome.runtime.sendMessage({
            action: 'analyzeLinkContent',
            title: link.title,
            url: link.url,
            content: link.aiSummary || link.userNote || link.title
          });

          if (analysisResponse.success && analysisResponse.analysis) {
            const analysis = analysisResponse.analysis;
            
            // Find best matching collection based on AI suggestions
            let bestCollectionId = null;
            let highestConfidence = 0;
            let bestMatchReason = '';

            // Helper function to calculate match score between two strings
            const calculateMatchScore = (text1: string, text2: string): number => {
              const words1 = text1.toLowerCase().split(/\s+/);
              const words2 = text2.toLowerCase().split(/\s+/);
              let matches = 0;
              
              for (const word1 of words1) {
                for (const word2 of words2) {
                  if (word1.includes(word2) || word2.includes(word1)) {
                    matches++;
                  }
                }
              }
              
              return matches / Math.max(words1.length, words2.length);
            };

            // Check collections against AI category suggestions
            for (const collection of collections) {
              const collectionName = collection.name.toLowerCase();
              
              // Try to match with category suggestions
              if (analysis.categorySuggestions) {
                for (const suggestion of analysis.categorySuggestions) {
                  const matchScore = calculateMatchScore(collectionName, suggestion.category) * suggestion.confidence;
                  
                  if (matchScore > 0.2 && matchScore > highestConfidence) {
                    highestConfidence = matchScore;
                    bestCollectionId = collection.id;
                    bestMatchReason = `Category "${suggestion.category}" matches collection "${collection.name}" (score: ${matchScore.toFixed(2)})`;
                  }
                }
              }
              
              // Also try matching with content topics
              if (analysis.topics) {
                for (const topic of analysis.topics) {
                  const matchScore = calculateMatchScore(collectionName, topic) * 0.6; // Lower weight for topics
                  
                  if (matchScore > 0.2 && matchScore > highestConfidence) {
                    highestConfidence = matchScore;
                    bestCollectionId = collection.id;
                    bestMatchReason = `Topic "${topic}" matches collection "${collection.name}" (score: ${matchScore.toFixed(2)})`;
                  }
                }
              }

              // Try matching with tag suggestions
              if (analysis.tagSuggestions) {
                for (const tagSugg of analysis.tagSuggestions) {
                  const matchScore = calculateMatchScore(collectionName, tagSugg.tag) * tagSugg.confidence * 0.5; // Lower weight for tags
                  
                  if (matchScore > 0.15 && matchScore > highestConfidence) {
                    highestConfidence = matchScore;
                    bestCollectionId = collection.id;
                    bestMatchReason = `Tag "${tagSugg.tag}" matches collection "${collection.name}" (score: ${matchScore.toFixed(2)})`;
                  }
                }
              }
            }

            // If no good match found but we have collections, try fallback logic
            if (!bestCollectionId && collections.length > 0) {
              // Look for specific collection types
              const generalCollection = collections.find(c => 
                /general|misc|other|default|unsorted|random/i.test(c.name)
              );
              
              if (generalCollection) {
                bestCollectionId = generalCollection.id;
                bestMatchReason = 'Moved to general collection as fallback';
                highestConfidence = 0.1;
              } else {
                // Use the first available collection as last resort
                bestCollectionId = collections[0].id;
                bestMatchReason = 'Moved to first available collection as fallback';
                highestConfidence = 0.05;
              }
            }

            // Move the link if we found any collection
            if (bestCollectionId) {
              await storage.updateLink(link.id, { collectionId: bestCollectionId });
              
              // Apply AI tags if available and confidence is decent
              if (analysis.tagSuggestions && analysis.tagSuggestions.length > 0) {
                const highConfidenceTags = analysis.tagSuggestions
                  .filter(tag => tag.confidence > 0.4) // Reasonable threshold
                  .map(tag => tag.tag)
                  .slice(0, 3);
                
                if (highConfidenceTags.length > 0) {
                  await storage.addTagsToLink(link.id, highConfidenceTags);
                }
              }
              
              console.log(`AI Organized: "${link.title}" -> Collection "${collections.find(c => c.id === bestCollectionId)?.name}" (${bestMatchReason})`);
              return { success: true, linkId: link.id, collectionId: bestCollectionId, reason: bestMatchReason };
            }
          }
          
          // If AI analysis fails, still try to organize to a default collection
          if (collections.length > 0) {
            const defaultCollection = collections.find(c => 
              c.name.toLowerCase().includes('general') ||
              c.name.toLowerCase().includes('misc') ||
              c.name.toLowerCase().includes('unsorted')
            ) || collections[0];
            
            await storage.updateLink(link.id, { collectionId: defaultCollection.id });
            console.log(`Fallback Organized: "${link.title}" -> ${defaultCollection.name}`);
            return { success: true, linkId: link.id, collectionId: defaultCollection.id, reason: 'Fallback organization' };
          }
          
          return { success: false, linkId: link.id, error: 'No collections available' };
        } catch (error) {
          console.error('Failed to organize link:', link.id, error);
          
          // Even if AI fails, try to move to a default collection
          if (collections.length > 0) {
            try {
              const defaultCollection = collections[0];
              await storage.updateLink(link.id, { collectionId: defaultCollection.id });
              return { success: true, linkId: link.id, collectionId: defaultCollection.id, reason: 'Error fallback' };
            } catch (fallbackError) {
              console.error('Fallback organization also failed:', fallbackError);
            }
          }
          
          return { success: false, linkId: link.id, error: (error as Error).message };
        }
      });

      const results = await Promise.all(organizePromises);
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      
      // Show notification
      await chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon48.png',
        title: 'AI Auto-Organize Complete',
        message: `Organized ${successful} items from holding area${failed > 0 ? `, ${failed} failed` : ''}`
      });

      // Refresh data
      await loadData();
      await loadUserTags();
      
    } catch (error) {
      console.error('AI auto-organize failed:', error);
      alert('AI auto-organize failed. Please try again.');
    } finally {
      setIsAIOrganizingHolding(false);
    }
  };

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
          <h1>Nest{isFloatingWindow && <span className="floating-indicator"> • Floating</span>}</h1>
        </div>
        <div className="header-actions">
          {isFloatingWindow && (
            <button
              onClick={() => window.close()}
              className="header-button close-button"
              title="Close floating window"
            >
              <X size={18} />
            </button>
          )}
          <button onClick={toggleScreenshotTool} className="screenshot-button" title="Screenshot Tool (Alt+C)">
            <Camera size={18} />
          </button>
          <button onClick={toggleStickyNotes} className="sticky-notes-button" title="Toggle Sticky Notes (Alt+S)">
            <StickyNote size={18} />
          </button>
          <button onClick={toggleFloatingAI} className="floating-ai-button" title="Toggle Floating AI Assistant (Alt+A)">
            <MessageCircle size={18} />
          </button>
          <button onClick={() => setShowTabSync(true)} className="tab-sync-button" title="Tab Sync Mode">
            <TabletSmartphone size={18} />
          </button>
          <button onClick={saveCurrentPage} className="save-button" title="Save current page">
            <Plus size={18} />
          </button>
          <button onClick={() => setShowAnalytics(true)} className="analytics-button" title="View Reading Analytics">
            <BarChart3 size={18} />
            Analytics
          </button>
          
          <button onClick={() => setShowAIInsights(true)} className="ai-insights-button" title="AI-Powered Insights">
            <Brain size={18} />
            AI Insights
          </button>
          
          <button onClick={() => setShowFocusMode(true)} className="focus-mode-button" title="Focus Mode">
            <Focus size={18} />
            Focus
          </button>
          
          <button onClick={() => setShowKnowledgeGraph(true)} className="knowledge-graph-button" title="Knowledge Graph">
            <Network size={18} />
            Graph
          </button>
          
          <button onClick={() => handleOpenRichAnnotations('link', '')} className="rich-annotations-button" title="Rich Annotations">
            <Edit size={18} />
            Annotate
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
          placeholder="Search your links... (⌘K for power mode)"
          value={searchTerm}
          onChange={handleSearchChange}
          className="search-input"
          onFocus={() => {
            if (!searchTerm) {
              // Suggest using command palette for empty searches
            }
          }}
        />
        {searchTerm && (
          <button onClick={clearSearch} className="search-clear" title="Clear search">
            <X size={16} />
          </button>
        )}
        {isSearching && <div className="search-spinner">⟳</div>}
        {!searchTerm && !isSearching && (
          <button
            onClick={() => setShowCommandPalette(true)}
            className="command-hint-button"
            title="Open command palette (⌘K)"
          >
            <CommandIcon size={14} />
            <span>Or press ⌘K for quick access</span>
          </button>
        )}
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

      {/* View Toggle */}
      <div className="view-toggle-container">
        <div className="view-toggle">
          <button
            onClick={() => saveCompactViewSetting(false)}
            className={`view-toggle-btn ${!compactView ? 'active' : ''}`}
            title="Normal view"
          >
            <Grid3X3 size={14} />
            Normal
          </button>
          <button
            onClick={() => saveCompactViewSetting(true)}
            className={`view-toggle-btn ${compactView ? 'active' : ''}`}
            title="Compact view"
          >
            <List size={14} />
            Compact
          </button>
        </div>
      </div>

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
                  compactView={compactView}
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
                  compactView={compactView}
                />
              ))
            )}
          </div>
        ) : (
          /* Normal View - Inbox, Holding Area and Collections */
          <>
            {/* Inbox Section */}
            <div className="section inbox-section">
              <div className="inbox-section-header">
                <div className="inbox-section-title">
                  <button
                    onClick={() => toggleSection('inbox')}
                    className="section-header"
                    style={{ padding: 0, background: 'none', border: 'none' }}
                  >
                    {expandedSections.inbox ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <Inbox size={16} />
                    <span>Inbox</span>
                  </button>
                  <span className="inbox-count">{inboxLinks.length}</span>
                </div>
                {inboxLinks.length > 0 && (
                  <div className="inbox-actions">
                    <button
                      onClick={handleSelectAllInbox}
                      className="inbox-action-button"
                      title={selectedInboxLinks.length === inboxLinks.length ? 'Deselect all' : 'Select all'}
                    >
                      <CheckSquare size={14} />
                      {selectedInboxLinks.length === inboxLinks.length ? 'Deselect All' : 'Select All'}
                    </button>
                    <button
                      onClick={handleAIAutoOrganize}
                      className="inbox-action-button ai-organize-button"
                      title="Use AI to automatically organize all inbox items"
                      disabled={inboxLinks.length === 0 || isAIOrganizing}
                    >
                      <Sparkles size={14} className={isAIOrganizing ? 'spinning' : ''} />
                      {isAIOrganizing ? 'Organizing...' : 'AI Auto-Organize'}
                    </button>
                    {selectedInboxLinks.length > 0 && (
                      <>
                        <button
                          onClick={() => handleBulkMoveFromInbox()}
                          className="inbox-action-button"
                          title="Move selected to holding area"
                        >
                          <Archive size={14} />
                          Move to Holding ({selectedInboxLinks.length})
                        </button>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleBulkMoveFromInbox(e.target.value);
                              e.target.value = '';
                            }
                          }}
                          className="inbox-action-button"
                          style={{ padding: '6px 8px' }}
                          title="Move selected links to collection"
                          aria-label="Move selected links to collection"
                        >
                          <option value="">Move to Collection...</option>
                          {data.collections.map(collection => (
                            <option key={collection.id} value={collection.id}>
                              {collection.name}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                  </div>
                )}
              </div>

              {expandedSections.inbox && (
                <div className="section-content">
                  {loadingInbox ? (
                    <div className="loading-spinner">Loading inbox...</div>
                  ) : inboxLinks.length === 0 ? (
                    <div className="inbox-empty">
                      <Inbox className="inbox-empty-icon" />
                      <h3>Inbox is empty</h3>
                      <p>New saves will appear here for quick organization</p>
                    </div>
                  ) : (
                    inboxLinks.map(link => (
                      <InboxCard
                        key={link.id}
                        link={link}
                        collections={data.collections}
                        onMoveFromInbox={handleMoveFromInbox}
                        onDelete={handleDeleteLink}
                        onUpdate={handleUpdateLink}
                        onAddNote={handleAddNote}
                        onTagsUpdated={handleTagsUpdated}
                        isSelected={selectedInboxLinks.includes(link.id)}
                        onSelect={handleSelectInboxLink}
                        onOpenDetail={handleOpenLinkDetail}
                        compactView={compactView}
                      />
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Smart Collections */}
            {data.settings.enableSmartCollections && data.smartCollections && data.smartCollections.length > 0 && (
              <div className="section smart-collections-section">
                <button
                  onClick={() => toggleSection('smartCollections')}
                  className="section-header"
                >
                  {expandedSections.smartCollections ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <Sparkles size={16} />
                  <span>Smart Collections</span>
                  <span className="count">{data.smartCollections.length}</span>
                </button>
                
                {expandedSections.smartCollections && (
                  <div className="section-content">
                    {data.smartCollections.map(smartCollection => (
                      <SmartCollectionCard
                        key={smartCollection.id}
                        smartCollection={smartCollection}
                        collections={data.collections}
                        onUpdateLink={handleUpdateLink}
                        onDeleteLink={handleDeleteLink}
                        onAddNote={handleAddNote}
                        onTagsUpdated={handleTagsUpdated}
                        onOpenDetail={handleOpenLinkDetail}
                        compactView={compactView}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Holding Area */}
            <div className="section">
              <div className="inbox-section-header">
                <div className="inbox-section-title">
                  <button
                    onClick={() => toggleSection('holdingArea')}
                    className="section-header"
                  >
                    {expandedSections.holdingArea ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span>Holding Area</span>
                    <span className="count">{holdingAreaLinks.length}</span>
                  </button>
                </div>
                
                {holdingAreaLinks.length > 0 && (
                  <div className="inbox-actions">
                    <button
                      onClick={handleAIAutoOrganizeHolding}
                      className="inbox-action-button"
                      title="Use AI to automatically organize items into collections"
                      disabled={holdingAreaLinks.length === 0 || isAIOrganizingHolding}
                    >
                      <Sparkles size={14} className={isAIOrganizingHolding ? 'spinning' : ''} />
                      {isAIOrganizingHolding ? 'Organizing...' : 'AI Auto-Organize'}
                    </button>
                  </div>
                )}
              </div>
              
              {expandedSections.holdingArea && (
                <div className="section-content">
                  {holdingAreaLinks.length === 0 ? (
                    <div className="empty-state">
                      <p>No links in holding area</p>
                      <p style={{ fontSize: '0.9em', color: 'var(--ui-text-secondary)', marginTop: '0.5rem' }}>
                        Links without a specific collection will appear here
                      </p>
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
                        onOpenDetail={handleOpenLinkDetail}
                        compactView={compactView}
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
                          onOpenDetail={handleOpenLinkDetail}
                          compactView={compactView}
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

      {showLinkDetailModal && selectedLinkForDetail && (
        <LinkDetailModal
          link={selectedLinkForDetail}
          collections={data.collections}
          onClose={() => {
            setShowLinkDetailModal(false);
            setSelectedLinkForDetail(null);
          }}
          onUpdate={handleUpdateLink}
          onDelete={handleDeleteLink}
          onAddNote={handleAddNote}
        />
      )}

      {showSettings && (
        <SettingsComponent
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        links={data.links}
        collections={data.collections}
        onOpenLink={handleOpenLink}
        onAddToCollection={handleMoveToCollection}
        onCreateCollection={handleCommandPaletteCreateCollection}
        onSaveCurrentPage={saveCurrentPage}
        onAddNote={handleAddNote}
        onOpenTabSync={() => setShowTabSync(true)}
      />

      {/* Tab Sync Modal */}
      <TabSync
        isOpen={showTabSync}
        onClose={() => setShowTabSync(false)}
        collections={data.collections}
        onSaveTabs={handleSaveTabs}
      />

      {/* Save Prompt Modal */}
      <SavePromptModal
        isOpen={showSavePrompt}
        onSave={handleSaveWithContext}
        onSkip={handleSkipSavePrompt}
        onClose={handleCloseSavePrompt}
        linkTitle={currentPageInfo?.title}
        linkUrl={currentPageInfo?.url}
      />

      {showAnalytics && (
        <AnalyticsDashboard onClose={() => setShowAnalytics(false)} />
      )}

      {showAIInsights && (
        <AIInsights onClose={() => setShowAIInsights(false)} />
      )}

      {showFocusMode && (
        <FocusModeComponent
          isOpen={showFocusMode}
          onClose={() => setShowFocusMode(false)}
        />
      )}

      {showKnowledgeGraph && (
        <KnowledgeGraph
          isOpen={showKnowledgeGraph}
          onClose={() => setShowKnowledgeGraph(false)}
          links={data.links}
        />
      )}

      {showRichAnnotations && annotationTarget && (
        <RichAnnotations
          isOpen={showRichAnnotations}
          onClose={() => {
            setShowRichAnnotations(false);
            setAnnotationTarget(null);
          }}
          onSaveVoiceMemo={handleSaveVoiceMemo}
          onSaveRichNote={handleSaveRichNote}
          targetType={annotationTarget.type}
          targetId={annotationTarget.id}
        />
      )}

      {/* Toast Notifications */}
      {showSuccessToast && (
        <div className="toast-notification success">
          <span>{successMessage}</span>
        </div>
      )}

      {error && (
        <div className="toast-notification error">
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>
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