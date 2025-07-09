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
          <h2 className="modal-title">Add Note</h2>
          <button onClick={onClose} className="modal-close-button" title="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="note">Your Note</label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note about why you saved this link..."
                rows={6}
                autoFocus
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="button">
              Cancel
            </button>
            <button type="submit" className="button primary">
              Save Note
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddNoteModal; 