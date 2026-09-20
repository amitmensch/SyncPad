import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { CreateRoomModal } from '../components/CreateRoomModal';
import { InvalidRoomModal } from '../components/InvalidRoomModal';
import {
  Plus,
  Search,
  Code2,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  FolderCode,
  Users,
} from 'lucide-react';

export const DashboardPage = () => {
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  const [createdRooms, setCreatedRooms] = useState([]);
  const [joinedRooms, setJoinedRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'created' | 'joined'

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invalidRoomId, setInvalidRoomId] = useState(null);

  // Copy feedback
  const [copiedId, setCopiedId] = useState(null);

  const fetchUserRooms = async () => {
    setLoading(true);
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch('/api/rooms/user/mine', { headers });
      if (res.ok) {
        const data = await res.json();
        setCreatedRooms(data.createdRooms || []);
        setJoinedRooms(data.joinedRooms || []);
      }
    } catch (err) {
      console.error('Error fetching dashboard rooms:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login?redirect=dashboard');
      return;
    }
    if (isAuthenticated) {
      fetchUserRooms();
    }
  }, [token, isAuthenticated, isLoading]);

  const handleDeleteRoom = async (roomId, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this room permanently?')) return;

    try {
      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCreatedRooms(createdRooms.filter((r) => r.roomId !== roomId));
      }
    } catch (err) {
      console.error('Error deleting room:', err);
    }
  };

  const handleCopyLink = (roomId, e) => {
    e.stopPropagation();
    const link = `${window.location.origin}/editor/${roomId}`;
    navigator.clipboard.writeText(link);
    setCopiedId(roomId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  let displayedRooms = [];
  if (activeTab === 'all') {
    const seen = new Set();
    displayedRooms = [...createdRooms, ...joinedRooms].filter((r) => {
      if (seen.has(r.roomId)) return false;
      seen.add(r.roomId);
      return true;
    });
  } else if (activeTab === 'created') {
    displayedRooms = createdRooms;
  } else if (activeTab === 'joined') {
    displayedRooms = joinedRooms;
  }

  const filteredRooms = displayedRooms.filter((r) => {
    return (
      r.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.roomId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="dashboard-root">
      <Navbar />

      <main className="dashboard-content">
        {/* Header Block with Ample Whitespace & Clear Hierarchy */}
        <div className="dashboard-header">
          <div className="dashboard-header-text">
            <div className="dashboard-kicker font-code">
              <span className="kicker-dot" />
              <span>WORKSPACE ENVIRONMENT</span>
            </div>
            <h1 className="dashboard-title">Developer Dashboard</h1>
            <p className="dashboard-subtitle">
              Manage personal repositories, team sessions, and collaborative workspaces.
            </p>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="dashboard-btn-create">
            <Plus size={14} strokeWidth={2.5} />
            <span>New Room</span>
          </button>
        </div>

        {/* Minimalist Metrics Grid */}
        <div className="dashboard-metrics-grid">
          <div className="metric-panel">
            <div className="metric-header">
              <span className="metric-title">Created Workspaces</span>
              <FolderCode size={16} className="metric-icon" />
            </div>
            <div className="metric-value font-code">{createdRooms.length}</div>
            <div className="metric-subtext">Owner permissions & active admin controls</div>
          </div>

          <div className="metric-panel">
            <div className="metric-header">
              <span className="metric-title">Joined Collaborations</span>
              <Users size={16} className="metric-icon" />
            </div>
            <div className="metric-value font-code">{joinedRooms.length}</div>
            <div className="metric-subtext">External peer sessions and team workspaces</div>
          </div>
        </div>

        {/* Minimalist Filter & Search Toolbar */}
        <div className="dashboard-toolbar">
          <div className="toolbar-tab-segment">
            <button
              type="button"
              className={`segment-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              <span>All</span>
              <span className="segment-badge font-code">
                {createdRooms.length + joinedRooms.length}
              </span>
            </button>
            <button
              type="button"
              className={`segment-btn ${activeTab === 'created' ? 'active' : ''}`}
              onClick={() => setActiveTab('created')}
            >
              <span>Created</span>
              <span className="segment-badge font-code">{createdRooms.length}</span>
            </button>
            <button
              type="button"
              className={`segment-btn ${activeTab === 'joined' ? 'active' : ''}`}
              onClick={() => setActiveTab('joined')}
            >
              <span>Joined</span>
              <span className="segment-badge font-code">{joinedRooms.length}</span>
            </button>
          </div>

          <div className="toolbar-search-wrap">
            <div className="search-field">
              <Search size={14} className="search-glyph" />
              <input
                type="text"
                placeholder="Filter by title, description, or #id..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-control"
              />
            </div>
          </div>
        </div>

        {/* Workspaces List / Loading / Empty State */}
        {loading ? (
          <div className="dashboard-loading font-code">
            <div className="spinner-indicator" />
            <span>Fetching workspace metadata...</span>
          </div>
        ) : filteredRooms.length === 0 ? (
          <div className="dashboard-empty-state">
            <div className="empty-symbol-box">
              <Code2 size={20} strokeWidth={2} />
            </div>
            <h3 className="empty-heading">No workspaces found</h3>
            <p className="empty-message">
              {activeTab === 'joined'
                ? "You haven't joined any team workspaces yet."
                : searchTerm
                ? `No workspaces match "${searchTerm}".`
                : 'Create your first collaborative workspace to start coding.'}
            </p>
            {searchTerm ? (
              <button onClick={() => setSearchTerm('')} className="empty-action-btn font-code">
                Clear Search Filter
              </button>
            ) : (
              <button onClick={() => setIsModalOpen(true)} className="empty-action-btn font-code">
                <Plus size={12} />
                <span>Create Workspace</span>
              </button>
            )}
          </div>
        ) : (
          <div className="dashboard-table">
            {filteredRooms.map((room) => {
              const isCopied = copiedId === room.roomId;
              const isOwner = createdRooms.some((c) => c.roomId === room.roomId);

              return (
                <div
                  key={room.roomId}
                  className="dashboard-row-item"
                  onClick={() => navigate(`/editor/${room.roomId}`)}
                >
                  <div className="dashboard-row-main">
                    <div className="dashboard-row-headline">
                      <span className="room-title-text">{room.title}</span>
                      <span className="room-code-tag font-code">#{room.roomId}</span>
                      {isOwner ? (
                        <span className="badge-role badge-host font-code">Host</span>
                      ) : (
                        <span className="badge-role badge-collab font-code">Member</span>
                      )}
                    </div>

                    <p className="dashboard-row-desc">
                      {room.description || 'Collaborative real-time development environment.'}
                    </p>

                    <div className="dashboard-row-footer">
                      {room.updatedAt && (
                        <span className="time-text font-code">
                          Updated {new Date(room.updatedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="dashboard-row-actions" onClick={(e) => e.stopPropagation()}>
                    {token && room.owner && String(room.owner) === String(user?.id) && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteRoom(room.roomId, e)}
                        className="btn-action-delete"
                        title="Delete Workspace"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => handleCopyLink(room.roomId, e)}
                      className="btn-action-copy font-code"
                      title="Copy Invite Link"
                    >
                      {isCopied ? (
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
                      onClick={() => navigate(`/editor/${room.roomId}`)}
                      className="btn-action-open"
                    >
                      <span>Open</span>
                      <ExternalLink size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <CreateRoomModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={(newRoom) => {
          fetchUserRooms();
          navigate(`/editor/${newRoom.roomId}`);
        }}
      />

      <InvalidRoomModal
        isOpen={!!invalidRoomId}
        onClose={() => setInvalidRoomId(null)}
        roomId={invalidRoomId}
      />

      <Footer />

      <style>{`
        .dashboard-root {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary, #090a0f);
          color: var(--text-primary, #f3f4f6);
        }

        /* Minimalist Dashboard Content Container */
        .dashboard-content {
          max-width: 1140px;
          margin: 0 auto;
          padding: 64px 24px 96px;
          width: 100%;
        }

        /* Architectural Header */
        .dashboard-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 36px;
          gap: 24px;
          flex-wrap: wrap;
        }

        .dashboard-header-text {
          max-width: 680px;
        }

        .dashboard-kicker {
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

        .dashboard-title {
          font-size: 32px;
          font-weight: 500;
          letter-spacing: -0.03em;
          color: #ffffff;
          line-height: 1.15;
          margin: 0 0 10px 0;
        }

        .dashboard-subtitle {
          font-size: 14px;
          color: var(--text-secondary, #9ca3af);
          line-height: 1.6;
          margin: 0;
        }

        .dashboard-btn-create {
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

        .dashboard-btn-create:hover {
          background: #e5e7eb;
          border-color: #e5e7eb;
          transform: translateY(-1px);
        }

        /* Minimalist Metric Panels */
        .dashboard-metrics-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
          margin-bottom: 36px;
        }

        .metric-panel {
          padding: 20px 24px;
          background: #0c0e14;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 8px;
          transition: border-color 0.15s ease;
        }

        .metric-panel:hover {
          border-color: rgba(255, 255, 255, 0.14);
        }

        .metric-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .metric-title {
          font-size: 13px;
          font-weight: 500;
          color: #71717a;
        }

        .metric-icon {
          color: #52525b;
        }

        .metric-value {
          font-size: 28px;
          font-weight: 500;
          color: #ffffff;
          line-height: 1;
          margin-bottom: 8px;
          letter-spacing: -0.02em;
        }

        .metric-subtext {
          font-size: 12px;
          color: #71717a;
        }

        /* Minimalist Filter & Search Toolbar */
        .dashboard-toolbar {
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
        .dashboard-loading {
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
        .dashboard-empty-state {
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

        .empty-action-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          letter-spacing: 0.02em;
          padding: 7px 14px;
          background: transparent;
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .empty-action-btn:hover {
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.3);
          background: rgba(255, 255, 255, 0.04);
        }

        /* Minimalist Dashboard Workspaces Table */
        .dashboard-table {
          display: flex;
          flex-direction: column;
          background: #0c0e14;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }

        .dashboard-row-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 22px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          cursor: pointer;
          transition: background-color 0.12s ease;
          gap: 20px;
        }

        .dashboard-row-item:last-child {
          border-bottom: none;
        }

        .dashboard-row-item:hover {
          background-color: #11131a;
        }

        .dashboard-row-main {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .dashboard-row-headline {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .room-title-text {
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          letter-spacing: -0.01em;
          transition: color 0.12s ease;
        }

        .dashboard-row-item:hover .room-title-text {
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

        .badge-role {
          font-size: 10px;
          padding: 1px 6px;
          border-radius: 3px;
          letter-spacing: 0.03em;
        }

        .badge-host {
          background: rgba(255, 255, 255, 0.06);
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.12);
        }

        .badge-collab {
          background: rgba(255, 255, 255, 0.03);
          color: #71717a;
          border: 1px solid rgba(255, 255, 255, 0.06);
        }

        .dashboard-row-desc {
          font-size: 13px;
          color: #9ca3af;
          line-height: 1.45;
          margin: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .dashboard-row-footer {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #71717a;
          margin-top: 2px;
        }

        .time-text {
          color: #71717a;
        }

        .dashboard-row-actions {
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

        .btn-action-delete {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 8px;
          color: #71717a;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-action-delete:hover {
          color: #f87171;
          background: rgba(248, 113, 113, 0.08);
          border-color: rgba(248, 113, 113, 0.2);
        }

        .btn-action-open {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          font-size: 12px;
          font-weight: 500;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.1);
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .btn-action-open:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.2);
          color: #ffffff;
        }

        @media (max-width: 768px) {
          .dashboard-content {
            padding: 40px 16px 64px;
          }

          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .dashboard-metrics-grid {
            grid-template-columns: 1fr;
          }

          .dashboard-toolbar {
            flex-direction: column;
            align-items: stretch;
          }

          .toolbar-search-wrap {
            max-width: 100%;
          }

          .dashboard-row-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 14px;
          }

          .dashboard-row-actions {
            width: 100%;
            justify-content: flex-end;
          }
        }
      `}</style>
    </div>
  );
};
