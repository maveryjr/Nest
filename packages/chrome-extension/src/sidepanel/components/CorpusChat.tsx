import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Search, Loader2, Brain, BookOpen, X, RefreshCw } from 'lucide-react';
import { embeddingsService } from '../../utils/embeddings';
import { aiService } from '../../utils/ai';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: {
    title: string;
    url: string;
    snippet: string;
    relevance: number;
  }[];
}

interface CorpusChatProps {
  isVisible: boolean;
  onClose: () => void;
}

const WelcomeMessage = {
  id: 'welcome-message',
  type: 'assistant' as const,
  content: "Hi! I'm your Nest AI assistant. I can help you search and answer questions about your saved content. What would you like to know?",
  timestamp: new Date(),
};

export default function CorpusChat({ isVisible, onClose }: CorpusChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([WelcomeMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [corpusSize, setCorpusSize] = useState(0);
  const [isIndexing, setIsIndexing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) {
      loadCorpusInfo();
      if (messages.length === 0) {
        setMessages([WelcomeMessage]);
      }
    }
  }, [isVisible]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  const loadCorpusInfo = async () => {
    try {
      const stats = await embeddingsService.getCorpusStats();
      setCorpusSize(stats.totalChunks);
      setIsIndexing(stats.isIndexing);
    } catch (error) {
      console.error('Failed to load corpus info:', error);
    }
  };

  const handleClearChat = () => {
    setMessages([WelcomeMessage]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const queryResult = await embeddingsService.queryCorpus(userMessage.content);
      const aiResponse = await aiService.generateResponseWithContext(
        userMessage.content,
        queryResult.results,
        queryResult.metadata
      );

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: aiResponse.response,
        timestamp: new Date(),
        sources: queryResult.results.map(result => ({
          title: result.metadata.title || 'Untitled',
          url: result.metadata.url || '',
          snippet: result.content.substring(0, 150) + '...',
          relevance: result.similarity,
        })),
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to process query:', error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error while searching your content. Please try again or rephrase your question.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleQuery = (query: string) => {
    setInputValue(query);
    inputRef.current?.focus();
  };

  const exampleQueries = [
    "What articles did I save about artificial intelligence?",
    "Show me highlights from last week",
    "Find content related to productivity tips",
    "What videos did I bookmark about coding?",
  ];

  if (!isVisible) return null;

  return (
    <div className="corpus-chat-container">
      <div className="chat-header">
          <div className="chat-header-title">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3>Ask Nest</h3>
          </div>
          <div className="chat-header-actions">
            <button onClick={handleClearChat} className="header-button" title="Clear chat">
                <RefreshCw size={14} />
            </button>
            <button onClick={onClose} className="header-button" title="Close chat">
                <X size={16} />
            </button>
          </div>
      </div>

      {isIndexing && (
        <div className="chat-indexing-banner">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Indexing content for better search results...</span>
        </div>
      )}

      <div className="chat-messages" ref={messagesEndRef}>
        {messages.map((message, index) => (
            <div key={message.id}>
              {message.type === 'assistant' && index === 0 && (
                <div className="welcome-container">
                    <h4 className="welcome-title">
                        <BookOpen className="w-4 h-4" />
                        Try asking me about:
                    </h4>
                    <div className="example-queries">
                      {exampleQueries.map((query, i) => (
                        <button key={i} onClick={() => handleExampleQuery(query)} className="example-query">
                          "{query}"
                        </button>
                      ))}
                    </div>
                </div>
              )}
              <div className={`message-wrapper ${message.type}`}>
                  <div className="message-icon">
                      {message.type === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                  <div className="message-content">
                      <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>
              </div>

              {message.type === 'assistant' && message.sources && message.sources.length > 0 && (
                <div className="sources-container">
                  <p className="sources-title">Sources:</p>
                  {message.sources.map((source, i) => (
                    <div key={i} className="source-item">
                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="source-title">
                            {source.title}
                        </a>
                        <p className="source-snippet">{source.snippet}</p>
                        <span className="source-relevance">{Math.round(source.relevance * 100)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
        ))}
        {isLoading && (
            <div className="message-wrapper assistant">
                <div className="message-icon"><Bot size={16} /></div>
                <div className="message-content">
                    <div className="typing-indicator">
                        <span></span><span></span><span></span>
                    </div>
                </div>
            </div>
        )}
      </div>

      <div className="chat-input-area">
        <form onSubmit={handleSubmit} className="chat-input-form">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask a question about your content..."
            className="chat-input"
            disabled={isLoading}
          />
          <button type="submit" className="send-button" disabled={isLoading || !inputValue.trim()} aria-label="Send message">
            <Send size={16} />
          </button>
        </form>
        <p className="chat-disclaimer">
            Ask Nest can make mistakes. Consider checking important information.
        </p>
      </div>
    </div>
  );
} 