import React, { useState, useEffect } from 'react';
import { X, Lightbulb, Target, BookOpen, Bookmark, Clock, Brain } from 'lucide-react';

interface SavePromptModalProps {
  isOpen: boolean;
  onSave: (reason: string, tags?: string[]) => void;
  onSkip: () => void;
  onClose: () => void;
  linkTitle?: string;
  linkUrl?: string;
}

interface SaveReason {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  suggestedTags: string[];
}

const SavePromptModal: React.FC<SavePromptModalProps> = ({
  isOpen,
  onSave,
  onSkip,
  onClose,
  linkTitle = 'this link',
  linkUrl = ''
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [customReason, setCustomReason] = useState('');
  const [suggestedTags, setSuggestedTags] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const saveReasons: SaveReason[] = [
    {
      id: 'learn',
      label: 'To Learn',
      icon: <BookOpen size={16} />,
      description: 'I want to study this topic or skill',
      suggestedTags: ['learning', 'tutorial', 'education']
    },
    {
      id: 'reference',
      label: 'For Reference',
      icon: <Bookmark size={16} />,
      description: 'I might need this information later',
      suggestedTags: ['reference', 'documentation', 'resource']
    },
    {
      id: 'project',
      label: 'For a Project',
      icon: <Target size={16} />,
      description: 'This relates to a current or future project',
      suggestedTags: ['project', 'work', 'implementation']
    },
    {
      id: 'inspiration',
      label: 'For Inspiration',
      icon: <Lightbulb size={16} />,
      description: 'This gives me ideas or creative inspiration',
      suggestedTags: ['inspiration', 'ideas', 'creative']
    },
    {
      id: 'later',
      label: 'Read Later',
      icon: <Clock size={16} />,
      description: "I don't have time now but want to read this",
      suggestedTags: ['read-later', 'queue', 'pending']
    },
    {
      id: 'research',
      label: 'For Research',
      icon: <Brain size={16} />,
      description: 'This is part of my research on a topic',
      suggestedTags: ['research', 'analysis', 'study']
    }
  ];

  useEffect(() => {
    if (selectedReason) {
      const reason = saveReasons.find(r => r.id === selectedReason);
      if (reason) {
        setSuggestedTags(reason.suggestedTags);
        setSelectedTags(reason.suggestedTags.slice(0, 2)); // Auto-select first 2 tags
      }
    }
  }, [selectedReason]);

  const handleReasonSelect = (reasonId: string) => {
    setSelectedReason(reasonId);
    setCustomReason('');
  };

  const handleCustomReasonChange = (value: string) => {
    setCustomReason(value);
    if (value.trim()) {
      setSelectedReason('');
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleSave = () => {
    const reason = customReason.trim() || 
      saveReasons.find(r => r.id === selectedReason)?.description || 
      'Saved for later reference';
    
    onSave(reason, selectedTags);
  };

  const canSave = selectedReason || customReason.trim();

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content save-prompt-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Why are you saving this?</h2>
          <button onClick={onClose} className="modal-close-button" title="Close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="save-prompt-link-preview">
            <div className="link-preview-title">{linkTitle}</div>
            {linkUrl && (
              <div className="link-preview-url">{new URL(linkUrl).hostname}</div>
            )}
          </div>

          <div className="save-reasons-section">
            <h3>Select a reason:</h3>
            <div className="save-reasons-grid">
              {saveReasons.map(reason => (
                <button
                  key={reason.id}
                  onClick={() => handleReasonSelect(reason.id)}
                  className={`save-reason-card ${selectedReason === reason.id ? 'selected' : ''}`}
                >
                  <div className="save-reason-icon">{reason.icon}</div>
                  <div className="save-reason-content">
                    <div className="save-reason-label">{reason.label}</div>
                    <div className="save-reason-description">{reason.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="custom-reason-section">
            <h3>Or write your own reason:</h3>
            <textarea
              value={customReason}
              onChange={(e) => handleCustomReasonChange(e.target.value)}
              placeholder="I'm saving this because..."
              className="custom-reason-input"
              rows={3}
            />
          </div>

          {suggestedTags.length > 0 && (
            <div className="suggested-tags-section">
              <h3>Suggested tags:</h3>
              <div className="suggested-tags">
                {suggestedTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`suggested-tag ${selectedTags.includes(tag) ? 'selected' : ''}`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="save-prompt-tip">
            <Lightbulb size={16} />
            <span>Adding context helps you find and use your saved links more effectively!</span>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onSkip} className="button">
            Skip for now
          </button>
          <button 
            onClick={handleSave} 
            className="button primary"
            disabled={!canSave}
          >
            Save with context
          </button>
        </div>
      </div>
    </div>
  );
};

export default SavePromptModal; 