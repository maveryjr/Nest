import React, { useState } from 'react';
import { Sparkles, Check, X, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { AITagSuggestion, AICategorySuggestion, AIAnalysisResult } from '../../types';

interface AISuggestionsProps {
  analysis: AIAnalysisResult;
  onTagsApproved: (tags: string[]) => void;
  onCategoryApproved: (category: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const AISuggestions: React.FC<AISuggestionsProps> = ({
  analysis,
  onTagsApproved,
  onCategoryApproved,
  onClose,
  isLoading = false
}) => {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(true);

  const handleTagToggle = (tag: string) => {
    const newSelected = new Set(selectedTags);
    if (newSelected.has(tag)) {
      newSelected.delete(tag);
    } else {
      newSelected.add(tag);
    }
    setSelectedTags(newSelected);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(selectedCategory === category ? '' : category);
  };

  const handleApprove = () => {
    if (selectedTags.size > 0) {
      onTagsApproved(Array.from(selectedTags));
    }
    if (selectedCategory) {
      onCategoryApproved(selectedCategory);
    }
    onClose();
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 0.8) return '#10b981'; // green
    if (confidence >= 0.6) return '#f59e0b'; // amber
    return '#6b7280'; // gray
  };

  const getConfidenceLabel = (confidence: number): string => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Med';
    return 'Low';
  };

  if (isLoading) {
    return (
      <div className="ai-suggestions loading">
        <div className="ai-suggestions-header">
          <div className="ai-loading-content">
            <Sparkles size={14} className="ai-icon spinning" />
            <span>AI analyzing content...</span>
          </div>
          <button onClick={onClose} className="ai-suggestions-close" title="Cancel analysis">
            <X size={12} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-suggestions">
      <div className="ai-suggestions-header">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ai-suggestions-toggle"
        >
          <Sparkles size={14} className="ai-icon" />
          <span>AI Suggestions</span>
          <div className="ai-suggestions-meta">
            {analysis.readingTime && (
              <span className="ai-reading-time">{analysis.readingTime}min</span>
            )}
          </div>
          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        <button onClick={onClose} className="ai-suggestions-close" title="Close suggestions">
          <X size={12} />
        </button>
      </div>

      {isExpanded && (
        <div className="ai-suggestions-content">
          {/* Category Suggestions */}
          {analysis.categorySuggestions.length > 0 && (
            <div className="ai-suggestion-section">
              <div className="suggestion-section-header">
                <Info size={12} />
                <span>Categories</span>
              </div>
              <div className="ai-category-suggestions">
                {analysis.categorySuggestions.slice(0, 3).map((suggestion, index) => (
                  <button
                    key={`${suggestion.category}-${index}`}
                    onClick={() => handleCategorySelect(suggestion.category)}
                    className={`ai-category-chip ${selectedCategory === suggestion.category ? 'selected' : ''}`}
                    title={suggestion.reason}
                  >
                    <span className="suggestion-name">{suggestion.category}</span>
                    <span 
                      className="confidence-indicator"
                      style={{ backgroundColor: getConfidenceColor(suggestion.confidence) }}
                    >
                      {getConfidenceLabel(suggestion.confidence)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tag Suggestions */}
          {analysis.tagSuggestions.length > 0 && (
            <div className="ai-suggestion-section">
              <div className="suggestion-section-header">
                <Info size={12} />
                <span>Tags</span>
              </div>
              <div className="ai-tag-suggestions">
                {analysis.tagSuggestions.slice(0, 6).map((suggestion, index) => (
                  <button
                    key={`${suggestion.tag}-${index}`}
                    onClick={() => handleTagToggle(suggestion.tag)}
                    className={`ai-tag-chip ${selectedTags.has(suggestion.tag) ? 'selected' : ''}`}
                    title={`${suggestion.reason} (${Math.round(suggestion.confidence * 100)}% confidence)`}
                  >
                    <span className="suggestion-name">{suggestion.tag}</span>
                    <span 
                      className="confidence-indicator"
                      style={{ backgroundColor: getConfidenceColor(suggestion.confidence) }}
                    >
                      {getConfidenceLabel(suggestion.confidence)}
                    </span>
                    {selectedTags.has(suggestion.tag) && (
                      <Check size={10} className="selected-icon" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Topics (compact display) */}
          {analysis.topics && analysis.topics.length > 0 && (
            <div className="ai-topics-section">
              <span className="ai-topics-label">Topics:</span>
              <div className="ai-detected-topics">
                {analysis.topics.slice(0, 3).map((topic, index) => (
                  <span key={index} className="ai-topic-pill">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="ai-suggestions-actions">
            <button 
              onClick={onClose} 
              className="ai-action-btn secondary"
            >
              Skip
            </button>
            <button 
              onClick={handleApprove}
              className="ai-action-btn primary"
              disabled={selectedTags.size === 0 && !selectedCategory}
            >
              Apply ({selectedTags.size + (selectedCategory ? 1 : 0)})
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AISuggestions; 