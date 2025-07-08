import React, { useState, useEffect } from 'react';
import { Brain, MessageCircle, Bookmark, Link2, Lightbulb, Star, RefreshCw, X } from 'lucide-react';
import { createAIService } from '../../utils/ai';
import { storage } from '../../utils/storage';
import { AIInsight, SavedLink, Highlight, CrossReference } from '../../types';

interface AIInsightsProps {
  onClose: () => void;
}

interface InsightGroup {
  questions: AIInsight[];
  flashcards: AIInsight[];
  connections: CrossReference[];
  recommendations: AIInsight[];
}

const AIInsights: React.FC<AIInsightsProps> = ({ onClose }) => {
  const [insights, setInsights] = useState<InsightGroup>({
    questions: [],
    flashcards: [],
    connections: [],
    recommendations: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'questions' | 'flashcards' | 'connections' | 'recommendations'>('questions');
  const [selectedItem, setSelectedItem] = useState<SavedLink | Highlight | null>(null);
  const [recentItems, setRecentItems] = useState<(SavedLink | Highlight)[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await storage.getData();
      const allItems: (SavedLink | Highlight)[] = [];
      
      // Get recent links and highlights
      const recentLinks = data.links.slice(-10);
      const allHighlights = data.links.flatMap(link => link.highlights || []).slice(-10);
      
      allItems.push(...recentLinks, ...allHighlights);
      setRecentItems(allItems);

      // Load existing insights
      await loadInsights(allItems);
    } catch (error) {
      console.error('Failed to load AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadInsights = async (items: (SavedLink | Highlight)[]) => {
    try {
      const result = await chrome.storage.local.get('nest_settings');
      const apiKey = result.nest_settings?.openaiApiKey;
      
      if (!apiKey) {
        console.log('No OpenAI API key found');
        return;
      }

      const aiService = createAIService(apiKey);
      
      // Generate insights for the most recent item
      const latestItem = items[items.length - 1];
      if (latestItem) {
        const [questions, flashcards, connections, recommendations] = await Promise.all([
          aiService.generateQuestions(
            'text' in latestItem ? latestItem.text : `${latestItem.title} - ${latestItem.description || ''}`,
            'medium'
          ),
          aiService.generateFlashcards(
            'text' in latestItem ? latestItem.text : `${latestItem.title} - ${latestItem.description || ''}`
          ),
          aiService.findCrossReferences(latestItem, items.slice(0, -1)),
          aiService.generateRecommendations(items)
        ]);

        setInsights({
          questions,
          flashcards,
          connections,
          recommendations
        });
      }
    } catch (error) {
      console.error('Error loading AI insights:', error);
    }
  };

  const generateInsightsForItem = async (item: SavedLink | Highlight) => {
    setLoading(true);
    setSelectedItem(item);
    
    try {
      const result = await chrome.storage.local.get('nest_settings');
      const apiKey = result.nest_settings?.openaiApiKey;
      
      if (!apiKey) {
        alert('Please configure your OpenAI API key in settings to use AI insights.');
        return;
      }

      const aiService = createAIService(apiKey);
      const content = 'text' in item ? item.text : `${item.title} - ${item.description || ''}`;
      
      const [questions, flashcards, connections] = await Promise.all([
        aiService.generateQuestions(content, 'medium'),
        aiService.generateFlashcards(content),
        aiService.findCrossReferences(item, recentItems.filter(i => i.id !== item.id))
      ]);

      setInsights(prev => ({
        ...prev,
        questions,
        flashcards,
        connections
      }));
    } catch (error) {
      console.error('Error generating insights:', error);
      alert('Failed to generate insights. Please check your API key and try again.');
    } finally {
      setLoading(false);
    }
  };

  const rateInsight = async (insight: AIInsight, rating: number) => {
    // Update insight rating (could be saved to storage)
    const updatedInsight = { ...insight, userRating: rating, isReviewed: true };
    
    // Update in current state
    setInsights(prev => ({
      ...prev,
      [insight.type === 'question' ? 'questions' : 
       insight.type === 'flashcard' ? 'flashcards' : 
       'recommendations']: prev[insight.type === 'question' ? 'questions' : 
                                insight.type === 'flashcard' ? 'flashcards' : 
                                'recommendations'].map(i => 
        i.id === insight.id ? updatedInsight : i
      )
    }));
  };

  const renderQuestions = () => (
    <div className="insights-list">
      {insights.questions.length === 0 ? (
        <div className="empty-state">
          <MessageCircle size={48} className="empty-icon" />
          <p>Generate questions to test your understanding</p>
        </div>
      ) : (
        insights.questions.map(question => (
          <div key={question.id} className="insight-card">
            <div className="insight-header">
              <MessageCircle size={16} />
              <span className="insight-type">Question</span>
              <div className="insight-rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => rateInsight(question, star)}
                    className={`star ${(question.userRating || 0) >= star ? 'filled' : ''}`}
                  >
                    <Star size={12} />
                  </button>
                ))}
              </div>
            </div>
            <div className="insight-content">{question.content}</div>
            {question.metadata?.difficulty && (
              <div className="insight-meta">
                <span className={`difficulty ${question.metadata.difficulty}`}>
                  {question.metadata.difficulty}
                </span>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const renderFlashcards = () => (
    <div className="insights-list">
      {insights.flashcards.length === 0 ? (
        <div className="empty-state">
          <Bookmark size={48} className="empty-icon" />
          <p>Generate flashcards for better retention</p>
        </div>
      ) : (
        insights.flashcards.map(flashcard => (
          <div key={flashcard.id} className="flashcard">
            <div className="flashcard-header">
              <Bookmark size={16} />
              <span className="insight-type">Flashcard</span>
              <div className="insight-rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => rateInsight(flashcard, star)}
                    className={`star ${(flashcard.userRating || 0) >= star ? 'filled' : ''}`}
                  >
                    <Star size={12} />
                  </button>
                ))}
              </div>
            </div>
            <div className="flashcard-content">
              {flashcard.content.split('\n').map((line, i) => (
                <div key={i} className={line.startsWith('Question:') ? 'question' : line.startsWith('Answer:') ? 'answer' : ''}>
                  {line}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderConnections = () => (
    <div className="insights-list">
      {insights.connections.length === 0 ? (
        <div className="empty-state">
          <Link2 size={48} className="empty-icon" />
          <p>Cross-references between your content will appear here</p>
        </div>
      ) : (
        insights.connections.map(connection => (
          <div key={connection.id} className="connection-card">
            <div className="connection-header">
              <Link2 size={16} />
              <span className={`relationship ${connection.relationshipType}`}>
                {connection.relationshipType.replace('-', ' ')}
              </span>
              <span className="strength">
                {Math.round(connection.strength * 100)}% match
              </span>
            </div>
            <div className="connection-content">
              <div className="connection-target">
                Connected to: <strong>{connection.targetId}</strong>
              </div>
              {connection.note && (
                <div className="connection-note">{connection.note}</div>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderRecommendations = () => (
    <div className="insights-list">
      {insights.recommendations.length === 0 ? (
        <div className="empty-state">
          <Lightbulb size={48} className="empty-icon" />
          <p>Content recommendations based on your reading will appear here</p>
        </div>
      ) : (
        insights.recommendations.map(recommendation => (
          <div key={recommendation.id} className="insight-card">
            <div className="insight-header">
              <Lightbulb size={16} />
              <span className="insight-type">Recommendation</span>
              <div className="insight-rating">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => rateInsight(recommendation, star)}
                    className={`star ${(recommendation.userRating || 0) >= star ? 'filled' : ''}`}
                  >
                    <Star size={12} />
                  </button>
                ))}
              </div>
            </div>
            <div className="insight-content">{recommendation.content}</div>
            {recommendation.metadata?.confidence && (
              <div className="insight-meta">
                <span className="confidence">
                  {Math.round(recommendation.metadata.confidence * 100)}% confidence
                </span>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );

  const tabs = [
    { id: 'questions', label: 'Questions', icon: MessageCircle, count: insights.questions.length },
    { id: 'flashcards', label: 'Flashcards', icon: Bookmark, count: insights.flashcards.length },
    { id: 'connections', label: 'Connections', icon: Link2, count: insights.connections.length },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb, count: insights.recommendations.length }
  ];

  return (
    <div className="ai-insights">
      <div className="insights-header">
        <button onClick={onClose} className="close-button">
          <X size={20} />
        </button>
        <h2><Brain size={20} /> AI Insights</h2>
        <button 
          onClick={loadData} 
          className="refresh-button"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spinning' : ''} />
        </button>
      </div>

      <div className="insights-tabs">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            >
              <Icon size={16} />
              {tab.label}
              {tab.count > 0 && <span className="count">{tab.count}</span>}
            </button>
          );
        })}
      </div>

      <div className="insights-content">
        {/* Recent Items for Quick Insights */}
        {recentItems.length > 0 && (
          <div className="quick-insights">
            <h3>Generate Insights For:</h3>
            <div className="recent-items">
              {recentItems.slice(-5).map(item => (
                <button
                  key={item.id}
                  onClick={() => generateInsightsForItem(item)}
                  className="recent-item"
                  disabled={loading}
                >
                  {'text' in item ? (
                    <>
                      <MessageCircle size={14} />
                      {item.text.slice(0, 50)}...
                    </>
                  ) : (
                    <>
                      <Bookmark size={14} />
                      {item.title}
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <RefreshCw size={24} className="spinning" />
            <p>Generating AI insights...</p>
          </div>
        ) : (
          <>
            {activeTab === 'questions' && renderQuestions()}
            {activeTab === 'flashcards' && renderFlashcards()}
            {activeTab === 'connections' && renderConnections()}
            {activeTab === 'recommendations' && renderRecommendations()}
          </>
        )}
      </div>
    </div>
  );
};

export default AIInsights; 