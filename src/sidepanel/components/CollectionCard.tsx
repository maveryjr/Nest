import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, Share2, Globe } from 'lucide-react';
import { Collection, SavedLink } from '../../types';
import LinkCard from './LinkCard';
import ShareModal from './ShareModal';

interface CollectionCardProps {
  collection: Collection;
  links: SavedLink[];
  onUpdateLink: (linkId: string, updates: Partial<SavedLink>) => void;
  onDeleteLink: (linkId: string) => void;
  onAddNote: (link: SavedLink) => void;
  onTagsUpdated?: () => void;
  onUpdate?: () => void; // Callback for when collection is updated
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  links,
  onUpdateLink,
  onDeleteLink,
  onAddNote,
  onTagsUpdated,
  onUpdate
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleMoveToCollection = async (linkId: string, collectionId: string) => {
    await onUpdateLink(linkId, { collectionId: collectionId || undefined });
  };

  const handleShareCollection = () => {
    setShowShareModal(true);
  };

  const handleShareModalClose = () => {
    setShowShareModal(false);
  };

  const handleCollectionUpdate = () => {
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <>
      <div className={`collection-card ${isExpanded ? 'expanded' : ''}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="collection-header"
        >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <Folder size={16} className="collection-icon" />
          <div className="collection-info">
            <div className="collection-name-row">
              <span className="collection-name">{collection.name}</span>
              {collection.isPublic && (
                <div className="public-indicator" title="This collection is public">
                  <Globe size={12} />
                </div>
              )}
            </div>
            {collection.description && (
              <span className="collection-description">{collection.description}</span>
            )}
          </div>
          <div className="collection-actions">
            <span className="collection-count">{links.length}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleShareCollection();
              }}
              className="action-button share-collection-button"
              title="Share collection"
            >
              <Share2 size={14} />
            </button>
          </div>
        </button>

        {isExpanded && (
          <div className="collection-content">
            {links.length === 0 ? (
              <div className="empty-collection">
                <p>No links in this collection</p>
              </div>
            ) : (
              links.map(link => (
                <LinkCard
                  key={link.id}
                  link={link}
                  collections={[]} // Collections not needed for collection view
                  onUpdate={onUpdateLink}
                  onDelete={onDeleteLink}
                  onMoveToCollection={handleMoveToCollection}
                  onAddNote={onAddNote}
                  onTagsUpdated={onTagsUpdated}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          collection={collection}
          onClose={handleShareModalClose}
          onUpdate={handleCollectionUpdate}
        />
      )}
    </>
  );
};

export default CollectionCard; 