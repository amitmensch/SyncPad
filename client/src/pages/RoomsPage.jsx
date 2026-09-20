import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { InvalidRoomModal } from '../components/InvalidRoomModal';
import { useAuth } from '../context/AuthContext';
import {
  Search,
  ArrowRight,
  Code2,
  Copy,
  Check,
  User,
  Plus,
} from 'lucide-react';

export const RoomsPage = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [dbRooms, setDbRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'live' | 'idle'
  const [copiedId, setCopiedId] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [invalidRoomId, setInvalidRoomId] = useState(null);

  const handleSearchKeyDown = async (e) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const clean = searchQuery.trim().replace(/^#/, '').toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const existing = dbRooms.find((r) => r.roomId === clean);
      if (existing) {
        navigate(`/editor/${existing.roomId}`);
        return;
      }
      try {
        const res = await fetch(`/api/rooms/${clean}`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.room) {
            navigate(`/editor/${clean}`);
            return;
          }
        }
        setInvalidRoomId(clean);
      } catch (err) {
        setInvalidRoomId(clean);
      }
    }
  };

  const fetchRooms = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) queryParams.append('search', searchQuery.trim());

      const res = await fetch(`/api/rooms?${queryParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDbRooms(data.rooms || []);
      }
    } catch (err) {
      console.error('Error fetching rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(fetchRooms, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const interval = setInterval(fetchRooms, 5000);
    return () => clearInterval(interval);
  }, [searchQuery]);

  const liveRooms = useMemo(() => dbRooms.filter((r) => r.isLive || r.onlineCount > 0), [dbRooms]);
  const idleRooms = useMemo(() => dbRooms.filter((r) => !r.isLive && (!r.onlineCount || r.onlineCount === 0)), [dbRooms]);

  const filteredRooms = useMemo(() => {
    let list = dbRooms;
    if (activeTab === 'live') list = liveRooms;
    if (activeTab === 'idle') list = idleRooms;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.title?.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.roomId?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [dbRooms, liveRooms, idleRooms, activeTab, searchQuery]);

  const handleCopyLink = (roomId, e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/editor/${roomId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="rooms-root">
      <Navbar />

      <main className="rooms-content">
        {/* Header Block with Ample Whitespace */}
        <div className="rooms-header">
          <div className="rooms-header-text">
            <div className="rooms-kicker font-code">
              <span className="kicker-dot" />
              <span>COLLABORATIVE REGISTRY</span>
            </div>
            <h1 className="rooms-title">Public Workspaces</h1>
            <p className="rooms-subtitle">
              Active peer sessions and persisted team rooms across the distributed sync cluster.
            </p>
          </div>

          <button
            onClick={() => {
              if (!isAuthenticated) {
                navigate('/login?redirect=create');
              } else {
                setIsCreateOpen(true);
              }
            }}
            className="rooms-btn-create"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Create Workspace</span>
          </button>
        </div>

        {/* Minimalist Filter & Search Toolbar */}
        <div className="rooms-toolbar">
          <div className="toolbar-tab-segment">
            <button
              type="button"
              className={`segment-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>All</span>
              <span className="segment-badge font-code">{dbRooms.length}</span>
            </button>

            <button
              type="button"
              className={`segment-btn ${activeTab === 'live' ? 'active' : ''}`}
              onClick={() => setActiveTab('live')}
            >
              <span className="live-bullet" />
              <span>Live</span>
              <span className="segment-badge font-code">{liveRooms.length}</span>
            </button>

            <button
              type="button"
              className={`segment-btn ${activeTab === 'idle' ? 'active' : ''}`}
              onClick={() => setActiveTab('idle')}
            >
              <span>Offline</span>
              <span className="segment-badge font-code">{idleRooms.length}</span>
            </button>
          </div>

          <div className="toolbar-search-wrap">
            <div className="search-field">
              <Search size={14} className="search-glyph" />
              <input
                type="text"
                placeholder="Filter by title, creator, or #id..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                className="search-control"
              />
            </div>
          </div>
        </div>

        {/* Rooms Listing or Empty/Loading State */}
        {loading ? (
          <div className="rooms-loading-container font-code">
            <div className="spinner-indicator" />
            <span>Resolving peer registry...</span>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="rooms-empty-container">
            <div className="empty-symbol-box">
              <Code2 size={20} strokeWidth={2} />
            </div>
            <h3 className="empty-heading">No workspaces match criteria</h3>
            <p className="empty-message">
              {activeTab === 'live'
                ? 'There are currently no sessions with active peer connections.'
                : 'No registered workspace matches your filter query.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setActiveTab('all');
              }}
              className="empty-reset-btn font-code"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="rooms-table">
            {filteredRooms.map((item) => {
              const isLive = item.isLive || item.onlineCount > 0;
              const onlineCount = item.onlineCount || 0;

              return (
                <div
                  key={item.roomId}
                  className="room-row-item"
                  onClick={() => navigate(`/editor/${item.roomId}`)}
                >
                  <div className="room-row-main">
                    <div className="room-row-headline">
                      <span className="room-name">{item.title}</span>
                      <span className="room-code-tag font-code">#{item.roomId}</span>
                      {isLive ? (
                        <span className="live-status-pill font-code">
                          <span className="pulse-dot" />
                          <span>{onlineCount} peer{onlineCount !== 1 ? 's' : ''}</span>
                        </span>
                      ) : (
                        <span className="offline-status-pill font-code">offline</span>
                      )}
                    </div>

                    <p className="room-row-desc">
                      {item.description || 'Collaborative real-time coding workspace.'}
                    </p>

                    <div className="room-row-footer">
                      <div className="creator-badge">
                        <User size={11} className="meta-icon" />
                        <span className="creator-text">{item.owner?.username || item.ownerName || 'anonymous'}</span>
                      </div>

                      <span className="meta-divider">/</span>

                      {item.lastActiveAt && (
                        <span className="time-text font-code">
                          active {new Date(item.lastActiveAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="room-row-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(item.roomId, e)}
                      className="btn-action-copy font-code"
                      title="Copy Link"
                    >
                      {copiedId === item.roomId ? (
                        <>
                          <Check size={12} className="text-success" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={12} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate(`/editor/${item.roomId}`)}
                      className={`btn-action-enter ${isLive ? 'enter-live' : 'enter-default'}`}
                    >
                      <span>{isLive ? 'Join Session' : 'Open'}</span>
                      <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />

      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={(newRoom) => navigate(`/editor/${newRoom.roomId}`)}
      />

      <InvalidRoomModal
        isOpen={!!invalidRoomId}
        onClose={() => setInvalidRoomId(null)}
        roomId={invalidRoomId}
      />

      <style>{`
        .rooms-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: var(--bg-primary, #090a0f);
          color: var(--text-primary, #f3f4f6);
        }

        /* Minimalist Main Content Container */
        .rooms-content {
          max-width: 1140px;
          margin: 0 auto;
          padding: 64px 24px 96px;
          width: 100%;
        }

        /* Architectural Header */
        .rooms-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 40px;
          gap: 24px;
          flex-wrap: wrap;
        }

        .rooms-header-text {
          max-width: 680px;
        }

        .rooms-kicker {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted, #71717a);
          margin-bottom: 12px;
          font-weight: 500;
        }

        .kicker-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
        }

        .rooms-title {
          font-size: 32px;
          font-weight: 500;
          letter-spacing: -0.03em;
          color: #ffffff;
          line-height: 1.15;
          margin: 0 0 10px 0;
        }

        .rooms-subtitle {
          font-size: 14px;
          color: var(--text-secondary, #9ca3af);
          line-height: 1.6;
          margin: 0;
        }

        .rooms-btn-create {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 9px 18px;
          background: #ffffff;
          color: #090a0f;
          font-size: 13px;
          font-weight: 500;
          border-radius: 6px;
          border: 1px solid #ffffff;
          cursor: pointer;
          transition: all 0.15s ease;
          flex-shrink: 0;
          white-space: nowrap;
        }

        .rooms-btn-create:hover {
          background: #e5e7eb;
          border-color: #e5e7eb;
          transform: translateY(-1px);
        }

        /* Minimalist Toolbar: Segmented Controls & Subtle Search */
        .rooms-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .toolbar-tab-segment {
          display: inline-flex;
          align-items: center;
          background: #0f1117;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          padding: 3px;
          gap: 2px;
        }

        .segment-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 12px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 4px;
          color: #71717a;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: color 0.12s ease, background-color 0.12s ease;
        }

        .segment-btn:hover {
          color: #e5e7eb;
        }

        .segment-btn.active {
          background: #181b24;
          color: #ffffff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }

        .live-bullet {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
        }

        .segment-badge {
          font-size: 10px;
          color: #71717a;
          background: rgba(255, 255, 255, 0.05);
          padding: 1px 5px;
          border-radius: 3px;
        }

        .segment-btn.active .segment-badge {
          color: #9ca3af;
          background: rgba(255, 255, 255, 0.08);
        }

        .toolbar-search-wrap {
          flex: 1;
          max-width: 320px;
          min-width: 220px;
        }

        .search-field {
          position: relative;
          display: flex;
          align-items: center;
          width: 100%;
        }

        .search-glyph {
          position: absolute;
          left: 11px;
          color: #71717a;
          pointer-events: none;
        }

        .search-control {
          width: 100%;
          padding: 7px 12px 7px 32px;
          background: #0f1117;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          color: #f3f4f6;
          font-size: 12px;
          outline: none;
          transition: border-color 0.15s ease, background 0.15s ease;
        }

        .search-control::placeholder {
          color: #52525b;
        }

        .search-control:focus {
          border-color: rgba(255, 255, 255, 0.25);
          background: #13161f;
        }

        /* Loading State */
        .rooms-loading-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 96px 0;
          color: #71717a;
          font-size: 12px;
          letter-spacing: 0.03em;
        }

        .spinner-indicator {
          width: 14px;
          height: 14px;
          border: 1.5px solid rgba(255, 255, 255, 0.1);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        /* Minimalist Empty State */
        .rooms-empty-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 72px 24px;
          background: #0c0e14;
          border: 1px dashed rgba(255, 255, 255, 0.1);
          border-radius: 8px;
        }

        .empty-symbol-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.04);
          color: #71717a;
          margin-bottom: 16px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .empty-heading {
          font-size: 15px;
          font-weight: 500;
          color: #ffffff;
          margin: 0 0 6px 0;
        }

        .empty-message {
          font-size: 13px;
          color: #71717a;
          max-width: 360px;
          line-height: 1.5;
          margin: 0 0 20px 0;
        }

        .empty-reset-btn {
          font-size: 11px;
          letter-spacing: 0.02em;
          padding: 6px 14px;
          background: transparent;
          color: #9ca3af;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .empty-reset-btn:hover {
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.03);
        }

        /* Minimalist Rooms Listing Table */
        .rooms-table {
          display: flex;
          flex-direction: column;
          background: #0c0e14;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }

        .room-row-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: background-color 0.12s ease;
          gap: 20px;
        }

        .room-row-item:last-child {
          border-bottom: none;
        }

        .room-row-item:hover {
          background-color: #11131a;
        }

        .room-row-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .room-row-headline {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .room-name {
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          letter-spacing: -0.01em;
          transition: color 0.12s ease;
        }

        .room-row-item:hover .room-name {
          color: #e5e7eb;
        }

        .room-code-tag {
          font-size: 11px;
          color: #71717a;
          background: rgba(255, 255, 255, 0.03);
          padding: 1px 6px;
          border-radius: 3px;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .live-status-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #34d399;
          background: rgba(52, 211, 153, 0.08);
          padding: 1px 7px;
          border-radius: 9999px;
          border: 1px solid rgba(52, 211, 153, 0.2);
        }

        .pulse-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #34d399;
        }

        .offline-status-pill {
          font-size: 10px;
          color: #52525b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .room-row-desc {
          font-size: 13px;
          color: #9ca3af;
          line-height: 1.45;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .room-row-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #71717a;
          margin-top: 2px;
        }

        .creator-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .meta-icon {
          color: #71717a;
        }

        .creator-text {
          color: #a1a1aa;
        }

        .meta-divider {
          color: rgba(255, 255, 255, 0.15);
        }

        .time-text {
          color: #71717a;
        }

        .room-row-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-action-copy {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 10px;
          font-size: 11px;
          color: #9ca3af;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-action-copy:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.16);
        }

        .text-success {
          color: #34d399;
        }

        .btn-action-enter {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 4px;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-action-enter.enter-live {
          background: rgba(52, 211, 153, 0.1);
          color: #34d399;
          border-color: rgba(52, 211, 153, 0.25);
        }

        .btn-action-enter.enter-live:hover {
          background: rgba(52, 211, 153, 0.18);
          border-color: rgba(52, 211, 153, 0.4);
        }

        .btn-action-enter.enter-default {
          background: rgba(255, 255, 255, 0.05);
          color: #e5e7eb;
          border-color: rgba(255, 255, 255, 0.1);
        }

        .btn-action-enter.enter-default:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        @media (max-width: 768px) {
          .rooms-content {
            padding: 40px 16px 64px;
          }

          .rooms-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .rooms-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .toolbar-search-wrap {
            max-width: 100%;
          }

          .room-row-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
          }

          .room-row-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
};
