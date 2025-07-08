import React, { useState, useEffect } from 'react';
import { 
  X, 
  ExternalLink, 
  Clock, 
  Tag as TagIcon, 
  Globe, 
  Edit3, 
  Copy,
  Check,
  Star,
  Bookmark,
  Calendar,
  User
} from 'lucide-react';
import { SavedLink, Collection } from '../../types';
import { storage } from '../../utils/storage';

interface LinkDetailModalProps {
  link: SavedLink;
  collections: Collection[];
  onClose: () => void;
  onUpdate: (linkId: string, updates: Partial<SavedLink>) => void;
  onDelete: (linkId: string) => void;
  onAddNote: (link: SavedLink) => void;
}

const LinkDetailModal: React.FC<LinkDetailModalProps> = ({
  link,
  collections,
  onClose,
  onUpdate,
  onDelete,
  onAddNote
}) => {
  const [linkTags, setLinkTags] = useState<any[]>([]);
  const [copied, setCopied] = useState(false);
  const [collection, setCollection] = useState<Collection | null>(null);

  useEffect(() => {
    loadLinkTags();
    loadCollection();
  }, [link.id]);

  const loadLinkTags = async () => {
    try {
      const tags = await storage.getLinkTags(link.id);
      setLinkTags(tags);
    } catch (error) {
      console.error('Failed to load link tags:', error);
    }
  };

  const loadCollection = () => {
    if (link.collectionId) {
      const foundCollection = collections.find(c => c.id === link.collectionId);
      setCollection(foundCollection || null);
    } else {
      setCollection(null);
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const handleOpenLink = () => {
    chrome.tabs.create({ url: link.url });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTagColor = (tagName: string) => {
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
    let hash = 0;
    for (let i = 0; i < tagName.length; i++) {
      hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content link-detail-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="link-detail-header">
            <div className="link-detail-favicon">
              {link.favicon ? (
                <img src={link.favicon} alt="" width="24" height="24" />
              ) : (
                <div className="favicon-placeholder">
                  <Globe size={16} />
                </div>
              )}
            </div>
            <div className="link-detail-title-section">
              <h2 className="modal-title">{link.title}</h2>
              <div className="link-detail-domain">{link.domain}</div>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-button" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {/* URL Section */}
          <div className="link-detail-section">
            <div className="link-detail-section-header">
              <ExternalLink size={16} />
              <span>URL</span>
            </div>
            <div className="link-detail-url-container">
              <input
                type="text"
                value={link.url}
                readOnly
                className="link-detail-url"
                title="Link URL"
              />
              <div className="link-detail-url-actions">
                <button
                  onClick={handleCopyUrl}
                  className={`action-button ${copied ? 'copied' : ''}`}
                  title="Copy URL"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                </button>
                <button
                  onClick={handleOpenLink}
                  className="action-button primary"
                  title="Open link"
                >
                  <ExternalLink size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Metadata Section */}
          <div className="link-detail-section">
            <div className="link-detail-section-header">
              <Calendar size={16} />
              <span>Information</span>
            </div>
            <div className="link-detail-metadata">
              <div className="metadata-item">
                <Clock size={14} />
                <span>Added {formatDate(link.createdAt)}</span>
              </div>
              {collection && (
                <div className="metadata-item">
                  <Bookmark size={14} />
                  <span>In collection: {collection.name}</span>
                </div>
              )}
              {link.category && (
                <div className="metadata-item">
                  <Star size={14} />
                  <span>Category: {link.category}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tags Section */}
          {linkTags.length > 0 && (
            <div className="link-detail-section">
              <div className="link-detail-section-header">
                <TagIcon size={16} />
                <span>Tags</span>
              </div>
              <div className="link-detail-tags">
                {linkTags.map((tag) => (
                  <span 
                    key={tag.id || tag.name}
                    className="link-detail-tag"
                    style={{ backgroundColor: getTagColor(tag.name) }}
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Note Section */}
          {link.userNote && (
            <div className="link-detail-section">
              <div className="link-detail-section-header">
                <Edit3 size={16} />
                <span>Your Note</span>
              </div>
              <div className="link-detail-note">
                <p>{link.userNote}</p>
              </div>
            </div>
          )}

          {/* AI Summary Section */}
          {link.aiSummary && (
            <div className="link-detail-section">
              <div className="link-detail-section-header">
                <User size={16} />
                <span>AI Summary</span>
              </div>
              <div className="link-detail-summary">
                <p>{link.aiSummary}</p>
              </div>
            </div>
          )}

          {/* Highlights Section */}
          {link.highlights && link.highlights.length > 0 && (
            <div className="link-detail-section">
              <div className="link-detail-section-header">
                <Star size={16} />
                <span>Highlights ({link.highlights.length})</span>
              </div>
              <div className="link-detail-highlights">
                {link.highlights.map((highlight) => (
                  <div key={highlight.id} className="highlight-item">
                    <div className="highlight-text">"{highlight.text}"</div>
                    {highlight.userNote && (
                      <div className="highlight-note">{highlight.userNote}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            onClick={() => onAddNote(link)} 
            className="modal-button"
          >
            <Edit3 size={16} />
            {link.userNote ? 'Edit Note' : 'Add Note'}
          </button>
          <button 
            onClick={handleOpenLink} 
            className="modal-button primary"
          >
            <ExternalLink size={16} />
            Open Link
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkDetailModal; 