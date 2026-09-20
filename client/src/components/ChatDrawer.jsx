import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, Bot } from 'lucide-react';

export const ChatDrawer = ({ isOpen, onClose, messages = [], onSendMessage, currentUser }) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  if (!isOpen) return null;

  return (
    <aside className="chat-drawer-container">
      {/* Header */}
      <div className="chat-drawer-header">
        <div className="chat-header-title">
          <MessageSquare size={17} className="chat-icon-accent" />
          <h4>Room Chat</h4>
          <span className="badge badge-indigo">{messages.length}</span>
        </div>
        <button className="btn-icon" onClick={onClose} title="Close Chat">
          <X size={17} />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="chat-messages-body">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <MessageSquare size={32} className="empty-icon" />
            <p>No messages yet.</p>
            <span>Say hi to your fellow collaborators!</span>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isSystem = msg.type === 'system';
            const isMe = msg.user?.id === currentUser?.id || msg.user?.name === currentUser?.username;

            if (isSystem) {
              return (
                <div key={msg._id || index} className="system-message">
                  <span className="system-pill">{msg.text}</span>
                </div>
              );
            }

            return (
              <div
                key={msg._id || index}
                className={`chat-bubble-row ${isMe ? 'row-me' : 'row-peer'}`}
              >
                {!isMe && (
                  <div
                    className="chat-avatar"
                    style={{ backgroundColor: msg.user?.avatar || '#6366f1' }}
                  >
                    {(msg.user?.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className={`chat-bubble ${isMe ? 'bubble-me' : 'bubble-peer'}`}>
                  {!isMe && (
                    <div className="bubble-sender" style={{ color: msg.user?.color || '#a5b4fc' }}>
                      {msg.user?.name || 'Anonymous'}
                    </div>
                  )}
                  <div className="bubble-text">{msg.text}</div>
                  <div className="bubble-time">
                    {msg.createdAt
                      ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Just now'}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSubmit} className="chat-input-bar">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Send a message or code hint..."
          className="chat-input"
          autoFocus
        />
        <button type="submit" disabled={!inputText.trim()} className="chat-send-btn">
          <Send size={15} />
        </button>
      </form>

      <style>{`
        .chat-drawer-container {
          width: 320px;
          height: 100%;
          background: var(--bg-surface-elevated, #16171c);
          border-left: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          z-index: 40;
          animation: slideIn 0.15s ease;
        }
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .chat-drawer-header {
          padding: 10px 14px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
        }
        .chat-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .chat-header-title h4 {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
        }
        .chat-icon-accent {
          color: var(--text-primary);
        }
        .chat-messages-body {
          flex: 1;
          padding: 14px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .chat-empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-align: center;
          color: var(--text-muted);
          gap: 6px;
        }
        .empty-icon {
          color: var(--text-dim);
          margin-bottom: 4px;
        }
        .chat-empty-state p {
          font-size: 13px;
          color: var(--text-secondary);
          font-weight: 500;
        }
        .chat-empty-state span {
          font-size: 11px;
        }
        .system-message {
          display: flex;
          justify-content: center;
          margin: 4px 0;
        }
        .system-pill {
          font-size: 11px;
          color: var(--text-muted);
          background: rgba(255, 255, 255, 0.03);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          border: 1px solid var(--border-subtle);
        }
        .chat-bubble-row {
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .row-me {
          justify-content: flex-end;
        }
        .row-peer {
          justify-content: flex-start;
        }
        .chat-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 600;
          color: #fff;
          flex-shrink: 0;
        }
        .chat-bubble {
          max-width: 80%;
          padding: 6px 10px;
          border-radius: var(--radius-sm);
          font-size: 12px;
          line-height: 1.4;
          word-break: break-word;
        }
        .bubble-me {
          background: #27272a;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-bottom-right-radius: 2px;
        }
        .bubble-peer {
          background: rgba(255, 255, 255, 0.04);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
          border-bottom-left-radius: 2px;
        }
        .bubble-sender {
          font-size: 10px;
          font-weight: 600;
          margin-bottom: 2px;
          color: var(--text-muted);
        }
        .bubble-text {
          white-space: pre-wrap;
        }
        .bubble-time {
          font-size: 9px;
          opacity: 0.6;
          margin-top: 3px;
          text-align: right;
        }
        .chat-input-bar {
          padding: 10px 12px;
          border-top: 1px solid var(--border-subtle);
          display: flex;
          gap: 8px;
          background: var(--bg-secondary);
        }
        .chat-input {
          flex: 1;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-medium);
          border-radius: var(--radius-xs);
          padding: 6px 10px;
          color: var(--text-primary);
          font-size: 12px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .chat-input:focus {
          border-color: var(--border-focus);
        }
        .chat-send-btn {
          padding: 6px 10px;
          background: #ffffff;
          color: #09090b;
          border: 1px solid #ffffff;
          border-radius: var(--radius-xs);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.12s ease;
        }
        .chat-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }
        .chat-send-btn:not(:disabled):hover {
          background: #e4e4e7;
        }
      `}</style>
    </aside>
  );
};
