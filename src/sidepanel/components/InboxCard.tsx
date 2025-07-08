import React, { useState, useRef } from 'react';
import { 
  ExternalLink, 
  MoreVertical, 
  Trash2, 
  Archive, 
  FolderPlus, 
  Edit3,
  Check,
  X,
  Tag as TagIcon,
  Sparkles
} from 'lucide-react';
import { SavedLink, Collection, AIAnalysisResult } from '../../types';
import TagInput from './TagInput';
import HighlightCard from './HighlightCard';
import AISuggestions from './AISuggestions';
import { storage } from '../../utils/storage';

interface LinkTag {
  id: string;
  name: string;
  usageCount?: number;
}

interface InboxCardProps {
  link: SavedLink;
  collections: Collection[];
  onMoveFromInbox: (linkId: string, collectionId?: string) => void;
  onDelete: (linkId: string) => void;
  onUpdate: (linkId: string, updates: Partial<SavedLink>) => void;
  onAddNote: (link: SavedLink) => void;
  onTagsUpdated: () => void;
  isSelected?: boolean;
  onSelect?: (linkId: string) => void;
  onOpenDetail: (link: SavedLink) => void;
  compactView?: boolean;
}

const InboxCard: React.FC<InboxCardProps> = ({
  link,
  collections,
  onMoveFromInbox,
  onDelete,
  onUpdate,
  onAddNote,
  onTagsUpdated,
  isSelected = false,
  onSelect,
  onOpenDetail,
  compactView = false
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCollectionsSubmenu, setShowCollectionsSubmenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [linkTags, setLinkTags] = useState<LinkTag[]>([]);
  const [availableTags, setAvailableTags] = useState<LinkTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ 
    top: 0, 
    left: 0, 
    positionUp: false, 
    positionLeft: false 
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Load tags when tag input is opened
  React.useEffect(() => {
    if (showTagInput) {
      loadTags();
    }
  }, [showTagInput, link.id]);

  const loadTags = async () => {
    setLoadingTags(true);
    try {
      const [linkTagsData, availableTagsData] = await Promise.all([
        storage.getLinkTags(link.id),
        storage.getUserTags()
      ]);
      
      setLinkTags(linkTagsData.map(tag => ({ ...tag, usageCount: 0 })));
      setAvailableTags(availableTagsData);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoadingTags(false);
    }
  };

  const handleTagsChange = async (newTags: LinkTag[]) => {
    try {
      const tagNames = newTags.map(tag => tag.name);
      const result = await storage.addTagsToLink(link.id, tagNames);
      
      if (result.success) {
        setLinkTags(newTags);
        // Refresh available tags to update usage counts
        const updatedTags = await storage.getUserTags();
        setAvailableTags(updatedTags);
        
        // Notify parent component that tags were updated
        onTagsUpdated();
        setShowTagInput(false);
      } else {
        console.error('Failed to update tags:', result.error);
      }
    } catch (error) {
      console.error('Failed to update link tags:', error);
    }
  };

  const handleOpenLink = () => {
    onOpenDetail(link);
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (onSelect) {
      onSelect(link.id);
    }
  };

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    console.log('Menu click detected, showMenu:', showMenu);
    e.preventDefault();
    e.stopPropagation();
    
    if (!showMenu) {
      // Check if the dropdown would overflow the viewport or sidebar content area
      const buttonRect = e.currentTarget.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 240; // Approximate height
      
      // Find the sidebar content container to check for overflow
      const sidebarContent = document.querySelector('.content');
      const sidebarRect = sidebarContent?.getBoundingClientRect();
      
      // Determine if we need special positioning classes
      let shouldPositionUp = buttonRect.bottom + dropdownHeight > viewportHeight;
      
      // Also check if we'd overflow the sidebar content area
      if (sidebarRect) {
        shouldPositionUp = shouldPositionUp || (buttonRect.bottom + dropdownHeight > sidebarRect.bottom);
      }
      
      // Check if dropdown would overflow right edge - if so, position it to the left of the button
      const dropdownWidth = 200; // Approximate dropdown width
      const shouldPositionLeft = buttonRect.right + dropdownWidth > window.innerWidth;
      
      // Set CSS classes for positioning instead of manual coordinates
      setMenuPosition({ 
        top: 0, 
        left: 0, 
        positionUp: shouldPositionUp,
        positionLeft: shouldPositionLeft 
      });
      
      setShowMenu(true);
      setShowCollectionsSubmenu(false);
      console.log('Menu opened');
    } else {
      setShowMenu(false);
      setShowCollectionsSubmenu(false);
      console.log('Menu closed');
    }
  };

  const handleMoveToCollection = (collectionId: string) => {
    onMoveFromInbox(link.id, collectionId);
    setShowMenu(false);
  };

  const handleArchive = () => {
    onMoveFromInbox(link.id); // Move to general without specific collection
    setShowMenu(false);
  };

  const handleDelete = () => {
    onDelete(link.id);
    setShowMenu(false);
  };

  const handleAddNote = () => {
    onAddNote(link);
    setShowMenu(false);
  };

  const handleTagsClick = () => {
    setShowTagInput(true);
    setShowMenu(false);
  };

  const handleAISuggestionsClick = async () => {
    setShowMenu(false);
    
    if (!aiAnalysis) {
      setIsAnalyzing(true);
      try {
        // Request AI analysis from background script
        const response = await chrome.runtime.sendMessage({ action: 'analyzePageWithAI' });
        if (response.success && response.analysis) {
          setAiAnalysis(response.analysis);
          setShowAISuggestions(true);
        } else {
          console.error('Failed to get AI analysis:', response.error);
        }
      } catch (error) {
        console.error('Error requesting AI analysis:', error);
      } finally {
        setIsAnalyzing(false);
      }
    } else {
      setShowAISuggestions(true);
    }
  };

  const handleAITagsApproved = async (tags: string[]) => {
    try {
      const result = await storage.addTagsToLink(link.id, tags);
      if (result.success) {
        onTagsUpdated();
      }
    } catch (error) {
      console.error('Failed to apply AI tags:', error);
    }
  };

  const handleAICategoryApproved = async (category: string) => {
    try {
      await onUpdate(link.id, { category });
    } catch (error) {
      console.error('Failed to apply AI category:', error);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDomainColor = (domain: string) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < domain.length; i++) {
      hash = domain.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Check if the click is on a dropdown button or inside a dropdown menu
      const isDropdownButton = target.closest('.action-button-compact, .inbox-card-menu-button');
      const isDropdownMenu = target.closest('.dropdown-menu');
      
      if (!isDropdownButton && !isDropdownMenu) {
        setShowMenu(false);
        setShowCollectionsSubmenu(false);
      }
    };

    if (showMenu) {
      // Add listener immediately but prevent immediate closing with a flag
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside, true); // Use capture phase
      }, 10); // Reduced timeout for better responsiveness
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside, true);
      };
    }
  }, [showMenu]);

  // Also close menu when other menus open
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowMenu(false);
        setShowCollectionsSubmenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showMenu]);

  return (
    <div className={`inbox-card ${isSelected ? 'selected' : ''} ${compactView ? 'compact' : ''}`}>
      {compactView ? (
        // Compact View: Just checkbox, title and category in a row
        <div className="inbox-card-compact">
          <div className="inbox-card-checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
              aria-label={`Select ${link.title}`}
              title={`Select ${link.title}`}
            />
          </div>
          <div className="inbox-card-compact-main" onClick={handleOpenLink}>
            <div className="inbox-card-compact-title">
              {link.title}
            </div>
            <div className="inbox-card-compact-meta">
              <span className="link-domain">{link.domain}</span>
              <span className="category-badge-compact"
                style={{ backgroundColor: getDomainColor(link.domain) }}>
                {link.category || 'general'}
              </span>
            </div>
          </div>
          <div className="inbox-card-compact-actions">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="action-button-compact"
              title="Open link"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
            <div className="dropdown" ref={compactView ? dropdownRef : undefined}>
              <button
                onClick={handleMenuClick}
                className="action-button-compact"
                title="More options"
              >
                <MoreVertical size={14} />
              </button>
              {showMenu && (
                <div className={`dropdown-menu ${menuPosition.positionUp ? 'position-up' : ''} ${menuPosition.positionLeft ? 'position-left' : ''}`}>
                  <button
                    onClick={handleAISuggestionsClick}
                    className="dropdown-menu-item"
                    disabled={isAnalyzing}
                  >
                    <Sparkles size={14} />
                    {isAnalyzing ? 'Analyzing...' : 'AI Suggestions'}
                  </button>
                  <button
                    onClick={handleTagsClick}
                    className="dropdown-menu-item"
                  >
                    <TagIcon size={14} />
                    <span>Add Tags</span>
                  </button>
                  <button
                    onClick={handleAddNote}
                    className="dropdown-menu-item"
                  >
                    <Edit3 size={14} />
                    <span>Add Note</span>
                  </button>
                  <button
                    onClick={handleArchive}
                    className="dropdown-menu-item"
                  >
                    <Archive size={14} />
                    <span>Archive</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    className="dropdown-menu-item delete-action"
                  >
                    <Trash2 size={14} />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // Normal View: Full layout as before
        <div className="inbox-card-content">
          <div className="inbox-card-checkbox">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleCheckboxChange(e.target.checked)}
              aria-label={`Select ${link.title}`}
              title={`Select ${link.title}`}
            />
          </div>

          <div className="inbox-card-main-content">
            <div className="inbox-card-favicon">
              {link.favicon ? (
                <img 
                  src={link.favicon} 
                  alt="" 
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const placeholder = target.nextElementSibling as HTMLElement;
                    if (placeholder) placeholder.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className="favicon-placeholder" 
                style={{
                  backgroundColor: getDomainColor(link.domain),
                  display: link.favicon ? 'none' : 'flex'
                }}
              >
                {link.domain.charAt(0).toUpperCase()}
              </div>
            </div>

            <div className="inbox-card-body">
              <div className="inbox-card-header">
                <div className="inbox-card-title-section">
                  <h3 className="inbox-card-title" onClick={handleOpenLink}>
                    {link.title}
                  </h3>
                  <div className="inbox-card-domain">
                    {link.domain} • {formatDate(link.createdAt)}
                  </div>
                </div>

                <div className="inbox-card-actions">
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inbox-card-link"
                    title="Open link"
                  >
                    <ExternalLink size={14} />
                  </a>

                  <div className="inbox-card-menu-container dropdown" ref={!compactView ? dropdownRef : undefined}>
                    <button
                      onClick={handleMenuClick}
                      className="inbox-card-menu-button"
                      title="More options"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {showMenu && (
                      <div className={`dropdown-menu ${menuPosition.positionUp ? 'position-up' : ''} ${menuPosition.positionLeft ? 'position-left' : ''}`}>
                        <button
                          onClick={handleAISuggestionsClick}
                          className="dropdown-menu-item"
                          disabled={isAnalyzing}
                        >
                          <Sparkles size={14} />
                          {isAnalyzing ? 'Analyzing...' : 'AI Suggestions'}
                        </button>
                        
                        <button
                          onClick={handleTagsClick}
                          className="dropdown-menu-item"
                        >
                          <TagIcon size={14} />
                          <span>Add Tags</span>
                        </button>

                        <button
                          onClick={handleAddNote}
                          className="dropdown-menu-item"
                        >
                          <Edit3 size={14} />
                          <span>Add Note</span>
                        </button>

                        <div className="dropdown-submenu-container">
                          <button
                            onClick={() => setShowCollectionsSubmenu(!showCollectionsSubmenu)}
                            className="dropdown-menu-item"
                          >
                            <FolderPlus size={14} />
                            <span>Move to Collection</span>
                          </button>

                          {showCollectionsSubmenu && (
                            <div className="dropdown-menu submenu">
                              <div className="submenu-header">
                                <span>Collections</span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowCollectionsSubmenu(false);
                                  }}
                                  className="submenu-close"
                                  title="Close"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              {collections.length > 0 ? (
                                collections.map((collection) => (
                                  <button
                                    key={collection.id}
                                    onClick={() => handleMoveToCollection(collection.id)}
                                    className="dropdown-menu-item"
                                  >
                                    {collection.name}
                                  </button>
                                ))
                              ) : (
                                <div className="submenu-empty">
                                  No collections
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <button
                          onClick={handleArchive}
                          className="dropdown-menu-item"
                        >
                          <Archive size={14} />
                          <span>Archive</span>
                        </button>

                        <button
                          onClick={handleDelete}
                          className="dropdown-menu-item delete-action"
                        >
                          <Trash2 size={14} />
                          <span>Delete</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="inbox-card-footer">
                {/* AI Suggestions */}
                {showAISuggestions && aiAnalysis && (
                  <AISuggestions
                    analysis={aiAnalysis}
                    onTagsApproved={handleAITagsApproved}
                    onCategoryApproved={handleAICategoryApproved}
                    onClose={() => setShowAISuggestions(false)}
                    isLoading={isAnalyzing}
                  />
                )}

                {/* Highlights */}
                {link.highlights && link.highlights.length > 0 && (
                  <div className="inbox-card-highlights">
                    <button
                      onClick={() => setShowHighlights(!showHighlights)}
                      className="highlights-toggle"
                      title={`${showHighlights ? 'Hide' : 'Show'} highlights`}
                      aria-label={`${showHighlights ? 'Hide' : 'Show'} ${link.highlights.length} highlight${link.highlights.length !== 1 ? 's' : ''}`}
                    >
                      <span>🔗 {link.highlights.length} highlight{link.highlights.length !== 1 ? 's' : ''}</span>
                      <span className={`highlights-chevron ${showHighlights ? 'expanded' : ''}`}>
                        ▼
                      </span>
                    </button>

                    {showHighlights && (
                      <div className="inbox-highlights-list" style={{ padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {link.highlights.map((highlight) => (
                          <HighlightCard
                            key={highlight.id}
                            highlight={highlight}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {link.aiSummary && (
                  <div className="inbox-card-summary">
                    <p>{link.aiSummary}</p>
                  </div>
                )}

                {link.userNote && (
                  <div className="inbox-card-note">
                    <p>{link.userNote}</p>
                  </div>
                )}

                {showTagInput && (
                  <div className="inbox-card-tags">
                    <div className="tag-editor-header">
                      <span>Edit Tags</span>
                      <button 
                        onClick={() => setShowTagInput(false)}
                        className="tag-editor-close"
                        title="Close tag editor"
                      >
                        &times;
                      </button>
                    </div>
                    {loadingTags ? (
                      <div className="tag-editor-loading">Loading tags...</div>
                    ) : (
                      <TagInput
                        selectedTags={linkTags}
                        availableTags={availableTags}
                        onTagsChange={handleTagsChange}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InboxCard; 