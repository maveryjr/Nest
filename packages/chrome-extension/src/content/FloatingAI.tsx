import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Minimize2, Maximize2, Sparkles, Send, Copy, Download, RefreshCw } from 'lucide-react';

interface FloatingAIProps {
  isVisible: boolean;
  onClose: () => void;
  pageContent?: string;
  pageTitle?: string;
  pageUrl?: string;
}

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

const FloatingAI: React.FC<FloatingAIProps> = ({ 
  isVisible, 
  onClose, 
  pageContent = '', 
  pageTitle = '', 
  pageUrl = '' 
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    {
      id: 'summarize',
      title: 'Summarize Page',
      description: 'Get a quick summary of this webpage',
      prompt: 'Please provide a concise summary of this webpage in 2-3 sentences.',
      icon: '📄'
    },
    {
      id: 'explain',
      title: 'Explain Simply',
      description: 'Explain complex concepts in simple terms',
      prompt: 'Please explain the main concepts on this page in simple, easy-to-understand language.',
      icon: '💡'
    },
    {
      id: 'keypoints',
      title: 'Key Points',
      description: 'Extract the most important points',
      prompt: 'What are the key takeaways and main points from this content?',
      icon: '🎯'
    },
    {
      id: 'questions',
      title: 'Generate Questions',
      description: 'Create questions for deeper understanding',
      prompt: 'Generate 3-5 thoughtful questions about this content that would help someone understand it better.',
      icon: '❓'
    },
    {
      id: 'actionable',
      title: 'Action Items',
      description: 'Extract actionable insights',
      prompt: 'What actionable steps or recommendations can be derived from this content?',
      icon: '✅'
    },
    {
      id: 'research',
      title: 'Research Topics',
      description: 'Suggest related research topics',
      prompt: 'Based on this content, what are some related topics I should research further?',
      icon: '🔍'
    }
  ];

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (message: string) => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Simulate AI response (replace with actual AI API call)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: `I understand you're asking about: "${message}". This is a simulated AI response. In a real implementation, this would connect to an AI service like OpenAI's GPT to provide intelligent responses about the current webpage content.`,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error('AI response error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt: typeof quickPrompts[0]) => {
    setSelectedPrompt(prompt.id);
    handleSendMessage(prompt.prompt);
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isVisible) return null;

  return (
    <div className="nest-floating-ai">
      <div className={`floating-ai-container ${isMinimized ? 'minimized' : ''}`}>
        {/* Header */}
        <div className="floating-ai-header">
          <div className="header-left">
            <div className="ai-icon">
              <Sparkles size={16} />
            </div>
            <span className="ai-title">AI Assistant</span>
          </div>
          <div className="header-actions">
            <button
              className="header-btn"
              onClick={() => setIsMinimized(!isMinimized)}
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button
              className="header-btn"
              onClick={onClose}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Content */}
        {!isMinimized && (
          <div className="floating-ai-content">
            {/* Quick Prompts */}
            {messages.length === 0 && (
              <div className="quick-prompts">
                <div className="prompts-header">
                  <h4>Quick Actions</h4>
                  <p>Choose a quick action to get started</p>
                </div>
                <div className="prompts-grid">
                  {quickPrompts.map((prompt) => (
                                         <button
                       key={prompt.id}
                       className={`prompt-card ${selectedPrompt === prompt.id ? 'selected' : ''}`}
                       onClick={() => handleQuickPrompt(prompt)}
                       disabled={isLoading}
                       title={prompt.description}
                     >
                      <div className="prompt-icon">{prompt.icon}</div>
                      <div className="prompt-content">
                        <div className="prompt-title">{prompt.title}</div>
                        <div className="prompt-description">{prompt.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Messages */}
            {messages.length > 0 && (
              <div className="messages-container">
                <div className="messages-header">
                  <span className="page-context">
                    💬 Chatting about: {pageTitle || 'Current Page'}
                  </span>
                  <button
                    className="clear-chat-btn"
                    onClick={clearChat}
                    title="Clear chat"
                  >
                    <RefreshCw size={12} />
                  </button>
                </div>
                <div className="messages-list">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`message ${message.type}`}
                    >
                      <div className="message-content">
                        {message.content}
                      </div>
                      <div className="message-actions">
                        <button
                          className="message-action"
                          onClick={() => copyMessage(message.content)}
                          title="Copy"
                        >
                          <Copy size={12} />
                        </button>
                        <span className="message-time">
                          {message.timestamp.toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="message ai loading">
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            )}

            {/* Input */}
            <div className="ai-input-container">
              <div className="input-wrapper">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage(inputValue)}
                  placeholder="Ask anything about this page..."
                  className="ai-input"
                  disabled={isLoading}
                />
                <button
                  className="send-btn"
                  onClick={() => handleSendMessage(inputValue)}
                  disabled={isLoading || !inputValue.trim()}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .nest-floating-ai {
          position: fixed;
          bottom: 20px;
          right: 20px;
          z-index: 999999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
        }

        .floating-ai-container {
          width: 380px;
          max-height: 600px;
          background: #ffffff;
          border-radius: 16px;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
          border: 1px solid #e5e7eb;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .floating-ai-container.minimized {
          width: 200px;
          max-height: 60px;
        }

        .floating-ai-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .ai-icon {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 6px;
        }

        .ai-title {
          font-weight: 600;
          font-size: 14px;
        }

        .header-actions {
          display: flex;
          gap: 4px;
        }

        .header-btn {
          width: 28px;
          height: 28px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .header-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .floating-ai-content {
          display: flex;
          flex-direction: column;
          height: 100%;
          max-height: 540px;
        }

        .quick-prompts {
          padding: 20px;
        }

        .prompts-header {
          text-align: center;
          margin-bottom: 16px;
        }

        .prompts-header h4 {
          margin: 0 0 4px 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
        }

        .prompts-header p {
          margin: 0;
          font-size: 13px;
          color: #6b7280;
        }

        .prompts-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .prompt-card {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }

        .prompt-card:hover {
          border-color: #667eea;
          background: #f8faff;
        }

        .prompt-card.selected {
          border-color: #667eea;
          background: #f0f4ff;
        }

        .prompt-icon {
          font-size: 16px;
          flex-shrink: 0;
        }

        .prompt-content {
          flex: 1;
          min-width: 0;
        }

        .prompt-title {
          font-size: 12px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 2px;
        }

        .prompt-description {
          font-size: 10px;
          color: #6b7280;
          line-height: 1.3;
        }

        .messages-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .messages-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .page-context {
          font-size: 12px;
          color: #6b7280;
          font-weight: 500;
        }

        .clear-chat-btn {
          padding: 4px;
          border: none;
          background: none;
          color: #6b7280;
          cursor: pointer;
          border-radius: 4px;
          transition: color 0.2s;
        }

        .clear-chat-btn:hover {
          color: #374151;
        }

        .messages-list {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          max-height: 300px;
        }

        .message {
          margin-bottom: 16px;
        }

        .message.user .message-content {
          background: #667eea;
          color: white;
          margin-left: 40px;
          border-radius: 16px 16px 4px 16px;
        }

        .message.ai .message-content {
          background: #f3f4f6;
          color: #1f2937;
          margin-right: 40px;
          border-radius: 16px 16px 16px 4px;
        }

        .message-content {
          padding: 12px 16px;
          font-size: 14px;
          line-height: 1.4;
          word-wrap: break-word;
        }

        .message-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 4px;
          padding: 0 8px;
        }

        .message.user .message-actions {
          justify-content: flex-end;
        }

        .message-action {
          padding: 4px;
          border: none;
          background: none;
          color: #9ca3af;
          cursor: pointer;
          border-radius: 4px;
          transition: color 0.2s;
        }

        .message-action:hover {
          color: #6b7280;
        }

        .message-time {
          font-size: 11px;
          color: #9ca3af;
        }

        .message.loading .message-content {
          padding: 16px;
        }

        .typing-indicator {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .typing-indicator span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #9ca3af;
          animation: typing 1.4s infinite;
        }

        .typing-indicator span:nth-child(2) {
          animation-delay: 0.2s;
        }

        .typing-indicator span:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes typing {
          0%, 60%, 100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          30% {
            transform: translateY(-10px);
            opacity: 1;
          }
        }

        .ai-input-container {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          background: white;
        }

        .input-wrapper {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .ai-input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .ai-input:focus {
          border-color: #667eea;
        }

        .send-btn {
          width: 40px;
          height: 40px;
          border: none;
          background: #667eea;
          color: white;
          border-radius: 50%;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s;
        }

        .send-btn:hover:not(:disabled) {
          background: #5a67d8;
        }

        .send-btn:disabled {
          background: #d1d5db;
          cursor: not-allowed;
        }

        .messages-list::-webkit-scrollbar {
          width: 6px;
        }

        .messages-list::-webkit-scrollbar-track {
          background: #f1f5f9;
        }

        .messages-list::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .messages-list::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
};

export default FloatingAI; 