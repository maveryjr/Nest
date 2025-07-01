import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CreateCollectionModalProps {
  onSave: (name: string, description?: string) => void;
  onClose: () => void;
}

const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({ onSave, onClose }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim(), description.trim() || undefined);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Collection</h2>
          <button onClick={onClose} className="close-button" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="collection-name">Collection Name:</label>
              <input
                id="collection-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter collection name..."
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="collection-description">Description (optional):</label>
              <textarea
                id="collection-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what this collection is for..."
                rows={3}
              />
            </div>

            <div className="modal-actions">
              <button type="button" onClick={onClose} className="button-secondary">
                Cancel
              </button>
              <button type="submit" className="button-primary" disabled={!name.trim()}>
                Create Collection
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCollectionModal; 