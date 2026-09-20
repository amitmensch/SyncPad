import React, { useState } from 'react';
import { Copy, Check, X, Share2, Users } from 'lucide-react';

export const ShareModal = ({ isOpen, onClose, roomId, roomTitle }) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen) return null;

  const shareUrl = `${window.location.origin}/editor/${roomId}`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'link') {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Share2 size={18} />
            </div>
            <div>
              <h3 className="modal-title">Share Session</h3>
              <p className="modal-subtitle">Invite collaborators to code together in real-time</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body">
          {/* Room Title display */}
          <div className="share-room-meta">
            <span className="room-meta-label">Active Workspace</span>
            <span className="room-meta-name">{roomTitle}</span>
          </div>

          {/* Share Link Row */}
          <div className="share-field-group">
            <label className="field-label">Invite Link</label>
            <div className="copy-input-row">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="copy-input font-code"
              />
              <button
                className={`btn btn-primary btn-sm ${copiedLink ? 'copied-btn' : ''}`}
                onClick={() => copyToClipboard(shareUrl, 'link')}
              >
                {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedLink ? 'Copied Link' : 'Copy Link'}</span>
              </button>
            </div>
          </div>

          {/* Room ID Row */}
          <div className="share-field-group">
            <label className="field-label">Room ID Code</label>
            <div className="copy-input-row">
              <input
                type="text"
                readOnly
                value={roomId}
                className="copy-input font-code"
              />
              <button
                className={`btn btn-secondary btn-sm ${copiedId ? 'copied-btn' : ''}`}
                onClick={() => copyToClipboard(roomId, 'id')}
              >
                {copiedId ? <Check size={15} /> : <Copy size={15} />}
                <span>{copiedId ? 'Copied ID' : 'Copy ID'}</span>
              </button>
            </div>
          </div>

          {/* Info cards */}
          <div className="share-tips-container">
            <div className="tip-item">
              <Users size={16} className="tip-icon" />
              <span>Peers will see your cursor movements, code keystrokes, and selections in real time.</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>

      <style>{`
        .modal-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(8, 9, 13, 0.72);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          animation: modalFadeIn 0.12s ease-out;
        }
        .modal-dialog {
          width: 100%;
          max-width: 460px;
          background: #0f1015;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 6px;
          padding: 24px;
          box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6);
          box-sizing: border-box;
          animation: modalSlideUp 0.14s ease-out;
        }
        .modal-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        .modal-title-group {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }
        .modal-icon-badge {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          background: #14161f;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #f9fafb;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .modal-title {
          font-size: 15px;
          font-weight: 600;
          color: #f9fafb;
          letter-spacing: -0.015em;
          margin: 0;
          line-height: 1.3;
        }
        .modal-subtitle {
          font-size: 12px;
          color: #6b7280;
          margin: 3px 0 0 0;
        }
        .modal-close-btn {
          background: transparent;
          border: 1px solid transparent;
          color: #6b7280;
          border-radius: 4px;
          cursor: pointer;
          padding: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: color 0.15s ease, background 0.15s ease, border-color 0.15s ease;
        }
        .modal-close-btn:hover {
          color: #f9fafb;
          background: #161822;
          border-color: rgba(255, 255, 255, 0.08);
        }
        .modal-body {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .share-room-meta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #14161f;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 4px;
          padding: 8px 12px;
          font-size: 12px;
        }
        .room-meta-label {
          color: #6b7280;
          font-family: var(--font-code);
          letter-spacing: 0.02em;
          font-size: 11px;
        }
        .room-meta-name {
          color: #f9fafb;
          font-weight: 500;
          max-width: 260px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .share-field-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .field-label {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .copy-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .copy-input {
          flex: 1;
          background: #12141a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          color: #f3f4f6;
          font-size: 12.5px;
          padding: 7px 10px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .copy-input:focus {
          border-color: rgba(255, 255, 255, 0.28);
        }
        .font-code {
          font-family: var(--font-code);
        }
        .share-tips-container {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 2px;
        }
        .tip-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11.5px;
          color: #9ca3af;
          background: #14161f;
          border: 1px solid rgba(255, 255, 255, 0.06);
          padding: 8px 12px;
          border-radius: 4px;
          line-height: 1.45;
        }
        .tip-icon {
          color: #6b7280;
          flex-shrink: 0;
        }
        .modal-footer {
          margin-top: 20px;
          display: flex;
          justify-content: flex-end;
        }
        .modal-footer .btn {
          font-size: 13px;
          font-weight: 500;
          padding: 7px 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        .copied-btn {
          background: #1e212d !important;
          color: #34d399 !important;
          border-color: rgba(52, 211, 153, 0.3) !important;
        }
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.99);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};
