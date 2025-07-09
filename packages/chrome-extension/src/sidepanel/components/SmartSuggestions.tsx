import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Clock, 
  Archive, 
  FolderPlus, 
  TrendingUp, 
  BookOpen, 
  Target,
  CheckCircle,
  X,
  Info,
  ChevronRight,
  Zap
} from 'lucide-react';
import { suggestionEngine, Suggestion } from '../../utils/suggestionEngine';
import { storage } from '../../utils/storage';

interface SmartSuggestionsProps {
  isOpen: boolean;
  onClose: () => void;
  onSuggestionAction: (suggestion: Suggestion) => void;
  onRefreshData: () => void;
}

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  isOpen,
  onClose,
  onSuggestionAction,
  onRefreshData
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(new Set());
  const [executingAction, setExecutingAction] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSuggestions();
    }
  }, [isOpen]);

  const loadSuggestions = async () => {
    setLoading(true);
    try {
      const newSuggestions = await suggestionEngine.generateSuggestions();
      setSuggestions(newSuggestions.filter(s => !dismissedSuggestions.has(s.id)));
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: Suggestion) => {
    if (executingAction) return; // Prevent double-clicks
    
    setExecutingAction(suggestion.id);
    
    try {
      switch (suggestion.type) {
        case 'read_next':
          // Open the suggested link
          if (suggestion.actionData.link) {
            window.open(suggestion.actionData.link.url, '_blank');
            await storage.logActivity('read', suggestion.actionData.linkId);
          }
          break;
          
        case 'create_collection':
          await handleCreateCollection(suggestion);
          break;
          
        case 'clear_inbox':
          await handleClearInbox(suggestion);
          break;
          
        case 'archive':
          await handleArchiveStale(suggestion);
          break;
          
        case 'focus_session':
          // Trigger focus mode (would integrate with existing focus component)
          onSuggestionAction(suggestion);
          break;
          
        default:
          onSuggestionAction(suggestion);
      }
      
      // Mark as executed and refresh
      dismissSuggestion(suggestion.id);
      onRefreshData();
    } catch (error) {
      console.error('Failed to execute suggestion:', error);
    } finally {
      setExecutingAction(null);
    }
  };

  const handleCreateCollection = async (suggestion: Suggestion) => {
    const { cluster, suggestedName, linkIds } = suggestion.actionData;
    
    try {
      // Create new collection
      const newCollection = {
        name: suggestedName,
        description: `Auto-organized from ${cluster.theme}`,
        color: '#3b82f6',
        isPublic: false
      };
      
      const result = await storage.addCollection(newCollection);
      if (result.success && result.collectionId) {
        // Move links to the collection
        for (const linkId of linkIds) {
          await storage.updateLink(linkId, { 
            collectionId: result.collectionId,
            isInInbox: false 
          });
        }
        
        // Log the organization activity
        await storage.logActivity('organize', linkIds[0], undefined, {
          action: 'create_collection',
          collectionName: suggestedName,
          itemCount: linkIds.length,
          automated: true
        });
      }
    } catch (error) {
      console.error('Failed to create collection:', error);
      throw error;
    }
  };

  const handleClearInbox = async (suggestion: Suggestion) => {
    try {
      const summary = await suggestionEngine.getSummarizeAndClearSuggestion();
      
      // Execute planned batch actions
      for (const action of summary.batchActions) {
        await suggestionEngine.executeBatchActions([action]);
      }
      
      // Log the bulk organization
      await storage.logActivity('organize', '', undefined, {
        action: 'bulk_inbox_clear',
        itemsProcessed: summary.batchActions.reduce((sum, action) => sum + action.items.length, 0),
        automated: true
      });
    } catch (error) {
      console.error('Failed to clear inbox:', error);
      throw error;
    }
  };

  const handleArchiveStale = async (suggestion: Suggestion) => {
    const { staleItems } = suggestion.actionData;
    
    try {
      for (const staleItem of staleItems) {
        await storage.updateLink(staleItem.link.id, { isInInbox: false });
        await storage.logActivity('organize', staleItem.link.id, undefined, {
          action: 'archive_stale',
          staleness: staleItem.staleness,
          reason: staleItem.reason,
          automated: true
        });
      }
    } catch (error) {
      console.error('Failed to archive stale content:', error);
      throw error;
    }
  };

  const dismissSuggestion = (suggestionId: string) => {
    setDismissedSuggestions(prev => new Set(prev).add(suggestionId));
    setSuggestions(prev => prev.filter(s => s.id !== suggestionId));
  };

  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'read_next': return <BookOpen size={16} />;
      case 'create_collection': return <FolderPlus size={16} />;
      case 'clear_inbox': return <Archive size={16} />;
      case 'archive': return <Archive size={16} />;
      case 'focus_session': return <Target size={16} />;
      case 'review_highlights': return <TrendingUp size={16} />;
      case 'organize': return <FolderPlus size={16} />;
      default: return <Sparkles size={16} />;
    }
  };

  const getPriorityColor = (priority: Suggestion['priority']) => {
    switch (priority) {
      case 'urgent': return '#ef4444';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const getCategoryColor = (category: Suggestion['category']) => {
    switch (category) {
      case 'productivity': return '#10b981';
      case 'organization': return '#3b82f6';
      case 'learning': return '#8b5cf6';
      case 'maintenance': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="smart-suggestions-modal">
      <div className="smart-suggestions-backdrop" onClick={onClose} />
      <div className="smart-suggestions-content">
        <div className="smart-suggestions-header">
          <div className="smart-suggestions-title">
            <Sparkles size={20} />
            <h2>Smart Suggestions</h2>
          </div>
          <button onClick={onClose} className="close-button" title="Close suggestions">
            <X size={20} />
          </button>
        </div>

        <div className="smart-suggestions-body">
          {loading ? (
            <div className="suggestions-loading">
              <div className="loading-spinner" />
              <p>Analyzing your content patterns...</p>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="suggestions-empty">
              <CheckCircle size={48} />
              <h3>All caught up!</h3>
              <p>No suggestions available right now. Your workspace is well organized.</p>
            </div>
          ) : (
            <div className="suggestions-list">
              {suggestions.map(suggestion => (
                <div 
                  key={suggestion.id} 
                  className={`suggestion-card ${suggestion.priority}`}
                  style={{ 
                    borderLeftColor: getPriorityColor(suggestion.priority)
                  }}
                >
                  <div className="suggestion-main">
                    <div className="suggestion-icon" 
                         style={{ color: getCategoryColor(suggestion.category) }}>
                      {getSuggestionIcon(suggestion.type)}
                    </div>
                    
                    <div className="suggestion-content">
                      <div className="suggestion-header">
                        <h3>{suggestion.title}</h3>
                        <div className="suggestion-meta">
                          {suggestion.estimatedTime && (
                            <span className="suggestion-time">
                              <Clock size={12} />
                              {suggestion.estimatedTime}
                            </span>
                          )}
                          <span 
                            className="suggestion-priority"
                            style={{ color: getPriorityColor(suggestion.priority) }}
                          >
                            {suggestion.priority}
                          </span>
                        </div>
                      </div>
                      
                      <p className="suggestion-description">
                        {suggestion.description}
                      </p>
                      
                      <div className="suggestion-reasoning">
                        <Info size={12} />
                        <span>{suggestion.reasoning}</span>
                      </div>
                    </div>
                  </div>

                  <div className="suggestion-actions">
                                         <button
                       onClick={() => handleSuggestionClick(suggestion)}
                       disabled={executingAction === suggestion.id}
                       className="suggestion-action-btn primary"
                       title={`Execute suggestion: ${suggestion.title}`}
                     >
                      {executingAction === suggestion.id ? (
                        <>
                          <div className="small-spinner" />
                          Acting...
                        </>
                      ) : (
                                                 <>
                           <Zap size={14} />
                           {getActionButtonText(suggestion.type)}
                           <ChevronRight size={14} />
                         </>
                       )}
                     </button>
                     
                     {suggestion.dismissible && (
                       <button
                         onClick={() => dismissSuggestion(suggestion.id)}
                         className="suggestion-dismiss-btn"
                         title="Dismiss suggestion"
                       >
                         <X size={14} />
                       </button>
                     )}
                   </div>

                   <div className="suggestion-confidence">
                     <div className="confidence-bar">
                       <div 
                         className="confidence-fill"
                         style={{ 
                           width: `${suggestion.confidence * 100}%`,
                           backgroundColor: getCategoryColor(suggestion.category)
                         }}
                       />
                     </div>
                     <span className="confidence-text">
                       {Math.round(suggestion.confidence * 100)}% confident
                     </span>
                   </div>
                 </div>
               ))}
             </div>
           )}
         </div>

         <div className="smart-suggestions-footer">
           <button 
             onClick={loadSuggestions}
             disabled={loading}
             className="refresh-suggestions-btn"
           >
             <TrendingUp size={16} />
             Refresh Suggestions
           </button>
         </div>
       </div>
     </div>
   );
};

const getActionButtonText = (type: Suggestion['type']): string => {
  switch (type) {
    case 'read_next': return 'Read Now';
    case 'create_collection': return 'Create Collection';
    case 'clear_inbox': return 'Clear Inbox';
    case 'archive': return 'Archive Items';
    case 'focus_session': return 'Start Focus';
    case 'review_highlights': return 'Review';
    case 'organize': return 'Organize';
    default: return 'Take Action';
  }
};

export default SmartSuggestions; 