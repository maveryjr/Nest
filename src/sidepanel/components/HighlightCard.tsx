import React, { useState } from 'react';
import { Highlight } from '../../types';

interface HighlightCardProps {
  highlight: Highlight;
  onAddNote?: (highlightId: string, note: string) => void;
  onDelete?: (highlightId: string) => void;
}

const HighlightCard: React.FC<HighlightCardProps> = ({
  highlight,
  onAddNote,
  onDelete
}) => {
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState(highlight.userNote || '');

  const handleSaveNote = () => {
    if (onAddNote) {
      onAddNote(highlight.id, noteText);
    }
    setIsAddingNote(false);
  };

  const handleCancel = () => {
    setNoteText(highlight.userNote || '');
    setIsAddingNote(false);
  };

  return (
    <div className="highlight-card">
      <div className="highlight-content">
        <div className="highlight-text">
          <div className="highlight-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path 
                d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z" 
                fill="currentColor"
              />
            </svg>
          </div>
          <p className="highlight-selected-text">"{highlight.selectedText}"</p>
        </div>
        
        {highlight.context && highlight.context !== highlight.selectedText && (
          <div className="highlight-context">
            <p>Context: {highlight.context}</p>
          </div>
        )}

        {highlight.userNote && !isAddingNote && (
          <div className="highlight-note">
            <p>{highlight.userNote}</p>
          </div>
        )}

        {isAddingNote && (
          <div className="highlight-note-form">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your thoughts about this highlight..."
              autoFocus
            />
            <div className="highlight-note-actions">
              <button onClick={handleSaveNote} className="save-button">
                Save
              </button>
              <button onClick={handleCancel} className="cancel-button">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="highlight-actions">
        <span className="highlight-date">
          {new Date(highlight.createdAt).toLocaleDateString()}
        </span>
        <div className="highlight-buttons">
          {!isAddingNote && (
            <button
              onClick={() => setIsAddingNote(true)}
              className="highlight-action-button"
              title={highlight.userNote ? "Edit note" : "Add note"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(highlight.id)}
              className="highlight-action-button delete-button"
              title="Delete highlight"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="m18 6-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="m6 6 12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default HighlightCard; 