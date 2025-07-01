import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Folder } from 'lucide-react';
import { Collection, SavedLink } from '../../types';
import LinkCard from './LinkCard';

interface CollectionCardProps {
  collection: Collection;
  links: SavedLink[];
  onUpdateLink: (linkId: string, updates: Partial<SavedLink>) => void;
  onDeleteLink: (linkId: string) => void;
  onAddNote: (link: SavedLink) => void;
}

const CollectionCard: React.FC<CollectionCardProps> = ({
  collection,
  links,
  onUpdateLink,
  onDeleteLink,
  onAddNote
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleMoveToCollection = async (linkId: string, collectionId: string) => {
    await onUpdateLink(linkId, { collectionId: collectionId || undefined });
  };

  return (
    <div className="collection-card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="collection-header"
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Folder size={16} className="collection-icon" />
        <div className="collection-info">
          <span className="collection-name">{collection.name}</span>
          {collection.description && (
            <span className="collection-description">{collection.description}</span>
          )}
        </div>
        <span className="collection-count">{links.length}</span>
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
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CollectionCard; 