import React, { useState } from 'react';
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
  onSelect
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCollectionsSubmenu, setShowCollectionsSubmenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleOpenLink = () => {
    chrome.tabs.create({ url: link.url });
  };

  const handleCheckboxChange = (checked: boolean) => {
    if (onSelect) {
      onSelect(link.id);
    }
  };

  const handleMenuClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowMenu(!showMenu);
    setShowCollectionsSubmenu(false);
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
    const handleClickOutside = () => {
      setShowMenu(false);
      setShowCollectionsSubmenu(false);
    };

    if (showMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showMenu]);

  return (
    <div className={`inbox-card ${isSelected ? 'selected' : ''}`}>
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

                <div className="inbox-card-menu-container dropdown">
                  <button
                    onClick={handleMenuClick}
                    className="inbox-card-menu-button"
                    title="More options"
                  >
                    <MoreVertical size={14} />
                  </button>

                  {showMenu && (
                    <div className="dropdown-menu">
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
                  <TagInput
                    linkId={link.id}
                    onTagsUpdated={() => {
                      onTagsUpdated();
                      setShowTagInput(false);
                    }}
                    onCancel={() => setShowTagInput(false)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InboxCard; 