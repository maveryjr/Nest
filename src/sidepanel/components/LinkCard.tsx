import React, { useState, useEffect } from 'react';
import { ExternalLink, Edit3, Trash2, FolderPlus, MoreHorizontal, Tag } from 'lucide-react';
import { SavedLink, Collection, Highlight } from '../../types';
import TagInput from './TagInput';
import HighlightCard from './HighlightCard';
import { storage } from '../../utils/storage';

interface LinkTag {
  id: string;
  name: string;
  usageCount?: number;
}

interface LinkCardProps {
  link: SavedLink;
  collections: Collection[];
  onUpdate: (linkId: string, updates: Partial<SavedLink>) => void;
  onDelete: (linkId: string) => void;
  onMoveToCollection: (linkId: string, collectionId: string) => void;
  onAddNote: (link: SavedLink) => void;
  onTagsUpdated?: () => void; // Callback when tags are updated
  compactView?: boolean;
}

const LinkCard: React.FC<LinkCardProps> = ({
  link,
  collections,
  onUpdate,
  onDelete,
  onMoveToCollection,
  onAddNote,
  onTagsUpdated,
  compactView = false
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showHighlights, setShowHighlights] = useState(false);
  const [linkTags, setLinkTags] = useState<LinkTag[]>([]);
  const [availableTags, setAvailableTags] = useState<LinkTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Load tags when component mounts or when tag editor is opened
  useEffect(() => {
    if (showTagEditor) {
      loadTags();
    } else {
      loadLinkTags();
    }
  }, [showTagEditor, link.id]);

  const loadLinkTags = async () => {
    try {
      const tags = await storage.getLinkTags(link.id);
      setLinkTags(tags.map(tag => ({ ...tag, usageCount: 0 })));
    } catch (error) {
      console.error('Failed to load link tags:', error);
    }
  };

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
        if (onTagsUpdated) {
          onTagsUpdated();
        }
      } else {
        console.error('Failed to update tags:', result.error);
      }
    } catch (error) {
      console.error('Failed to update link tags:', error);
    }
  };

  const handleOpenLink = () => {
    chrome.tabs.create({ url: link.url });
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

  const getTagColor = (tagName: string): string => {
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', 
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const handleHighlightNoteAdd = async (highlightId: string, note: string) => {
    try {
      const updatedHighlights = (link.highlights || []).map(h => 
        h.id === highlightId ? { ...h, userNote: note, updatedAt: new Date() } : h
      );
      await storage.updateLink(link.id, { highlights: updatedHighlights });
      onUpdate(link.id, { highlights: updatedHighlights });
    } catch (error) {
      console.error('Failed to update highlight note:', error);
    }
  };

  const handleHighlightDelete = async (highlightId: string) => {
    try {
      const updatedHighlights = (link.highlights || []).filter(h => h.id !== highlightId);
      await storage.updateLink(link.id, { highlights: updatedHighlights });
      onUpdate(link.id, { highlights: updatedHighlights });
    } catch (error) {
      console.error('Failed to delete highlight:', error);
    }
  };

  const handleMenuToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (!showMenu) {
      const rect = e.currentTarget.getBoundingClientRect();
      setMenuPosition({
        top: rect.bottom + 4,
        left: rect.right - 180 // Align right edge of menu with button
      });
    }
    setShowMenu(!showMenu);
  };

  return (
    <div className={`link-card ${compactView ? 'compact' : ''}`}>
      {compactView ? (
        // Compact View: Just title and category
        <div className="link-card-compact">
          <div className="link-card-compact-main" onClick={handleOpenLink}>
            <div className="link-card-compact-title">
              {link.title}
            </div>
            <div className="link-card-compact-meta">
              <span className="link-domain">{link.domain}</span>
              <span className="category-badge-compact"
                style={{ backgroundColor: getCategoryColor(link.category) }}>
                {link.category}
              </span>
              {linkTags.length > 0 && (
                <div className="link-tags-compact">
                  {linkTags.slice(0, 3).map((tag) => (
                    <span 
                      key={tag.id || tag.name}
                      className="link-tag-compact"
                      style={{ backgroundColor: getTagColor(tag.name) }}
                    >
                      {tag.name}
                    </span>
                  ))}
                  {linkTags.length > 3 && (
                    <span className="tag-count">+{linkTags.length - 3}</span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="link-card-compact-actions">
            <button 
              onClick={(e) => { e.stopPropagation(); handleOpenLink(); }}
              className="action-button-compact"
              title="Open link"
            >
              <ExternalLink size={14} />
            </button>
            <div className="dropdown">
              <button
                onClick={handleMenuToggle}
                className="action-button-compact"
                title="More options"
              >
                <MoreHorizontal size={14} />
              </button>
              {showMenu && (
                <div className="dropdown-menu" style={{ top: menuPosition.top, left: menuPosition.left }}>
                  <button onClick={() => {
                    onAddNote(link);
                    setShowMenu(false);
                  }} className="dropdown-menu-item">
                    <Edit3 size={14} />
                    <span>Edit note</span>
                  </button>
                  <button onClick={() => {
                    setShowTagEditor(!showTagEditor);
                    setShowMenu(false);
                  }} className="dropdown-menu-item">
                    <Tag size={14} />
                    <span>Edit tags</span>
                  </button>
                  <button onClick={() => {
                    setShowCollections(!showCollections);
                    setShowMenu(false);
                  }} className="dropdown-menu-item">
                    <FolderPlus size={14} />
                    <span>Move to collection</span>
                  </button>
                  <button 
                    onClick={() => {
                      onDelete(link.id);
                      setShowMenu(false);
                    }}
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
        <>
          <div className="link-card-header">
            <div className="link-card-favicon">
              {link.favicon ? (
                <img src={link.favicon} alt="" width="24" height="24" />
              ) : (
                <div 
                  className="favicon-placeholder"
                  style={{ backgroundColor: getDomainColor(link.domain) }}
                >
                  {link.domain.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="link-card-main">
              <div className="link-card-info-header">
                <div className="link-card-title-section">
                  <h3 className="link-card-title" onClick={handleOpenLink} title={link.title}>
                    {link.title}
                  </h3>
                  <div className="link-meta">
                    <span className="link-domain">{link.domain}</span>
                    <span className="link-date">{formatDate(link.createdAt)}</span>
                  </div>
                </div>
                <div className="link-actions">
                  <button 
                    onClick={handleOpenLink}
                    className="action-button"
                    title="Open link"
                  >
                    <ExternalLink size={14} />
                  </button>
                  <div className="dropdown">
                    <button
                      onClick={handleMenuToggle}
                      className="action-button"
                      title="More options"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {showMenu && (
                      <div className="dropdown-menu" style={{ top: menuPosition.top, left: menuPosition.left }}>
                        <button onClick={() => {
                          onAddNote(link);
                          setShowMenu(false);
                        }} className="dropdown-menu-item">
                          <Edit3 size={14} />
                          <span>Edit note</span>
                        </button>
                        <button onClick={() => {
                          setShowTagEditor(!showTagEditor);
                          setShowMenu(false);
                        }} className="dropdown-menu-item">
                          <Tag size={14} />
                          <span>Edit tags</span>
                        </button>
                        {link.highlights && link.highlights.length > 0 && (
                          <button onClick={() => {
                            setShowHighlights(!showHighlights);
                            setShowMenu(false);
                          }} className="dropdown-menu-item">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" xmlns="http://www.w3.org/2000/svg">
                              <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                            </svg>
                            <span>{showHighlights ? 'Hide' : 'Show'} highlights ({link.highlights.length})</span>
                          </button>
                        )}
                        <button onClick={() => {
                          setShowCollections(!showCollections);
                          setShowMenu(false);
                        }} className="dropdown-menu-item">
                          <FolderPlus size={14} />
                          <span>Move to collection</span>
                        </button>
                        <button 
                          onClick={() => {
                            onDelete(link.id);
                            setShowMenu(false);
                          }}
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

              {/* Collapsible content area */}
              <div className="link-card-body">
                {showCollections && (
                  <div className="collections-menu">
                    <div className="collections-header">Move to:</div>
                    {collections.map(collection => (
                      <button
                        key={collection.id}
                        onClick={() => {
                          onMoveToCollection(link.id, collection.id);
                          setShowCollections(false);
                        }}
                        className="collection-option"
                      >
                        {collection.name}
                      </button>
                    ))}
                    <button
                      onClick={() => {
                        onMoveToCollection(link.id, '');
                        setShowCollections(false);
                      }}
                      className="collection-option"
                    >
                      Remove from collection
                    </button>
                  </div>
                )}

                {showTagEditor && (
                  <div className="tag-editor">
                    <div className="tag-editor-header">
                      <span>Edit Tags</span>
                      <button 
                        onClick={() => setShowTagEditor(false)}
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
                        linkId={link.id}
                        onTagsUpdated={() => {
                          loadLinkTags();
                          if (onTagsUpdated) onTagsUpdated();
                          setShowTagEditor(false);
                        }}
                        onCancel={() => setShowTagEditor(false)}
                      />
                    )}
                  </div>
                )}

                {/* Display tags when not editing */}
                {!showTagEditor && linkTags.length > 0 && (
                  <div className="link-tags">
                    {linkTags.map((tag) => (
                      <span 
                        key={tag.id || tag.name}
                        className="link-tag"
                        title={`Filter by ${tag.name}`}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                )}

                {link.userNote && (
                  <div className="link-note">
                    <strong>Note:</strong> {link.userNote}
                  </div>
                )}

                {link.aiSummary && (
                  <div className="link-summary">
                    <strong>Summary:</strong> {link.aiSummary}
                  </div>
                )}

                <div className="link-category">
                  <span 
                    className="category-badge"
                    style={{ backgroundColor: getCategoryColor(link.category) }}
                  >
                    {link.category}
                  </span>
                </div>

                {/* Highlights Section */}
                {link.highlights && link.highlights.length > 0 && (
                  <div className="link-highlights-section">
                    <div className="highlights-header">
                      <button 
                        onClick={() => setShowHighlights(!showHighlights)}
                        className="highlights-toggle"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"/>
                        </svg>
                        <span>{link.highlights.length} highlight{link.highlights.length !== 1 ? 's' : ''}</span>
                        <svg 
                          width="12" 
                          height="12" 
                          viewBox="0 0 24 24" 
                          className={`highlights-chevron ${showHighlights ? 'expanded' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          strokeWidth="2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path d="m6 9 6 6 6-6"/>
                        </svg>
                      </button>
                    </div>
                    
                    {showHighlights && (
                      <div className="highlights-list">
                        {link.highlights.map((highlight) => (
                          <HighlightCard
                            key={highlight.id}
                            highlight={highlight}
                            onAddNote={handleHighlightNoteAdd}
                            onDelete={handleHighlightDelete}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

function getCategoryColor(category: string): string {
  const colorMap: { [key: string]: string } = {
    general: '#6b7280',
    work: '#3b82f6',
    personal: '#10b981',
    learning: '#f59e0b'
  };
  return colorMap[category] || '#6b7280';
}

export default LinkCard; 