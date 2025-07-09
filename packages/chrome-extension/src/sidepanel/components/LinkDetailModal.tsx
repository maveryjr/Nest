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
                <img src={link.favicon} alt="" width="32" height="32" />
              ) : (
                <div className="favicon-placeholder">
                  <Globe size={20} />
                </div>
              )}
            </div>
            <div className="link-detail-title-section">
              <h2 className="modal-title">{link.title}</h2>
              <a href={link.url} target="_blank" rel="noopener noreferrer" className="link-detail-domain">
                {link.domain} <ExternalLink size={14} />
              </a>
            </div>
          </div>
          <button onClick={onClose} className="modal-close-button" title="Close">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div className="link-detail-main-content">
            <div className="link-detail-left-column">
              {/* Note Section */}
              <div className="link-detail-card">
                <div className="link-detail-section-header">
                  <Edit3 size={16} />
                  <span>Your Note</span>
                </div>
                {link.userNote ? (
                  <div className="link-detail-note">
                    <p>{link.userNote}</p>
                  </div>
                ) : (
                  <div className="no-note-placeholder">
                    <p>You haven't added a note to this link yet.</p>
                    <button onClick={() => onAddNote(link)} className="button-subtle">
                      Add a note
                    </button>
                  </div>
                )}
              </div>

              {/* AI Summary Section */}
              {link.aiSummary && (
                <div className="link-detail-card">
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
                <div className="link-detail-card">
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
            <div className="link-detail-right-column">
              {/* Actions */}
              <div className="link-detail-card actions-card">
                <button onClick={handleOpenLink} className="action-button primary" title="Open link in new tab">
                  <ExternalLink size={16} />
                  <span>Open Link</span>
                </button>
                <button onClick={handleCopyUrl} className={`action-button ${copied ? 'copied' : ''}`} title="Copy URL">
                  {copied ? <Check size={16} /> : <Copy size={16} />}
                  <span>{copied ? 'Copied!' : 'Copy URL'}</span>
                </button>
              </div>

              {/* Metadata Section */}
              <div className="link-detail-card">
                <div className="link-detail-section-header">
                  <Calendar size={16} />
                  <span>Information</span>
                </div>
                <div className="link-detail-metadata">
                  <div className="metadata-item">
                    <Clock size={14} />
                    <span><strong>Added:</strong> {formatDate(link.createdAt)}</span>
                  </div>
                  {collection && (
                    <div className="metadata-item">
                      <Bookmark size={14} />
                      <span><strong>Collection:</strong> {collection.name}</span>
                    </div>
                  )}
                  {link.category && (
                    <div className="metadata-item">
                      <Star size={14} />
                      <span><strong>Category:</strong> {link.category}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags Section */}
              {linkTags.length > 0 && (
                <div className="link-detail-card">
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
            </div>
          </div>
        </div>
        {/* Footer is removed as actions are now in the right column */}
      </div>
      <style>{`
        .link-detail-modal {
          max-width: 800px;
          width: 90vw;
        }
        .link-detail-header {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .link-detail-favicon {
          flex-shrink: 0;
        }
        .link-detail-favicon img {
          border-radius: 4px;
        }
        .link-detail-favicon .favicon-placeholder {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          background-color: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
        }
        .link-detail-title-section .modal-title {
          font-size: 1.4rem;
          margin-bottom: 4px;
        }
        .link-detail-domain {
          font-size: 0.9rem;
          color: #666;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          text-decoration: none;
        }
        .link-detail-domain:hover {
          text-decoration: underline;
        }
        .link-detail-main-content {
          display: flex;
          gap: 24px;
        }
        .link-detail-left-column {
          flex: 2;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .link-detail-right-column {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .link-detail-card {
          background-color: #f9f9f9;
          border-radius: 8px;
          padding: 16px;
          border: 1px solid #eee;
        }
        .dark-mode .link-detail-card {
            background-color: #2a2a2e;
            border-color: #3a3a3e;
        }
        .link-detail-section-header {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          margin-bottom: 12px;
          font-size: 1rem;
        }
        .actions-card {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .actions-card .action-button {
          width: 100%;
          justify-content: center;
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 10px;
          font-size: 0.9rem;
        }
        .link-detail-metadata .metadata-item {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.9rem;
        }
        .link-detail-metadata .metadata-item:last-child {
          margin-bottom: 0;
        }
        .link-detail-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .link-detail-tag {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.8rem;
          color: white;
          font-weight: 500;
        }
        .link-detail-note, .link-detail-summary {
          font-size: 0.9rem;
          line-height: 1.6;
        }
        .no-note-placeholder {
          text-align: center;
          padding: 20px;
          color: #666;
        }
        .button-subtle {
          background: none;
          border: none;
          color: #3b82f6;
          cursor: pointer;
          padding: 4px;
          font-weight: 600;
        }
        .button-subtle:hover {
          text-decoration: underline;
        }
        .highlight-item {
          margin-bottom: 16px;
          padding-left: 12px;
          border-left: 3px solid #f59e0b;
        }
        .highlight-text {
          font-style: italic;
          color: #333;
        }
        .dark-mode .highlight-text {
            color: #ccc;
        }
        .highlight-note {
          margin-top: 4px;
          font-size: 0.85rem;
          color: #555;
        }
        .dark-mode .highlight-note {
            color: #aaa;
        }
      `}</style>
    </div>
  );
};

export default LinkDetailModal; 