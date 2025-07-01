import React, { useState } from 'react';
import { ExternalLink, Edit3, Trash2, FolderPlus, MoreHorizontal } from 'lucide-react';
import { SavedLink, Collection } from '../../types';

interface LinkCardProps {
  link: SavedLink;
  collections: Collection[];
  onUpdate: (linkId: string, updates: Partial<SavedLink>) => void;
  onDelete: (linkId: string) => void;
  onMoveToCollection: (linkId: string, collectionId: string) => void;
  onAddNote: (link: SavedLink) => void;
}

const LinkCard: React.FC<LinkCardProps> = ({
  link,
  collections,
  onUpdate,
  onDelete,
  onMoveToCollection,
  onAddNote
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showCollections, setShowCollections] = useState(false);

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