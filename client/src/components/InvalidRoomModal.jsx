import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X, Layers } from 'lucide-react';

export const InvalidRoomModal = ({ isOpen, onClose, roomId, onBrowseRooms }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleBrowse = () => {
    onClose();
    if (onBrowseRooms) {
      onBrowseRooms();
    } else {
      navigate('/rooms');
    }
  };

  return (
    <div className="modal-backdrop invalid-room-backdrop" onClick={onClose}>
      <div className="modal-dialog invalid-room-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title-group">
            <div className="modal-icon-badge alert-badge">
              <AlertCircle size={22} />
            </div>
            <div>
              <h3>Room Not Found</h3>
              <p className="modal-subtitle">Invalid room identifier</p>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} title="Close alert">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          <div className="invalid-room-info">
            <p className="invalid-room-desc">
              The room{' '}
              {roomId ? <span className="invalid-room-code font-code">#{roomId}</span> : 'you requested'}{' '}
              was not found. It may have expired, been deleted, or the ID was entered incorrectly.
            </p>
            <p className="invalid-room-hint">
              No new room was created. Please check the room code or explore public rooms.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer invalid-room-footer">
          <button className="btn btn-secondary btn-sm" onClick={onClose}>
            Dismiss
          </button>
          <button className="btn btn-primary btn-sm" onClick={handleBrowse}>
            <Layers size={14} />
            <span>Explore Rooms</span>
          </button>
        </div>
      </div>

      <style>{`
        /* Minimalist Modal Backdrop */
        .invalid-room-backdrop {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(8, 9, 13, 0.7);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 99999;
          padding: 20px;
          animation: modalFadeIn 0.12s ease-out;
        }

        /* Minimalist Modal Dialog */
        .modal-dialog.invalid-room-modal {
          width: 100%;
          max-width: 440px;
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

        .alert-badge {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          background: #181922;
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #d1d5db;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
        }

        .modal-title-group h3 {
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
          font-family: var(--font-code);
          letter-spacing: 0.02em;
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

        /* Modal Body */
        .modal-body {
          margin-bottom: 24px;
        }

        .invalid-room-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
          background: #14161f;
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 4px;
          padding: 14px 16px;
        }

        .invalid-room-desc {
          font-size: 13px;
          line-height: 1.6;
          color: #cbd5e1;
          margin: 0;
        }

        .invalid-room-code {
          color: #f9fafb;
          font-weight: 600;
          background: #1e212d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 1px 6px;
          border-radius: 3px;
        }

        .invalid-room-hint {
          font-size: 12px;
          line-height: 1.55;
          color: #94a3b8;
          margin: 0;
        }

        /* Modal Footer */
        .invalid-room-footer {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 10px;
        }

        .invalid-room-footer .btn {
          font-size: 13px;
          font-weight: 500;
          padding: 7px 14px;
          border-radius: 4px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }

        .invalid-room-footer .btn-secondary {
          background: #14161f;
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: #d1d5db;
        }

        .invalid-room-footer .btn-secondary:hover {
          background: #1a1d28;
          border-color: rgba(255, 255, 255, 0.18);
          color: #ffffff;
        }

        .invalid-room-footer .btn-primary {
          background: #f9fafb;
          border: 1px solid #ffffff;
          color: #0b0c10;
          font-weight: 600;
        }

        .invalid-room-footer .btn-primary:hover {
          background: #e5e7eb;
          border-color: #e5e7eb;
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
