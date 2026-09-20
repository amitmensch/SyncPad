import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Trash2,
  Edit2,
  Play,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Search,
  Minimize2,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { getFileBadgeInfo, getLanguageFromFilename, getTemplateContent, getInitials } from '../utils/fileIcons';
import {
  buildFileTree,
  normalizePath,
  getParentPath,
  getBasename,
  findDescendantIds,
  isMoveAllowed,
  computeMovedPath,
  cascadeMovedPaths,
} from '../utils/fileTree';

export const FileExplorer = ({
  files = [],
  activeFileId,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onSetEntrypoint,
  entrypointId,
  peers = [],
  isOpen,
  onToggleOpen,
  onMoveItem,
  currentUserRole = 'editor',
}) => {
  // Tree expand/collapse state (stored in localStorage for persistence across reloads)
  const [expandedPaths, setExpandedPaths] = useState(() => {
    try {
      const stored = localStorage.getItem('syncpad_expanded_folders');
      return stored ? new Set(JSON.parse(stored)) : new Set(['/']);
    } catch (e) {
      return new Set(['/']);
    }
  });

  // Filter / Search state
  const [searchQuery, setSearchQuery] = useState('');

  // Creation State: { type: 'file' | 'folder', parentPath: string }
  const [creationTarget, setCreationTarget] = useState(null);
  const [creationName, setCreationName] = useState('');

  // Renaming State: { id: string, type: 'file' | 'folder', oldName: string, path: string }
  const [editingTarget, setEditingTarget] = useState(null);
  const [editingName, setEditingName] = useState('');

  // Deletion Confirmation Modal State: { id: string, type: 'file' | 'folder', name: string, path: string, count?: number }
  const [deleteModal, setDeleteModal] = useState(null);

  const creationInputRef = useRef(null);
  const editInputRef = useRef(null);

  // Sync expanded paths to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('syncpad_expanded_folders', JSON.stringify(Array.from(expandedPaths)));
    } catch (e) {}
  }, [expandedPaths]);

  // Focus creation input
  useEffect(() => {
    if (creationTarget && creationInputRef.current) {
      creationInputRef.current.focus();
    }
  }, [creationTarget]);

  // Focus rename input
  useEffect(() => {
    if (editingTarget && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTarget]);

  // Toggle single folder
  const handleToggleFolder = (folderPath, e) => {
    e?.stopPropagation();
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(folderPath)) {
        next.delete(folderPath);
      } else {
        next.add(folderPath);
      }
      return next;
    });
  };

  // Collapse All Folders
  const handleCollapseAll = () => {
    setExpandedPaths(new Set(['/']));
  };

  // Start creation of file or folder
  const handleStartCreation = (type, parentPath = '/', e) => {
    e?.stopPropagation();
    setCreationTarget({ type, parentPath: normalizePath(parentPath) });
    setCreationName('');

    // Ensure parent folder is expanded
    if (parentPath !== '/') {
      setExpandedPaths((prev) => new Set(prev).add(normalizePath(parentPath)));
    }
  };

  // Confirm creation
  const handleConfirmCreation = () => {
    const trimmed = creationName.trim();
    if (!trimmed || !creationTarget) {
      setCreationTarget(null);
      return;
    }

    const parentPath = creationTarget.parentPath;
    const targetPath = normalizePath(`${parentPath}/${trimmed}`);

    // Check for path collisions
    const collision = files.some(
      (f) => normalizePath(f.path || `/${f.name}`).toLowerCase() === targetPath.toLowerCase()
    );
    if (collision) {
      alert(`An item with path "${targetPath}" already exists.`);
      return;
    }

    if (creationTarget.type === 'folder') {
      if (onCreateFolder) {
        onCreateFolder({
          name: trimmed,
          path: targetPath,
          parentPath: parentPath === '/' ? null : parentPath,
        });
      }
      setExpandedPaths((prev) => new Set(prev).add(targetPath));
    } else {
      const lang = getLanguageFromFilename(trimmed);
      const content = getTemplateContent(trimmed, lang);
      onCreateFile({
        name: trimmed,
        path: targetPath,
        parentPath: parentPath === '/' ? null : parentPath,
        language: lang,
        content,
      });
    }

    setCreationTarget(null);
    setCreationName('');
  };

  // Start renaming
  const handleStartRename = (item, e) => {
    e.stopPropagation();
    setEditingTarget({
      id: item.id,
      type: item.type,
      oldName: item.name,
      path: item.path,
    });
    setEditingName(item.name);
  };

  // Confirm rename
  const handleConfirmRename = () => {
    if (!editingTarget) return;
    const trimmed = editingName.trim();
    if (!trimmed || trimmed === editingTarget.oldName) {
      setEditingTarget(null);
      return;
    }

    const parent = getParentPath(editingTarget.path) || '/';
    const newPath = normalizePath(`${parent}/${trimmed}`);

    // Collision check
    const collision = files.some(
      (f) => f.id !== editingTarget.id && normalizePath(f.path || `/${f.name}`).toLowerCase() === newPath.toLowerCase()
    );
    if (collision) {
      alert(`An item with path "${newPath}" already exists.`);
      return;
    }

    if (editingTarget.type === 'directory') {
      if (onRenameFolder) {
        onRenameFolder(editingTarget.id, editingTarget.path, newPath, trimmed);
      }
    } else {
      const newLang = getLanguageFromFilename(trimmed);
      onRenameFile(editingTarget.id, trimmed, newLang, newPath);
    }

    setEditingTarget(null);
  };

  // Start deletion prompt
  const handleStartDelete = (item, e) => {
    e.stopPropagation();
    if (item.type === 'directory') {
      const descendants = findDescendantIds(files, item.path);
      setDeleteModal({
        id: item.id,
        type: 'folder',
        name: item.name,
        path: item.path,
        count: descendants.length,
      });
    } else {
      const fileCount = files.filter((f) => f.type !== 'directory').length;
      if (fileCount <= 1) {
        alert('Cannot delete the only file in the workspace.');
        return;
      }
      setDeleteModal({
        id: item.id,
        type: 'file',
        name: item.name,
        path: item.path,
      });
    }
  };

  // Confirm deletion
  const handleConfirmDelete = () => {
    if (!deleteModal) return;
    if (deleteModal.type === 'folder') {
      if (onDeleteFolder) {
        onDeleteFolder(deleteModal.id, deleteModal.path);
      }
    } else {
      onDeleteFile(deleteModal.id);
    }
    setDeleteModal(null);
  };



  // Drag and Drop State
  const [draggedItem, setDraggedItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { path: string, id?: string, isValid: boolean, isRootCanvas?: boolean }
  const [dropFlashId, setDropFlashId] = useState(null);
  const [collisionModal, setCollisionModal] = useState(null);
  const hoverExpandTimerRef = useRef(null);

  // Clear spring-load hover timer on unmount
  useEffect(() => {
    return () => {
      if (hoverExpandTimerRef.current) {
        clearTimeout(hoverExpandTimerRef.current);
      }
    };
  }, []);

  const executeMove = (item, targetFolderPath, overwrite = false) => {
    if (!item) return;
    const destPath = computeMovedPath(item, targetFolderPath);
    if (onMoveItem) {
      onMoveItem({ item, targetFolderPath, destPath, overwrite });
    }
    // Expand target folder so dropped item is immediately visible
    if (targetFolderPath && targetFolderPath !== '/') {
      setExpandedPaths((prev) => new Set(prev).add(targetFolderPath));
    }
    setDropFlashId(item.id);
    setTimeout(() => setDropFlashId(null), 800);
  };

  // Drag start
  const handleDragStart = (e, node) => {
    if (currentUserRole === 'viewer' || editingTarget) {
      e.preventDefault();
      return;
    }
    setDraggedItem(node);
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Drag end
  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTarget(null);
    if (hoverExpandTimerRef.current) {
      clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = null;
    }
  };

  // Node drag over
  const handleNodeDragOver = (e, targetNode) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedItem || currentUserRole === 'viewer') return;

    const isDir = targetNode.type === 'directory';
    const targetFolderPath = isDir ? targetNode.path : (getParentPath(targetNode.path) || '/');

    const check = isMoveAllowed(draggedItem, targetFolderPath);

    if (check.allowed) {
      e.dataTransfer.dropEffect = 'move';
      setDropTarget({
        path: targetFolderPath,
        id: isDir ? targetNode.id : null,
        isValid: true,
      });

      // Spring-loaded folder hover-expansion
      if (isDir && !targetNode.isExpanded) {
        if (!hoverExpandTimerRef.current) {
          hoverExpandTimerRef.current = setTimeout(() => {
            setExpandedPaths((prev) => new Set(prev).add(targetNode.path));
            hoverExpandTimerRef.current = null;
          }, 500);
        }
      }
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDropTarget({
        path: targetFolderPath,
        id: isDir ? targetNode.id : null,
        isValid: false,
      });
      if (hoverExpandTimerRef.current) {
        clearTimeout(hoverExpandTimerRef.current);
        hoverExpandTimerRef.current = null;
      }
    }
  };

  // Node drag leave
  const handleNodeDragLeave = (e, targetNode) => {
    e.stopPropagation();
    if (hoverExpandTimerRef.current) {
      clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = null;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      setDropTarget((prev) => (prev?.id === targetNode.id ? null : prev));
    }
  };

  // Node drop
  const handleNodeDrop = (e, targetNode) => {
    e.preventDefault();
    e.stopPropagation();

    if (hoverExpandTimerRef.current) {
      clearTimeout(hoverExpandTimerRef.current);
      hoverExpandTimerRef.current = null;
    }

    if (!draggedItem || currentUserRole === 'viewer') {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    const isDir = targetNode.type === 'directory';
    const targetFolderPath = isDir ? targetNode.path : (getParentPath(targetNode.path) || '/');

    const check = isMoveAllowed(draggedItem, targetFolderPath);
    if (!check.allowed) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    const destPath = computeMovedPath(draggedItem, targetFolderPath);

    // Collision check
    const collision = files.some(
      (f) => f.id !== draggedItem.id && normalizePath(f.path || `/${f.name}`).toLowerCase() === destPath.toLowerCase()
    );

    if (collision) {
      setCollisionModal({
        item: draggedItem,
        targetFolderPath,
        targetPath: destPath,
      });
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    executeMove(draggedItem, targetFolderPath, false);
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Container drag over (for root canvas '/')
  const handleContainerDragOver = (e) => {
    e.preventDefault();
    if (!draggedItem || currentUserRole === 'viewer') return;

    const check = isMoveAllowed(draggedItem, '/');
    if (check.allowed) {
      e.dataTransfer.dropEffect = 'move';
      setDropTarget({
        path: '/',
        isValid: true,
        isRootCanvas: true,
      });
    } else {
      e.dataTransfer.dropEffect = 'none';
      setDropTarget({
        path: '/',
        isValid: false,
        isRootCanvas: true,
      });
    }
  };

  // Container drag leave
  const handleContainerDragLeave = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (
      e.clientX < rect.left ||
      e.clientX >= rect.right ||
      e.clientY < rect.top ||
      e.clientY >= rect.bottom
    ) {
      setDropTarget((prev) => (prev?.isRootCanvas ? null : prev));
    }
  };

  // Container drop (drop into root '/')
  const handleContainerDrop = (e) => {
    e.preventDefault();
    if (!draggedItem || currentUserRole === 'viewer') {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    const check = isMoveAllowed(draggedItem, '/');
    if (!check.allowed) {
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    const destPath = computeMovedPath(draggedItem, '/');
    const collision = files.some(
      (f) => f.id !== draggedItem.id && normalizePath(f.path || `/${f.name}`).toLowerCase() === destPath.toLowerCase()
    );

    if (collision) {
      setCollisionModal({
        item: draggedItem,
        targetFolderPath: '/',
        targetPath: destPath,
      });
      setDraggedItem(null);
      setDropTarget(null);
      return;
    }

    executeMove(draggedItem, '/', false);
    setDraggedItem(null);
    setDropTarget(null);
  };

  // Build hierarchical tree
  const treeNodes = useMemo(() => {
    return buildFileTree(files, expandedPaths, searchQuery, peers);
  }, [files, expandedPaths, searchQuery, peers]);

  // Total file count
  const fileCount = useMemo(() => {
    return files.filter((f) => f.type !== 'directory').length;
  }, [files]);

  // Collapsed Sidebar View
  if (!isOpen) {
    return (
      <div
        style={{
          width: '40px',
          height: '100%',
          background: '#09090b',
          borderRight: '1px solid #1f1f26',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          paddingTop: '12px',
          gap: '12px',
          zIndex: 10,
        }}
      >
        <button
          onClick={onToggleOpen}
          title="Open File Explorer"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#888894',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'color 0.15s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#888894')}
        >
          <Folder size={18} />
        </button>
      </div>
    );
  }

  // Recursive Tree Node Renderer
  const renderNode = (node) => {
    const isDir = node.type === 'directory';
    const isEditing = editingTarget && editingTarget.id === node.id;
    const isCreatingInside = creationTarget && creationTarget.parentPath === node.path;
    const isSelected = !isDir && node.id === activeFileId;
    const badge = !isDir ? getFileBadgeInfo(node.name) : null;

    const isBeingDragged = draggedItem?.id === node.id;
    const isDropHighlight = dropTarget && dropTarget.id === node.id;
    const isFlashing = dropFlashId === node.id;

    return (
      <div key={node.path} className="explorer-item-wrapper">
        {/* Minimalist Node Row */}
        <div
          className={`explorer-row ${isSelected ? 'is-selected' : ''} ${
            isDropHighlight
              ? dropTarget.isValid
                ? 'is-drop-valid'
                : 'is-drop-invalid'
              : ''
          } ${isBeingDragged ? 'is-dragged' : ''}`}
          draggable={currentUserRole !== 'viewer' && !isEditing}
          onDragStart={(e) => handleDragStart(e, node)}
          onDragOver={(e) => handleNodeDragOver(e, node)}
          onDragLeave={(e) => handleNodeDragLeave(e, node)}
          onDrop={(e) => handleNodeDrop(e, node)}
          onDragEnd={handleDragEnd}
          onClick={(e) => {
            if (isDir) {
              handleToggleFolder(node.path, e);
            } else {
              onSelectFile(node.id);
            }
          }}
          style={{
            paddingLeft: `${node.depth * 14 + 10}px`,
          }}
        >
          {/* Subtle Depth Indentation Guide */}
          {node.depth > 0 && (
            <div
              className="depth-indent-line"
              style={{ left: `${node.depth * 14 - 3}px` }}
            />
          )}

          {/* Directory Chevron */}
          {isDir ? (
            <div
              onClick={(e) => handleToggleFolder(node.path, e)}
              className="row-chevron-box"
            >
              {node.isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </div>
          ) : (
            <div className="row-chevron-placeholder" />
          )}

          {/* File/Folder Glyph Icon */}
          {isDir ? (
            <div className="row-folder-icon">
              {node.isExpanded || (isDropHighlight && dropTarget.isValid) ? (
                <FolderOpen size={13} strokeWidth={1.5} />
              ) : (
                <Folder size={13} strokeWidth={1.5} />
              )}
            </div>
          ) : (
            <span className="row-file-badge font-code">
              {badge.badgeText}
            </span>
          )}

          {/* Node Label or Inline Rename Input */}
          {isEditing ? (
            <div className="row-edit-form" onClick={(e) => e.stopPropagation()}>
              <input
                ref={editInputRef}
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleConfirmRename();
                  if (e.key === 'Escape') setEditingTarget(null);
                }}
                className="row-edit-input font-code"
              />
              <button
                onClick={handleConfirmRename}
                className="row-edit-btn btn-confirm"
                title="Save (Enter)"
              >
                <Check size={11} strokeWidth={1.75} />
              </button>
              <button
                onClick={() => setEditingTarget(null)}
                className="row-edit-btn btn-cancel"
                title="Cancel (Esc)"
              >
                <X size={11} strokeWidth={1.75} />
              </button>
            </div>
          ) : (
            <span className="row-label-text" title={node.path}>
              {node.name}
            </span>
          )}

          {/* Minimalist Entrypoint Tag */}
          {!isDir && node.isEntrypoint && (
            <span title="Main Execution File" className="row-entrypoint-pill font-code">
              MAIN
            </span>
          )}

          {/* Teammate Presence Indicator */}
          {node.peerCount > 0 && (
            <div className="row-presence-group font-code">
              {isDir ? (
                <span
                  title={`${node.peerCount} collaborator${node.peerCount > 1 ? 's' : ''} in folder`}
                  className="row-folder-peercount"
                >
                  {node.peerCount}
                </span>
              ) : (
                <div className="row-peer-dots">
                  {node.activePeers.slice(0, 3).map((peer, idx) => (
                    <span
                      key={peer.id || peer.socketId || idx}
                      title={`${peer.name || 'Collaborator'} is editing this file`}
                      className="peer-presence-dot"
                    />
                  ))}
                  {node.activePeers.length > 3 && (
                    <span className="peer-more-count font-code">
                      +{node.activePeers.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Understated Hover Actions */}
          {!isEditing && (
            <div className="node-actions" onClick={(e) => e.stopPropagation()}>
              {/* Folder Actions: Add File inside / Add Folder inside */}
              {isDir && (
                <>
                  <button
                    onClick={(e) => handleStartCreation('file', node.path, e)}
                    title="New File inside"
                    className="action-btn"
                  >
                    <FilePlus size={11} />
                  </button>
                  <button
                    onClick={(e) => handleStartCreation('folder', node.path, e)}
                    title="New Folder inside"
                    className="action-btn"
                  >
                    <FolderPlus size={11} />
                  </button>
                </>
              )}

              {/* File Action: Set Entrypoint */}
              {!isDir && !node.isEntrypoint && (
                <button
                  onClick={() => onSetEntrypoint(node.id)}
                  title="Set as Main Entrypoint"
                  className="action-btn"
                >
                  <Play size={10} />
                </button>
              )}

              {/* Rename */}
              <button
                onClick={(e) => handleStartRename(node, e)}
                title={`Rename ${isDir ? 'Folder' : 'File'}`}
                className="action-btn"
              >
                <Edit2 size={11} />
              </button>

              {/* Delete */}
              <button
                onClick={(e) => handleStartDelete(node, e)}
                title={`Delete ${isDir ? 'Folder' : 'File'}`}
                className="action-btn btn-danger"
              >
                <Trash2 size={11} />
              </button>
            </div>
          )}
        </div>

        {/* Inline Creation Row (when creating inside this folder) */}
        {isDir && isCreatingInside && (
          <div
            className="row-creation-inline"
            style={{
              paddingLeft: `${(node.depth + 1) * 14 + 10}px`,
            }}
          >
            {creationTarget.type === 'folder' ? (
              <Folder size={12} strokeWidth={1.5} className="creation-icon" />
            ) : (
              <span className="creation-file-badge font-code">NEW</span>
            )}
            <input
              ref={creationInputRef}
              type="text"
              value={creationName}
              onChange={(e) => setCreationName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmCreation();
                if (e.key === 'Escape') setCreationTarget(null);
              }}
              placeholder={creationTarget.type === 'folder' ? 'folder_name' : 'filename.js'}
              className="creation-input font-code"
            />
            <button
              onClick={handleConfirmCreation}
              className="row-edit-btn btn-confirm"
            >
              <Check size={11} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setCreationTarget(null)}
              className="row-edit-btn btn-cancel"
            >
              <X size={11} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Recursive Render of Children when Expanded */}
        {isDir && node.isExpanded && node.children.length > 0 && (
          <div className="folder-children">
            {node.children.map((child) => renderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        width: '250px',
        height: '100%',
        background: '#09090b',
        borderRight: '1px solid #1f1f26',
        display: 'flex',
        flexDirection: 'column',
        userSelect: 'none',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Explorer Header */}
      <div
        style={{
          padding: '10px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #1c1c22',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Folder size={13} strokeWidth={1.5} color="#a1a1aa" />
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#a1a1aa',
            }}
          >
            Explorer
          </span>
          <span
            style={{
              fontSize: '10px',
              padding: '1px 5px',
              borderRadius: '10px',
              background: '#16161d',
              color: '#71717a',
              fontWeight: 600,
            }}
            title={`${fileCount} files in workspace`}
          >
            {fileCount}
          </span>
        </div>

        {/* Header Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          {/* New File at Root */}
          <button
            onClick={(e) => handleStartCreation('file', '/', e)}
            title="New File (Root)"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888894',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = '#18181f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#888894';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <FilePlus size={13} />
          </button>

          {/* New Folder at Root */}
          <button
            onClick={(e) => handleStartCreation('folder', '/', e)}
            title="New Folder (Root)"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888894',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = '#18181f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#888894';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <FolderPlus size={13} />
          </button>

          {/* Collapse All */}
          <button
            onClick={handleCollapseAll}
            title="Collapse All Folders"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888894',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = '#18181f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#888894';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <Minimize2 size={13} />
          </button>

          {/* Close Sidebar */}
          <button
            onClick={onToggleOpen}
            title="Collapse Explorer"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888894',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.background = '#18181f';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#888894';
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <ChevronLeft size={13} />
          </button>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div
        style={{
          padding: '6px 10px',
          borderBottom: '1px solid #18181f',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#0d0d11',
        }}
      >
        <Search size={12} color="#71717a" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter files..."
          style={{
            background: 'transparent',
            border: 'none',
            color: '#ffffff',
            fontSize: '11px',
            outline: 'none',
            flex: 1,
          }}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            style={{ background: 'transparent', border: 'none', color: '#71717a', cursor: 'pointer', padding: 0 }}
          >
            <X size={12} />
          </button>
        )}
      </div>

      {/* Tree Content Area */}
      <div
        onDragOver={handleContainerDragOver}
        onDragLeave={handleContainerDragLeave}
        onDrop={handleContainerDrop}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '4px 0',
          position: 'relative',
          background: dropTarget?.isRootCanvas ? 'rgba(59, 130, 246, 0.04)' : 'transparent',
          outline: dropTarget?.isRootCanvas ? '1px dashed rgba(59, 130, 246, 0.4)' : 'none',
          outlineOffset: '-4px',
          transition: 'background 0.15s ease, outline 0.15s ease',
        }}
      >
        {/* Creation Input at Root */}
        {creationTarget && creationTarget.parentPath === '/' && (
          <div
            style={{
              paddingLeft: '12px',
              paddingRight: '8px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#0e1017',
              borderLeft: '2px solid rgba(255, 255, 255, 0.4)',
            }}
          >
            {creationTarget.type === 'folder' ? (
              <Folder size={12} strokeWidth={1.5} color="#a1a1aa" />
            ) : (
              <span style={{ fontSize: '9px', color: '#71717a' }}>FILE</span>
            )}
            <input
              ref={creationInputRef}
              type="text"
              value={creationName}
              onChange={(e) => setCreationName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirmCreation();
                if (e.key === 'Escape') setCreationTarget(null);
              }}
              placeholder={creationTarget.type === 'folder' ? 'folder_name' : 'filename.js'}
              style={{
                background: '#090a0f',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '3px',
                color: '#ffffff',
                fontSize: '11px',
                padding: '2px 6px',
                outline: 'none',
                flex: 1,
              }}
            />
            <button
              onClick={handleConfirmCreation}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#10b981',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '3px',
              }}
              title="Save"
            >
              <Check size={12} strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setCreationTarget(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#71717a',
                cursor: 'pointer',
                padding: '2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '3px',
              }}
              title="Cancel"
            >
              <X size={12} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Tree Nodes */}
        {treeNodes.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: '#71717a', fontSize: '11px' }}>
            {searchQuery ? 'No matching files found.' : 'No files in workspace.'}
          </div>
        ) : (
          treeNodes.map((node) => renderNode(node))
        )}
      </div>

      {/* Explorer Footer */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid #1c1c22',
          fontSize: '10px',
          color: '#52525b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>Workspace Tree</span>
        <span>VS Code Emulation</span>
      </div>

      {/* Deletion Confirmation Modal */}
      {deleteModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(9, 9, 11, 0.85)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 50,
          }}
          onClick={() => setDeleteModal(null)}
        >
          <div
            style={{
              background: '#141419',
              border: '1px solid #272730',
              borderRadius: '8px',
              padding: '16px',
              width: '100%',
              maxWidth: '220px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h4 style={{ margin: '0 0 6px 0', fontSize: '12px', color: '#ffffff', fontWeight: 600 }}>
              Delete {deleteModal.type === 'folder' ? 'Folder' : 'File'}?
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>
              {deleteModal.type === 'folder' ? (
                <>
                  Are you sure you want to delete <strong style={{ color: '#ffffff' }}>"{deleteModal.name}"</strong> and all its contents ({deleteModal.count} items)?
                </>
              ) : (
                <>
                  Are you sure you want to delete <strong style={{ color: '#ffffff' }}>"{deleteModal.name}"</strong>?
                </>
              )}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              <button
                onClick={() => setDeleteModal(null)}
                style={{
                  background: '#1f1f26',
                  border: '1px solid #33333f',
                  color: '#d4d4d8',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collision Confirmation Modal */}
      {collisionModal && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(9, 9, 11, 0.85)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            zIndex: 50,
          }}
          onClick={() => setCollisionModal(null)}
        >
          <div
            style={{
              background: '#141419',
              border: '1px solid #272730',
              borderRadius: '8px',
              padding: '16px',
              width: '100%',
              maxWidth: '240px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <AlertCircle size={15} color="#eab308" />
              <h4 style={{ margin: 0, fontSize: '12px', color: '#ffffff', fontWeight: 600 }}>
                Replace Item?
              </h4>
            </div>
            <p style={{ margin: '0 0 12px 0', fontSize: '11px', color: '#a1a1aa', lineHeight: 1.4 }}>
              A {collisionModal.item.type === 'directory' ? 'folder' : 'file'} named{' '}
              <strong style={{ color: '#ffffff' }}>"{collisionModal.item.name}"</strong> already exists in{' '}
              <code style={{ background: '#18181f', padding: '1px 4px', borderRadius: '3px', color: '#38bdf8' }}>
                {collisionModal.targetFolderPath}
              </code>
              . Do you want to replace it?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
              <button
                onClick={() => setCollisionModal(null)}
                style={{
                  background: '#1f1f26',
                  border: '1px solid #33333f',
                  color: '#d4d4d8',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  executeMove(collisionModal.item, collisionModal.targetFolderPath, true);
                  setCollisionModal(null);
                }}
                style={{
                  background: '#ef4444',
                  border: 'none',
                  color: '#ffffff',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Minimalist File Explorer Item System */
        .explorer-item-wrapper {
          position: relative;
        }

        .explorer-row {
          display: flex;
          align-items: center;
          height: 26px;
          padding-right: 8px;
          background: transparent;
          border-left: 2px solid transparent;
          font-size: 11.5px;
          color: #8e95a5;
          position: relative;
          cursor: grab;
          transition: background-color 0.12s ease, color 0.12s ease;
          user-select: none;
        }

        .explorer-row:hover {
          background-color: rgba(255, 255, 255, 0.03);
          color: #e5e7eb;
        }

        .explorer-row.is-selected {
          background-color: #12141c;
          border-left-color: #ffffff;
          color: #ffffff;
          font-weight: 500;
        }

        .explorer-row.is-drop-valid {
          background-color: rgba(255, 255, 255, 0.08);
          border-left-color: #ffffff;
          outline: 1px solid rgba(255, 255, 255, 0.2);
        }

        .explorer-row.is-drop-invalid {
          background-color: rgba(248, 113, 113, 0.08);
          border-left-color: #f87171;
          outline: 1px dashed rgba(248, 113, 113, 0.4);
        }

        .explorer-row.is-dragged {
          opacity: 0.35;
          outline: 1px dashed rgba(255, 255, 255, 0.25);
        }

        /* Depth Guide Line */
        .depth-indent-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background-color: rgba(255, 255, 255, 0.05);
          pointer-events: none;
        }

        /* Chevrons */
        .row-chevron-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 14px;
          height: 14px;
          margin-right: 2px;
          cursor: pointer;
          color: #52525b;
          transition: color 0.12s ease;
          flex-shrink: 0;
        }

        .explorer-row:hover .row-chevron-box {
          color: #a1a1aa;
        }

        .row-chevron-placeholder {
          width: 14px;
          margin-right: 2px;
          flex-shrink: 0;
        }

        /* Folder & File Icons */
        .row-folder-icon {
          margin-right: 6px;
          color: #71717a;
          display: flex;
          align-items: center;
          flex-shrink: 0;
          transition: color 0.12s ease;
        }

        .explorer-row:hover .row-folder-icon,
        .explorer-row.is-selected .row-folder-icon {
          color: #d4d4d8;
        }

        .row-file-badge {
          font-size: 8.5px;
          font-weight: 500;
          padding: 1px 4px;
          border-radius: 2px;
          color: #71717a;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          margin-right: 6px;
          line-height: 1.1;
          letter-spacing: 0.02em;
          flex-shrink: 0;
          transition: all 0.12s ease;
        }

        .explorer-row:hover .row-file-badge,
        .explorer-row.is-selected .row-file-badge {
          color: #e5e7eb;
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.14);
        }

        /* Label Text */
        .row-label-text {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          flex: 1;
          letter-spacing: -0.01em;
        }

        /* Entrypoint Pill */
        .row-entrypoint-pill {
          font-size: 7.5px;
          padding: 0 4px;
          border-radius: 2px;
          background: rgba(255, 255, 255, 0.06);
          color: #a1a1aa;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-left: 4px;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }

        /* Teammate Presence */
        .row-presence-group {
          display: flex;
          align-items: center;
          gap: 3px;
          margin-left: auto;
          flex-shrink: 0;
        }

        .row-folder-peercount {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 9px;
          font-weight: 500;
          padding: 0 5px;
          height: 14px;
          border-radius: 3px;
          background: rgba(255, 255, 255, 0.05);
          color: #a1a1aa;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .row-peer-dots {
          display: flex;
          align-items: center;
          gap: 3px;
        }

        .peer-presence-dot {
          display: inline-block;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background-color: #10b981;
          flex-shrink: 0;
        }

        .peer-more-count {
          font-size: 9px;
          color: #71717a;
        }

        /* Hover Actions Bar */
        .node-actions {
          display: flex;
          align-items: center;
          gap: 2px;
          opacity: 0;
          transition: opacity 0.12s ease;
          margin-left: 4px;
        }

        .explorer-row:hover .node-actions {
          opacity: 1;
        }

        .action-btn {
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 2px;
          border-radius: 3px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: color 0.12s ease, background 0.12s ease;
        }

        .action-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
        }

        .action-btn.btn-danger:hover {
          color: #f87171;
          background: rgba(248, 113, 113, 0.1);
        }

        /* Inline Rename and Create */
        .row-edit-form {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
        }

        .row-edit-input {
          background: #090a0f;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          color: #ffffff;
          font-size: 11px;
          padding: 1px 5px;
          outline: none;
          flex: 1;
        }

        .row-edit-input:focus {
          border-color: #ffffff;
        }

        .row-edit-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 3px;
        }

        .row-edit-btn.btn-confirm {
          color: #10b981;
        }

        .row-edit-btn.btn-cancel {
          color: #71717a;
        }

        .row-edit-btn.btn-cancel:hover {
          color: #f87171;
        }

        .row-creation-inline {
          height: 26px;
          padding-right: 8px;
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.02);
          border-left: 2px solid rgba(255, 255, 255, 0.3);
        }

        .creation-icon {
          color: #71717a;
        }

        .creation-file-badge {
          font-size: 8px;
          color: #71717a;
          background: rgba(255, 255, 255, 0.04);
          padding: 1px 3px;
          border-radius: 2px;
        }

        .creation-input {
          background: #090a0f;
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 3px;
          color: #ffffff;
          font-size: 11px;
          padding: 1px 5px;
          outline: none;
          flex: 1;
        }

        .creation-input:focus {
          border-color: #ffffff;
        }

        /* Minimalist Folder Children Container */
        .folder-children {
          position: relative;
          display: flex;
          flex-direction: column;
        }
      `}</style>
    </div>
  );
};

