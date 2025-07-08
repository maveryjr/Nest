import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Sparkles, RotateCcw, Settings } from 'lucide-react';
import { SmartCollection, SavedLink } from '../../types';
import LinkCard from './LinkCard';
import { storage } from '../../utils/storage';

interface SmartCollectionCardProps {
  smartCollection: SmartCollection;
  collections: any[]; // Regular collections for moving links
  onUpdateLink: (linkId: string, updates: Partial<SavedLink>) => void;
  onDeleteLink: (linkId: string) => void;
  onAddNote: (link: SavedLink) => void;
  onTagsUpdated?: () => void;
  compactView?: boolean;
}

const SmartCollectionCard: React.FC<SmartCollectionCardProps> = ({
  smartCollection,
  collections,
  onUpdateLink,
  onDeleteLink,
  onAddNote,
  onTagsUpdated,
  compactView = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [links, setLinks] = useState<SavedLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (isExpanded) {
      loadLinks();
    }
  }, [isExpanded, smartCollection.id]);

  const loadLinks = async () => {
    setLoading(true);
    try {
      const smartLinks = await storage.getSmartCollectionLinks(smartCollection.id);
      setLinks(smartLinks);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load smart collection links:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMoveToCollection = async (linkId: string, collectionId: string) => {
    await onUpdateLink(linkId, { collectionId: collectionId || undefined });
    // Refresh smart collection after moving link
    if (smartCollection.autoUpdate) {
      loadLinks();
    }
  };

  const handleRefresh = () => {
    loadLinks();
  };

  const getCollectionIcon = () => {
    return smartCollection.icon || '🔮';
  };

  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    const now = new Date();
    const diffMs = now.getTime() - lastUpdated.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className={`smart-collection-card ${isExpanded ? 'expanded' : ''}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="smart-collection-header"
      >
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="smart-collection-icon">{getCollectionIcon()}</span>
        <div className="smart-collection-info">
          <div className="smart-collection-name-row">
            <span className="smart-collection-name">{smartCollection.name}</span>
            <div className="smart-collection-badges">
              <Sparkles size={12} className="ai-badge" title="AI-Powered Collection" />
              {smartCollection.autoUpdate && (
                <div className="auto-update-badge" title="Auto-updating">
                  AUTO
                </div>
              )}
            </div>
          </div>
          <span className="smart-collection-description">{smartCollection.description}</span>
          {lastUpdated && (
            <span className="smart-collection-updated">Updated {formatLastUpdated()}</span>
          )}
        </div>
        <div className="smart-collection-actions">
          <span className="smart-collection-count">
            {loading ? '...' : links.length}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            className="action-button refresh-button"
            title="Refresh collection"
            disabled={loading}
          >
            <RotateCcw size={14} className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </button>

      {isExpanded && (
        <div className="smart-collection-content">
          {loading ? (
            <div className="smart-collection-loading">
              <div className="loading-spinner"></div>
              <span>Finding matching links...</span>
            </div>
          ) : links.length === 0 ? (
            <div className="empty-smart-collection">
              <Sparkles size={24} className="empty-icon" />
              <p>No matching links found</p>
              <span className="empty-subtitle">
                Links will appear here automatically when they match this collection's criteria
              </span>
            </div>
          ) : (
            <div className="smart-collection-links">
              {links.map(link => (
                <LinkCard
                  key={link.id}
                  link={link}
                  collections={collections}
                  onUpdate={onUpdateLink}
                  onDelete={onDeleteLink}
                  onMoveToCollection={handleMoveToCollection}
                  onAddNote={onAddNote}
                  onTagsUpdated={onTagsUpdated}
                  compactView={compactView}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartCollectionCard; 