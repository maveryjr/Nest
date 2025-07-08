import React from 'react';
import { SavedLink, Collection } from '../../types';
import LinkCard from './LinkCard';

interface SearchResultCardProps {
  link: SavedLink;
  collections: Collection[];
  onUpdate: (linkId: string, updates: Partial<SavedLink>) => void;
  onDelete: (linkId: string) => void;
  onMoveToCollection: (linkId: string, collectionId: string) => void;
  onAddNote: (link: SavedLink) => void;
  onTagsUpdated?: () => void;
  compactView?: boolean;
}

const SearchResultCard: React.FC<SearchResultCardProps> = ({
  link,
  collections,
  onUpdate,
  onDelete,
  onMoveToCollection,
  onAddNote,
  onTagsUpdated,
  compactView = false
}) => {
  const formatSearchRank = (rank?: number) => {
    if (!rank) return '';
    return `${Math.round(rank * 100)}% match`;
  };

  return (
    <div className="search-result-card">
      {/* Search rank indicator */}
      {link.searchRank && (
        <div className="search-rank-indicator">
          {formatSearchRank(link.searchRank)}
        </div>
      )}
      
      {/* Search headline with highlighting */}
      {link.searchHeadline && (
        <div 
          className="search-headline"
          dangerouslySetInnerHTML={{ __html: link.searchHeadline }}
        />
      )}

      {/* Use LinkCard for consistent functionality including tags */}
      <LinkCard
        link={link}
        collections={collections}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onMoveToCollection={onMoveToCollection}
        onAddNote={onAddNote}
        onTagsUpdated={onTagsUpdated}
        compactView={compactView}
      />
    </div>
  );
};

export default SearchResultCard; 