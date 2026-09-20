import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Lock, Globe } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const CreateRoomModal = ({ isOpen, onClose, onSuccess }) => {
  const navigate = useNavigate();
  const { user, token, isAuthenticated } = useAuth();

  const [title, setTitle] = useState('');
  const [customId, setCustomId] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  if (!isAuthenticated) {
    return (
      <div className="modal-backdrop" onClick={onClose}>
        <div className="modal-dialog glass-panel" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-title-group">
              <div className="modal-icon-badge">
                <Lock size={18} />
              </div>
              <div>
                <h3>Account Required</h3>
                <p className="modal-subtitle">Sign in required to create rooms</p>
              </div>
            </div>
            <button className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.6, marginBottom: '20px' }}>
            Creating collaborative rooms requires a registered account on syncpad. Please sign in or create a free account to continue.
          </p>
          <div className="modal-footer">
            <button onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button
              onClick={() => {
                onClose();
                navigate('/login?redirect=create');
              }}
              className="btn btn-primary"
            >
              Sign In / Register
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!title.trim()) {
      setError('Please provide a title for your room.');
      return;
    }

    setIsCreating(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: title.trim(),
          customRoomId: customId.trim() || undefined,
          description: description.trim(),
          isPublic,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create room.');
      }

      // Record in user-scoped recent rooms
      try {
        const rid = data.room.roomId;
        const storageKey = user?.id ? `syncpad_recent_rooms_${user.id}` : 'syncpad_recent_rooms_guest';
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updated = [
          { roomId: rid, title: data.room.title, lastVisited: Date.now() },
          ...stored.filter((r) => r.roomId !== rid),
        ].slice(0, 20);
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (err) {}

      onClose();
      if (onSuccess) onSuccess(data.room);
      navigate(`/editor/${data.room.roomId}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-dialog glass-panel" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge">
              <Plus size={18} />
            </div>
            <div>
              <h3>New Room</h3>
              <p className="modal-subtitle">Configure your collaborative workspace</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="modal-error-alert animate-fade-in">
            <span>{error}</span>
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="input-group">
            <label className="input-label">Room Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Distributed Consensus Engine"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input-field"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Custom Room ID / Slug (Optional)</label>
            <input
              type="text"
              placeholder="e.g. team-algo-101 (leave empty for auto-generated)"
              value={customId}
              onChange={(e) => setCustomId(e.target.value)}
              className="input-field font-code"
            />
          </div>


          <div className="input-group">
            <label className="input-label">Room Description (Optional)</label>
            <textarea
              placeholder="Brief description of what you and your team will code in this room..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field textarea-field"
              rows={2}
            />
          </div>

          <div className="input-group">
            <label className="input-label">Visibility</label>
            <div className="visibility-options">
              <button
                type="button"
                className={`visibility-btn ${isPublic ? 'active' : ''}`}
                onClick={() => setIsPublic(true)}
              >
                <Globe size={15} />
                <span>Public (Listed in Rooms)</span>
              </button>
              <button
                type="button"
                className={`visibility-btn ${!isPublic ? 'active' : ''}`}
                onClick={() => setIsPublic(false)}
              >
                <Lock size={15} />
                <span>Private (Direct link only)</span>
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isCreating} className="btn btn-primary">
              <span>{isCreating ? 'Creating...' : 'Create'}</span>
            </button>
          </div>
        </form>
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
          max-width: 480px;
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
        .modal-header h3 {
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
        .btn-icon {
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
        .btn-icon:hover {
          color: #f9fafb;
          background: #161822;
          border-color: rgba(255, 255, 255, 0.08);
        }
        .modal-error-alert {
          background: #1c1417;
          border: 1px solid rgba(244, 63, 94, 0.25);
          color: #fda4af;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          margin-bottom: 14px;
        }
        .modal-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .input-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .input-label {
          font-size: 11px;
          font-weight: 600;
          color: #9ca3af;
          letter-spacing: 0.04em;
          text-transform: uppercase;
        }
        .input-field {
          background: #12141a;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          color: #f3f4f6;
          font-size: 13px;
          padding: 8px 12px;
          outline: none;
          transition: border-color 0.15s ease;
        }
        .input-field:focus {
          border-color: rgba(255, 255, 255, 0.28);
        }
        .textarea-field {
          resize: vertical;
          min-height: 60px;
        }
        .visibility-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .visibility-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          color: #9ca3af;
          background: #14161f;
          border: 1px solid rgba(255, 255, 255, 0.08);
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .visibility-btn:hover {
          color: #f9fafb;
          border-color: rgba(255, 255, 255, 0.18);
        }
        .visibility-btn.active {
          background: #1e212d;
          color: #f9fafb;
          border-color: rgba(255, 255, 255, 0.24);
        }
        .modal-footer {
          margin-top: 18px;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }
        .modal-footer .btn {
          font-size: 13px;
          font-weight: 500;
          padding: 7px 16px;
          border-radius: 4px;
          cursor: pointer;
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

// Re-export as CreateStudioModal for backwards-compatibility if referenced anywhere
export const CreateStudioModal = CreateRoomModal;
