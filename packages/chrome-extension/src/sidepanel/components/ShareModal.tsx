import React, { useState, useEffect } from 'react';
import { X, Link2, Copy, Eye, Globe, Lock, Check, ExternalLink } from 'lucide-react';
import { Collection } from '../../types';
import { storage } from '../../utils/storage';

interface ShareModalProps {
  collection: Collection;
  onClose: () => void;
  onUpdate: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ collection, onClose, onUpdate }) => {
  const [isPublic, setIsPublic] = useState(false);
  const [shareToken, setShareToken] = useState<string>('');
  const [viewCount, setViewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadSharingInfo();
  }, [collection.id]);

  const loadSharingInfo = async () => {
    try {
      const info = await storage.getCollectionSharingInfo(collection.id);
      if (info) {
        setIsPublic(info.isPublic);
        setShareToken(info.shareToken || '');
        setViewCount(info.viewCount);
      }
    } catch (error) {
      console.error('Failed to load sharing info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSharing = async () => {
    setUpdating(true);
    setMessage('');

    try {
      const result = await storage.toggleCollectionSharing(collection.id, !isPublic);
      
      if (result.success) {
        setIsPublic(!isPublic);
        if (result.shareToken) {
          setShareToken(result.shareToken);
        }
        setMessage(result.message);
        onUpdate(); // Refresh parent component
      } else {
        setMessage(result.message);
      }
    } catch (error) {
      setMessage('Failed to update sharing settings');
    } finally {
      setUpdating(false);
    }
  };

  const getShareUrl = () => {
    if (!shareToken) return '';
    // For now, we'll create a URL that opens in a new tab
    // In a real app, this would be your domain
    return `https://nest-shared.vercel.app/collection/${shareToken}`;
  };

  const handleCopyLink = async () => {
    const shareUrl = getShareUrl();
    if (!shareUrl) return;

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenShareUrl = () => {
    const shareUrl = getShareUrl();
    if (shareUrl) {
      chrome.tabs.create({ url: shareUrl });
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal share-modal">
          <div className="modal-header">
            <h2>Share Collection</h2>
            <button onClick={onClose} className="modal-close" title="Close">
              <X size={20} />
            </button>
          </div>
          <div className="modal-content">
            <div className="loading-spinner">Loading sharing settings...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal share-modal">
        <div className="modal-header">
          <h2>Share Collection</h2>
          <button onClick={onClose} className="modal-close" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-content">
          {/* Collection Info */}
          <div className="share-collection-info">
            <h3 className="collection-name">{collection.name}</h3>
            {collection.description && (
              <p className="collection-description">{collection.description}</p>
            )}
            <div className="collection-meta">
              <span>Created {formatDate(collection.createdAt)}</span>
            </div>
          </div>

          {/* Sharing Toggle */}
          <div className="share-toggle-section">
            <div className="share-toggle-header">
              <div className="share-status">
                {isPublic ? (
                  <>
                    <Globe size={20} className="status-icon public" />
                    <div>
                      <div className="status-title">Public Collection</div>
                      <div className="status-subtitle">Anyone with the link can view this collection</div>
                    </div>
                  </>
                ) : (
                  <>
                    <Lock size={20} className="status-icon private" />
                    <div>
                      <div className="status-title">Private Collection</div>
                      <div className="status-subtitle">Only you can see this collection</div>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={handleToggleSharing}
                disabled={updating}
                className={`toggle-button ${isPublic ? 'public' : 'private'}`}
              >
                {updating ? 'Updating...' : isPublic ? 'Make Private' : 'Make Public'}
              </button>
            </div>
          </div>

          {/* Share Link Section */}
          {isPublic && shareToken && (
            <div className="share-link-section">
              <div className="share-link-header">
                <Link2 size={16} />
                <span>Share Link</span>
              </div>
              
              <div className="share-link-container">
                <input
                  type="text"
                  value={getShareUrl()}
                  readOnly
                  className="share-link-input"
                  title="Share link URL"
                  aria-label="Share link URL"
                />
                <div className="share-link-actions">
                  <button
                    onClick={handleCopyLink}
                    className={`copy-button ${copied ? 'copied' : ''}`}
                    title="Copy link"
                  >
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                  <button
                    onClick={handleOpenShareUrl}
                    className="open-button"
                    title="Open in new tab"
                  >
                    <ExternalLink size={16} />
                  </button>
                </div>
              </div>

              {/* Analytics */}
              <div className="share-analytics">
                <div className="analytics-item">
                  <Eye size={16} />
                  <span>{viewCount} {viewCount === 1 ? 'view' : 'views'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Message */}
          {message && (
            <div className={`share-message ${message.includes('error') ? 'error' : 'success'}`}>
              {message}
            </div>
          )}

          {/* Info Box */}
          <div className="share-info-box">
            <h4>About Public Collections</h4>
            <ul>
              <li>Public collections can be viewed by anyone with the link</li>
              <li>Viewers don't need an account to see your collection</li>
              <li>Links, notes, summaries, and tags are included</li>
              <li>You can make collections private at any time</li>
              <li>View counts help you track sharing analytics</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="modal-button secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal; 