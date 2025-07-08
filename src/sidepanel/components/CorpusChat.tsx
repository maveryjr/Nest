import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Search, Loader2, Brain, BookOpen } from 'lucide-react';
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

export default function CorpusChat({ isVisible, onClose }: CorpusChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [corpusSize, setCorpusSize] = useState(0);
  const [isIndexing, setIsIndexing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize corpus size and check embeddings status
  useEffect(() => {
    if (isVisible) {
      loadCorpusInfo();
      // Add welcome message if no previous messages
      if (messages.length === 0) {
        setMessages([{
          id: Date.now().toString(),
          type: 'assistant',
          content: 'Hi! I\'m your Nest AI assistant. I can help you search and answer questions about your saved content. What would you like to know?',
          timestamp: new Date(),
        }]);
      }
    }
  }, [isVisible]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when visible
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
      // Query the corpus using embeddings
      const queryResult = await embeddingsService.queryCorpus(userMessage.content);
      
      // Generate AI response with context
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
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Brain className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Ask Nest</h3>
              <p className="text-sm text-gray-500">
                Chat with your knowledge corpus ({corpusSize} items indexed)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        {/* Status Bar */}
        {isIndexing && (
          <div className="bg-blue-50 border-b px-4 py-2 text-sm text-blue-700">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Indexing content for better search results...
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 1 && messages[0].type === 'assistant' && (
            <div className="space-y-3">
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Try asking me about:
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {exampleQueries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleQuery(query)}
                      className="text-left p-3 bg-white/80 rounded-lg text-sm text-gray-700 hover:bg-white hover:shadow-sm transition-all"
                    >
                      "{query}"
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.type === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`p-2 rounded-lg flex-shrink-0 ${
                message.type === 'user' 
                  ? 'bg-purple-100 text-purple-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {message.type === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>
              
              <div className={`flex-1 max-w-[80%] ${message.type === 'user' ? 'text-right' : ''}`}>
                <div className={`rounded-lg p-3 ${
                  message.type === 'user'
                    ? 'bg-purple-600 text-white ml-auto'
                    : 'bg-gray-50 text-gray-900'
                }`}>
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {/* Sources for assistant messages */}
                {message.type === 'assistant' && message.sources && message.sources.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-gray-500 font-medium">Sources:</p>
                    {message.sources.map((source, index) => (
                      <div key={index} className="bg-white border rounded-lg p-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <a
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-blue-600 hover:underline line-clamp-1"
                            >
                              {source.title}
                            </a>
                            <p className="text-gray-600 mt-1 text-xs">{source.snippet}</p>
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {Math.round(source.relevance * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                <p className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3">
              <div className="p-2 rounded-lg bg-gray-100 text-gray-600">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-gray-600">Searching your content...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Form */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about your saved content..."
                className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                disabled={isLoading}
              />
              <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
            </div>
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
          
          {corpusSize === 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Start saving content to build your knowledge corpus and enable AI search.
            </p>
          )}
        </div>
      </div>
    </div>
  );
} 