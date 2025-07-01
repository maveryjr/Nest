import React, { useState } from 'react';
import { X } from 'lucide-react';
import { SavedLink } from '../../types';

interface AddNoteModalProps {
  link: SavedLink;
  onSave: (note: string) => void;
  onClose: () => void;
}

const AddNoteModal: React.FC<AddNoteModalProps> = ({ link, onSave, onClose }) => {
  const [note, setNote] = useState(link.userNote || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(note);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Note</h2>
          <button onClick={onClose} className="close-button" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="link-preview">
            <div className="link-preview-favicon">
              {link.favicon ? (
                <img src={link.favicon} alt="" width="16" height="16" />
              ) : (
                <div className="favicon-placeholder">
                  {link.domain.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="link-preview-info">
              <div className="link-preview-title">{link.title}</div>
              <div className="link-preview-url">{link.domain}</div>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="note">Note:</label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about why you saved this link..."
                rows={4}
                autoFocus
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="button-secondary">
                Cancel
              </button>
              <button type="submit" className="button-primary">
                Save Note
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddNoteModal; 