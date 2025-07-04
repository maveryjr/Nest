import React, { useState, useEffect } from 'react';
import { ExternalLink, Edit3, Trash2, FolderPlus, MoreHorizontal, Tag } from 'lucide-react';
import { SavedLink, Collection } from '../../types';
import TagInput from './TagInput';
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
}

const LinkCard: React.FC<LinkCardProps> = ({
  link,
  collections,
  onUpdate,
  onDelete,
  onMoveToCollection,
  onAddNote,
  onTagsUpdated
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCollections, setShowCollections] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [linkTags, setLinkTags] = useState<LinkTag[]>([]);
  const [availableTags, setAvailableTags] = useState<LinkTag[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);

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

  return (
    <div className="link-card">
      <div className="link-header">
        <div className="link-favicon">
          {link.favicon ? (
            <img src={link.favicon} alt="" width="16" height="16" />
          ) : (
            <div 
              className="favicon-placeholder"
              style={{ backgroundColor: getDomainColor(link.domain) }}
            >
              {link.domain.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
        <div className="link-info">
          <h3 className="link-title" onClick={handleOpenLink} title={link.title}>
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
              onClick={() => setShowMenu(!showMenu)}
              className="action-button"
              title="More options"
            >
              <MoreHorizontal size={14} />
            </button>
            {showMenu && (
              <div className="dropdown-menu">
                <button onClick={() => {
                  onAddNote(link);
                  setShowMenu(false);
                }}>
                  <Edit3 size={14} />
                  Edit note
                </button>
                <button onClick={() => {
                  setShowTagEditor(!showTagEditor);
                  setShowMenu(false);
                }}>
                  <Tag size={14} />
                  Edit tags
                </button>
                <button onClick={() => {
                  setShowCollections(!showCollections);
                }}>
                  <FolderPlus size={14} />
                  Move to collection
                </button>
                <button 
                  onClick={() => {
                    onDelete(link.id);
                    setShowMenu(false);
                  }}
                  className="delete-action"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCollections && (
        <div className="collections-menu">
          <div className="collections-header">Move to:</div>
          {collections.map(collection => (
            <button
              key={collection.id}
              onClick={() => {
                onMoveToCollection(link.id, collection.id);
                setShowCollections(false);
                setShowMenu(false);
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
              setShowMenu(false);
            }}
            className="collection-option"
          >
            Remove from collection
          </button>
        </div>
      )}

      {/* Tag Editor */}
      {showTagEditor && (
        <div className="tag-editor">
          <div className="tag-editor-header">
            <span>Edit Tags</span>
            <button 
              onClick={() => setShowTagEditor(false)}
              className="tag-editor-close"
              title="Close tag editor"
            >
              ×
            </button>
          </div>
          {loadingTags ? (
            <div className="tag-editor-loading">Loading tags...</div>
          ) : (
            <TagInput
              selectedTags={linkTags}
              availableTags={availableTags}
              onTagsChange={handleTagsChange}
              placeholder="Add tags to organize this link..."
              maxTags={8}
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
              style={{ backgroundColor: getTagColor(tag.name) }}
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