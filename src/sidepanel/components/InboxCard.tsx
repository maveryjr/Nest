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
  Tag as TagIcon
} from 'lucide-react';
import { SavedLink, Collection } from '../../types';
import TagInput from './TagInput';

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
  const [showMoveMenu, setShowMoveMenu] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);

  const handleMoveToCollection = (collectionId: string) => {
    onMoveFromInbox(link.id, collectionId);
    setShowMoveMenu(false);
    setShowMenu(false);
  };

  const handleMoveToHoldingArea = () => {
    onMoveFromInbox(link.id);
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this link?')) {
      onDelete(link.id);
    }
    setShowMenu(false);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    if (onSelect && !showMenu && !showMoveMenu && !showTagInput) {
      e.preventDefault();
      onSelect(link.id);
    }
  };

  return (
    <div 
      className={`inbox-card ${isSelected ? 'selected' : ''}`} 
      onClick={handleCardClick}
      data-link-id={link.id}
    >
      <div className="inbox-card-content">
        <div className="inbox-card-header">
          <div className="inbox-card-checkbox">
            <input 
              type="checkbox" 
              checked={isSelected}
              onChange={() => onSelect?.(link.id)}
              onClick={(e) => e.stopPropagation()}
              aria-label={`Select ${link.title}`}
              title={`Select ${link.title}`}
            />
          </div>
          <img 
            src={link.favicon || `https://www.google.com/s2/favicons?domain=${link.domain}&sz=16`} 
            alt="favicon" 
            className="inbox-card-favicon"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = `https://www.google.com/s2/favicons?domain=${link.domain}&sz=16`;
            }}
          />
          <div className="inbox-card-title-section">
            <h3 className="inbox-card-title">{link.title}</h3>
            <span className="inbox-card-domain">{link.domain}</span>
          </div>
          <div className="inbox-card-actions">
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inbox-card-link"
              title="Open link"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
            <div className="inbox-card-menu-container">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="inbox-card-menu-button"
                title="More options"
              >
                <MoreVertical size={14} />
              </button>
              
              {showMenu && (
                <div className="inbox-card-menu">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMoveMenu(!showMoveMenu);
                    }}
                    className="inbox-card-menu-item"
                  >
                    <FolderPlus size={14} />
                    Move to Collection
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveToHoldingArea();
                    }}
                    className="inbox-card-menu-item"
                  >
                    <Archive size={14} />
                    Move to Holding Area
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddNote(link);
                      setShowMenu(false);
                    }}
                    className="inbox-card-menu-item"
                  >
                    <Edit3 size={14} />
                    {link.userNote ? 'Edit Note' : 'Add Note'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowTagInput(!showTagInput);
                      setShowMenu(false);
                    }}
                    className="inbox-card-menu-item"
                  >
                    <TagIcon size={14} />
                    Manage Tags
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete();
                    }}
                    className="inbox-card-menu-item delete"
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </div>
              )}

              {showMoveMenu && (
                <div className="inbox-card-submenu">
                  <div className="inbox-card-submenu-header">
                    <span>Move to Collection</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMoveMenu(false);
                      }}
                      className="inbox-card-submenu-close"
                      title="Close menu"
                      aria-label="Close menu"
                    >
                      <X size={12} />
                    </button>
                  </div>
                  {collections.length === 0 ? (
                    <div className="inbox-card-submenu-empty">
                      No collections available
                    </div>
                  ) : (
                    collections.map(collection => (
                      <button
                        key={collection.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToCollection(collection.id);
                        }}
                        className="inbox-card-submenu-item"
                      >
                        {collection.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

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
  );
};

export default InboxCard; 