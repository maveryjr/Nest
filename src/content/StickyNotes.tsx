import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Edit3, Trash2, Palette, Pin, Move } from 'lucide-react';

interface StickyNote {
  id: string;
  content: string;
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  url: string;
  domain: string;
  createdAt: Date;
  updatedAt: Date;
}

interface StickyNotesProps {
  isVisible: boolean;
  onToggle: () => void;
}

const StickyNotes: React.FC<StickyNotesProps> = ({ isVisible, onToggle }) => {
  const [notes, setNotes] = useState<StickyNote[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const noteColors = [
    { name: 'Yellow', value: '#fef08a', border: '#eab308' },
    { name: 'Pink', value: '#fda4af', border: '#ec4899' },
    { name: 'Blue', value: '#93c5fd', border: '#3b82f6' },
    { name: 'Green', value: '#86efac', border: '#10b981' },
    { name: 'Purple', value: '#c4b5fd', border: '#8b5cf6' },
    { name: 'Orange', value: '#fed7aa', border: '#f97316' },
    { name: 'Gray', value: '#d1d5db', border: '#6b7280' },
    { name: 'Red', value: '#fca5a5', border: '#ef4444' }
  ];

  const currentUrl = window.location.href;
  const currentDomain = window.location.hostname;

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const result = await chrome.storage.local.get('nest_sticky_notes');
      const allNotes = result.nest_sticky_notes || [];
      
      // Filter notes for current URL
      const urlNotes = allNotes.filter((note: StickyNote) => 
        note.url === currentUrl || note.domain === currentDomain
      );
      
      setNotes(urlNotes);
    } catch (error) {
      console.error('Failed to load sticky notes:', error);
    }
  };

  const saveNotes = async (updatedNotes: StickyNote[]) => {
    try {
      const result = await chrome.storage.local.get('nest_sticky_notes');
      const allNotes = result.nest_sticky_notes || [];
      
      // Remove old notes for this URL/domain
      const otherNotes = allNotes.filter((note: StickyNote) => 
        note.url !== currentUrl && note.domain !== currentDomain
      );
      
      // Add updated notes
      const newAllNotes = [...otherNotes, ...updatedNotes];
      
      await chrome.storage.local.set({ nest_sticky_notes: newAllNotes });
      setNotes(updatedNotes);
    } catch (error) {
      console.error('Failed to save sticky notes:', error);
    }
  };

  const createNote = (x: number, y: number) => {
    const newNote: StickyNote = {
      id: Date.now().toString(),
      content: '',
      color: noteColors[0].value,
      position: { x, y },
      size: { width: 200, height: 150 },
      url: currentUrl,
      domain: currentDomain,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedNotes = [...notes, newNote];
    saveNotes(updatedNotes);
    setEditingNote(newNote.id);
    setIsCreating(false);
  };

  const updateNote = (id: string, updates: Partial<StickyNote>) => {
    const updatedNotes = notes.map(note =>
      note.id === id 
        ? { ...note, ...updates, updatedAt: new Date() }
        : note
    );
    saveNotes(updatedNotes);
  };

  const deleteNote = (id: string) => {
    const updatedNotes = notes.filter(note => note.id !== id);
    saveNotes(updatedNotes);
  };

  const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.note-drag-handle')) {
      e.preventDefault();
      setDraggedNote(noteId);
      
      const note = notes.find(n => n.id === noteId);
      if (note) {
        setDragOffset({
          x: e.clientX - note.position.x,
          y: e.clientY - note.position.y
        });
      }
    }
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (draggedNote) {
      e.preventDefault();
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      updateNote(draggedNote, {
        position: { x: newX, y: newY }
      });
    }
  };

  const handleMouseUp = () => {
    setDraggedNote(null);
    setDragOffset({ x: 0, y: 0 });
  };

  const handlePageClick = (e: MouseEvent) => {
    if (isCreating && e.target && !(e.target as HTMLElement).closest('.nest-sticky-note')) {
      const x = e.clientX;
      const y = e.clientY;
      createNote(x, y);
    }
  };

  useEffect(() => {
    if (draggedNote) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [draggedNote, dragOffset]);

  useEffect(() => {
    if (isCreating) {
      document.addEventListener('click', handlePageClick);
      document.body.style.cursor = 'crosshair';
      
      return () => {
        document.removeEventListener('click', handlePageClick);
        document.body.style.cursor = 'auto';
      };
    }
  }, [isCreating]);

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Action Button */}
      <div className="nest-sticky-fab">
        <button
          className={`sticky-fab-button ${isCreating ? 'creating' : ''}`}
          onClick={() => setIsCreating(!isCreating)}
          title={isCreating ? 'Click anywhere to add note' : 'Add sticky note'}
        >
          <Plus size={20} />
        </button>
        {isCreating && (
          <div className="creating-hint">
            Click anywhere on the page to add a sticky note
          </div>
        )}
      </div>

      {/* Sticky Notes */}
      {notes.map(note => (
        <div
          key={note.id}
          className={`nest-sticky-note ${draggedNote === note.id ? 'dragging' : ''}`}
          style={{
            left: note.position.x,
            top: note.position.y,
            width: note.size.width,
            height: note.size.height,
            backgroundColor: note.color,
            borderColor: noteColors.find(c => c.value === note.color)?.border || '#eab308'
          }}
          onMouseDown={(e) => handleMouseDown(e, note.id)}
        >
          {/* Note Header */}
          <div className="note-header note-drag-handle">
            <div className="note-actions">
              <button
                className="note-action-btn"
                onClick={() => setShowColorPicker(showColorPicker === note.id ? null : note.id)}
                title="Change color"
              >
                <Palette size={12} />
              </button>
              <button
                className="note-action-btn"
                onClick={() => setEditingNote(editingNote === note.id ? null : note.id)}
                title="Edit note"
              >
                <Edit3 size={12} />
              </button>
              <button
                className="note-action-btn delete"
                onClick={() => deleteNote(note.id)}
                title="Delete note"
              >
                <Trash2 size={12} />
              </button>
            </div>
            <div className="drag-handle" title="Drag to move">
              <Move size={12} />
            </div>
          </div>

          {/* Color Picker */}
          {showColorPicker === note.id && (
            <div className="color-picker">
              {noteColors.map(color => (
                <button
                  key={color.value}
                  className={`color-option ${note.color === color.value ? 'selected' : ''}`}
                  style={{ backgroundColor: color.value, borderColor: color.border }}
                  onClick={() => {
                    updateNote(note.id, { color: color.value });
                    setShowColorPicker(null);
                  }}
                  title={color.name}
                />
              ))}
            </div>
          )}

          {/* Note Content */}
          <div className="note-content">
            {editingNote === note.id ? (
              <textarea
                value={note.content}
                onChange={(e) => updateNote(note.id, { content: e.target.value })}
                onBlur={() => setEditingNote(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setEditingNote(null);
                  }
                }}
                placeholder="Type your note here..."
                className="note-textarea"
                autoFocus
              />
            ) : (
              <div
                className="note-text"
                onClick={() => setEditingNote(note.id)}
                style={{ cursor: note.content ? 'text' : 'pointer' }}
              >
                {note.content || 'Click to add text...'}
              </div>
            )}
          </div>

          {/* Note Footer */}
          <div className="note-footer">
            <span className="note-timestamp">
              {note.updatedAt.toLocaleDateString()}
            </span>
          </div>
        </div>
      ))}

      <style jsx>{`
        .nest-sticky-fab {
          position: fixed;
          bottom: 80px;
          right: 20px;
          z-index: 999998;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }

        .sticky-fab-button {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: #f59e0b;
          color: white;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transition: all 0.3s ease;
        }

        .sticky-fab-button:hover {
          background: #d97706;
          transform: scale(1.1);
        }

        .sticky-fab-button.creating {
          background: #10b981;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }

        .creating-hint {
          position: absolute;
          bottom: 70px;
          right: 0;
          background: #1f2937;
          color: white;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          animation: fadeIn 0.3s ease;
        }

        .creating-hint::after {
          content: '';
          position: absolute;
          top: 100%;
          right: 20px;
          width: 0;
          height: 0;
          border-left: 8px solid transparent;
          border-right: 8px solid transparent;
          border-top: 8px solid #1f2937;
        }

        .nest-sticky-note {
          position: fixed;
          z-index: 999997;
          border: 2px solid;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          transition: transform 0.2s ease;
          user-select: none;
        }

        .nest-sticky-note:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .nest-sticky-note.dragging {
          transform: rotate(5deg);
          z-index: 999999;
          cursor: grabbing;
        }

        .note-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          border-bottom: 1px solid rgba(0, 0, 0, 0.1);
          cursor: grab;
        }

        .note-header:active {
          cursor: grabbing;
        }

        .note-actions {
          display: flex;
          gap: 4px;
        }

        .note-action-btn {
          width: 20px;
          height: 20px;
          border: none;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          color: #374151;
        }

        .note-action-btn:hover {
          background: rgba(255, 255, 255, 1);
          transform: scale(1.1);
        }

        .note-action-btn.delete:hover {
          background: #ef4444;
          color: white;
        }

        .drag-handle {
          color: rgba(0, 0, 0, 0.4);
          cursor: grab;
        }

        .color-picker {
          position: absolute;
          top: 40px;
          left: 8px;
          background: white;
          border-radius: 8px;
          padding: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 4px;
          z-index: 1000000;
        }

        .color-option {
          width: 24px;
          height: 24px;
          border: 2px solid;
          border-radius: 4px;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .color-option:hover {
          transform: scale(1.1);
        }

        .color-option.selected {
          transform: scale(1.2);
          box-shadow: 0 0 0 2px #374151;
        }

        .note-content {
          flex: 1;
          padding: 12px;
          overflow: hidden;
        }

        .note-textarea {
          width: 100%;
          height: 100%;
          border: none;
          background: transparent;
          resize: none;
          outline: none;
          font-family: inherit;
          font-size: 14px;
          line-height: 1.4;
          color: #374151;
        }

        .note-text {
          width: 100%;
          height: 100%;
          font-size: 14px;
          line-height: 1.4;
          color: #374151;
          overflow-wrap: break-word;
          white-space: pre-wrap;
        }

        .note-text:empty::before {
          content: 'Click to add text...';
          color: #9ca3af;
          font-style: italic;
        }

        .note-footer {
          padding: 6px 12px;
          border-top: 1px solid rgba(0, 0, 0, 0.1);
          background: rgba(255, 255, 255, 0.3);
        }

        .note-timestamp {
          font-size: 10px;
          color: #6b7280;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
};

export default StickyNotes; 