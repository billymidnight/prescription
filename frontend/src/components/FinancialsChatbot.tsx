import React, { useState, useRef, useEffect } from 'react';
import './FinancialsChatbot.css';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const SCORP_LOGO = (() => {
  const api = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
  return api.replace(/\/api\/?$/, '') + '/static_images/scorp_logo.png';
})();

export default function FinancialsChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hey! I\'m **Scorp** 🐶 — your clinic data assistant.\n\nAsk me anything about patients, visits, diagnoses, prescriptions, medicines, revenue, or clinic trends. I\'ve got the data!' }
  ]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
      const response = await fetch(`${apiBase}/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          history: updatedMessages.slice(1),
        }),
      });

      const data = await response.json();

      if (response.ok && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.error || 'Hmm, something went wrong. Give it another shot!'
        }]);
      }
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Can\'t reach the server right now. Check if the backend is running!'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([
      { role: 'assistant', content: 'Fresh start! 🐶 What do you want to know?' }
    ]);
  };

  const formatMessage = (text: string) => {
    return text
      // Bold
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic
      .replace(/(?<!\*)\*(?!\*)(.*?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
      // Headings (###)
      .replace(/^### (.+)$/gm, '<div class="scorp-heading">$1</div>')
      // Bullet points
      .replace(/^- /gm, '• ')
      // Numbered lists (keep as-is, just clean up)
      .replace(/^(\d+)\. /gm, '<span class="scorp-list-num">$1.</span> ')
      // Currency highlighting
      .replace(/(₹[\d,]+(?:\.\d{2})?)/g, '<span class="scorp-currency">$1</span>')
      // Line breaks
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      <button
        className={`chatbot-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Scorp — Clinic Data Assistant"
      >
        {isOpen ? '✕' : <img src={SCORP_LOGO} alt="Scorp" className="chatbot-fab-logo" />}
      </button>

      {isOpen && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-header-info">
              <img src={SCORP_LOGO} alt="Scorp" className="chatbot-header-logo" />
              <div>
                <div className="chatbot-header-title">Scorp</div>
                <div className="chatbot-header-subtitle">Dr. Karthika Skin Care · Data Assistant</div>
              </div>
            </div>
            <div className="chatbot-header-actions">
              <button className="chatbot-clear-btn" onClick={handleClear} title="Clear chat">🗑️</button>
              <button className="chatbot-close-btn" onClick={() => setIsOpen(false)} title="Close">✕</button>
            </div>
          </div>

          <div className="chatbot-messages">
            {messages.map((msg, idx) => (
              <div key={idx} className={`chatbot-msg ${msg.role}`}>
                {msg.role === 'assistant' && <img src={SCORP_LOGO} alt="Scorp" className="chatbot-msg-avatar-img" />}
                <div
                  className="chatbot-msg-bubble"
                  dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                />
              </div>
            ))}
            {loading && (
              <div className="chatbot-msg assistant">
                <img src={SCORP_LOGO} alt="Scorp" className="chatbot-msg-avatar-img" />
                <div className="chatbot-msg-bubble chatbot-typing">
                  <span className="dot"></span>
                  <span className="dot"></span>
                  <span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chatbot-input-area">
            <input
              ref={inputRef}
              type="text"
              className="chatbot-input"
              placeholder="Ask Scorp anything about clinic data..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              maxLength={2000}
            />
            <button
              className="chatbot-send-btn"
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
