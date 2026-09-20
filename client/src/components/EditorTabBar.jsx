import React from 'react';
import { X, Plus, Play, Sparkles } from 'lucide-react';
import { getFileBadgeInfo, getInitials } from '../utils/fileIcons';

export const EditorTabBar = ({
  openFiles = [],
  activeFileId,
  onSelectTab,
  onCloseTab,
  onNewFile,
  peers = [],
  entrypointId,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: '#0c0c0f',
        borderBottom: '1px solid #222228',
        height: '38px',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', flex: 1, height: '100%' }}>
        {openFiles.map((file) => {
          const isActive = file.id === activeFileId;
          const isEntry = file.id === entrypointId || file.isEntrypoint;
          const badge = getFileBadgeInfo(file.name);

          // Find other peers viewing this file
          const viewingPeers = peers.filter(
            (p) => !p.isMe && (p.activeFileId === file.id || (file.path && p.activeFileId === file.path))
          );

          // Check if multiple open files share the same filename for directory disambiguation
          const isDuplicateName = openFiles.filter((f) => f.name === file.name).length > 1;
          const parentDir = file.path ? file.path.substring(0, file.path.lastIndexOf('/')) : '';
          const parentName = parentDir && parentDir !== '/' ? parentDir.split('/').filter(Boolean).pop() : '';

          return (
            <div
              key={file.id}
              onClick={() => onSelectTab(file.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 12px',
                height: '100%',
                background: isActive ? '#16161c' : '#0c0c0f',
                color: isActive ? '#ffffff' : '#888894',
                fontSize: '12px',
                fontWeight: isActive ? 600 : 400,
                cursor: 'pointer',
                borderRight: '1px solid #1c1c22',
                borderTop: isActive ? '2px solid #ffffff' : '2px solid transparent',
                transition: 'background 0.15s ease, color 0.15s ease',
                position: 'relative',
                whiteSpace: 'nowrap',
              }}
              title={`${file.path || file.name} ${isEntry ? '(Execution Entrypoint)' : ''}`}
            >
              {/* Language Tag */}
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 4px',
                  borderRadius: '3px',
                  color: badge.color,
                  background: badge.badgeBg,
                  lineHeight: '1.2',
                }}
              >
                {badge.badgeText}
              </span>

              {/* File Name & Path Disambiguation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{file.name}</span>
                {isDuplicateName && parentName && (
                  <span style={{ fontSize: '10px', color: '#71717a', opacity: 0.8 }}>
                    {parentName}
                  </span>
                )}
              </div>

              {/* Entrypoint indicator */}
              {isEntry && (
                <span
                  title="Execution Entrypoint"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#ffffff',
                  }}
                >
                  <Play size={8} fill="#ffffff" />
                </span>
              )}

              {/* Peer viewing indicator dots */}
              {viewingPeers.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '3.5px', marginLeft: '4px' }}>
                  {viewingPeers.slice(0, 4).map((peer, idx) => (
                    <span
                      key={peer.id || peer.socketId || idx}
                      title={`${peer.name || 'Collaborator'} is currently viewing this file`}
                      style={{
                        display: 'inline-block',
                        width: '7.5px',
                        height: '7.5px',
                        borderRadius: '50%',
                        backgroundColor: peer.color || '#3b82f6',
                        boxShadow: `0 0 5px ${peer.color || '#3b82f6'}bb`,
                        border: '1px solid rgba(255, 255, 255, 0.3)',
                        flexShrink: 0,
                      }}
                    />
                  ))}
                  {viewingPeers.length > 4 && (
                    <span style={{ fontSize: '9px', color: '#888894', fontWeight: 700 }}>
                      +{viewingPeers.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Close Tab Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCloseTab(file.id);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'inherit',
                  padding: '2px',
                  borderRadius: '3px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.6,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.6')}
                title="Close Tab"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}

        {/* Quick New File Tab Button */}
        <button
          onClick={onNewFile}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#71717a',
            padding: '0 10px',
            height: '100%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#71717a')}
          title="Create New File"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
};
