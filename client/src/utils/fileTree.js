/**
 * fileTree.js
 * Utility functions for hierarchical tree building, path normalization,
 * breadcrumbs, and directory operations for VS Code / GitHub style explorer.
 */

/**
 * Normalizes virtual path: ensures leading slash, collapses duplicate slashes, removes trailing slash
 */
export const normalizePath = (rawPath) => {
  if (!rawPath) return '/';
  let p = String(rawPath).trim().replace(/\\/g, '/').replace(/\/+/g, '/');
  if (!p.startsWith('/')) p = `/${p}`;
  if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
  return p;
};

/**
 * Extracts parent directory path
 * e.g. "/src/utils/calc.js" -> "/src/utils"
 * "/src" -> "/"
 * "/" -> null
 */
export const getParentPath = (filePath) => {
  const p = normalizePath(filePath);
  if (p === '/') return null;
  const lastSlash = p.lastIndexOf('/');
  if (lastSlash <= 0) return '/';
  return p.substring(0, lastSlash);
};

/**
 * Extracts basename from path
 * e.g. "/src/utils/calc.js" -> "calc.js"
 */
export const getBasename = (filePath) => {
  const p = normalizePath(filePath);
  if (p === '/') return 'root';
  return p.substring(p.lastIndexOf('/') + 1);
};

/**
 * Generates breadcrumb trail for navigation bar
 * e.g. "/src/components/Header.jsx" ->
 * [
 *   { name: 'workspace', path: '/' },
 *   { name: 'src', path: '/src' },
 *   { name: 'components', path: '/src/components' },
 *   { name: 'Header.jsx', path: '/src/components/Header.jsx' }
 * ]
 */
export const getBreadcrumbs = (filePath) => {
  if (!filePath) return [{ name: 'workspace', path: '/' }];
  const p = normalizePath(filePath);
  const segments = p.split('/').filter(Boolean);
  const trail = [{ name: 'workspace', path: '/' }];

  let accumulated = '';
  segments.forEach((seg) => {
    accumulated += `/${seg}`;
    trail.push({
      name: seg,
      path: accumulated,
    });
  });

  return trail;
};

/**
 * Finds all descendant IDs inside a folder path (for recursive deletion/moving)
 */
export const findDescendantIds = (files = [], folderPath) => {
  const normTarget = normalizePath(folderPath);
  const prefix = normTarget === '/' ? '/' : `${normTarget}/`;

  const ids = [];
  files.forEach((f) => {
    const fPath = normalizePath(f.path || `/${f.name}`);
    if (fPath === normTarget || fPath.startsWith(prefix)) {
      ids.push(f.id);
    }
  });

  return ids;
};

/**
 * Checks whether moving sourceItem into targetFolderPath is valid.
 * Enforces:
 * 1. Self-move prevention (cannot move an item into itself)
 * 2. Circular dependency prevention (cannot move a directory into its own descendants)
 * 3. No-op check (cannot move into current parent directory)
 *
 * @param {Object} sourceItem The file or directory object being moved
 * @param {string} targetFolderPath The destination folder path (e.g. '/src', '/')
 * @returns {{ allowed: boolean, reason?: string }}
 */
export const isMoveAllowed = (sourceItem, targetFolderPath) => {
  if (!sourceItem || !sourceItem.path) {
    return { allowed: false, reason: 'Invalid source item' };
  }

  const sourcePath = normalizePath(sourceItem.path);
  const targetPath = normalizePath(targetFolderPath || '/');

  // 1. Self-move: cannot move into self
  if (sourceItem.type === 'directory' && sourcePath === targetPath) {
    return { allowed: false, reason: 'Cannot move a folder into itself' };
  }

  // 2. Circular dependency: cannot move a folder into one of its descendants
  if (sourceItem.type === 'directory') {
    const sourcePrefix = `${sourcePath}/`;
    if (targetPath.startsWith(sourcePrefix)) {
      return { allowed: false, reason: 'Cannot move a folder into one of its own subfolders' };
    }
  }

  // 3. No-op: cannot move into the directory it already resides in
  const currentParent = getParentPath(sourcePath) || '/';
  if (currentParent === targetPath) {
    return { allowed: false, reason: 'Item is already in this folder' };
  }

  return { allowed: true };
};

/**
 * Computes the new canonical path when an item is moved into targetFolderPath
 * e.g. item with name 'calc.js' into '/src/utils' -> '/src/utils/calc.js'
 * item with name 'calc.js' into '/' -> '/calc.js'
 */
export const computeMovedPath = (item, targetFolderPath) => {
  const normTarget = normalizePath(targetFolderPath || '/');
  const itemName = item.name || getBasename(item.path);
  return normalizePath(normTarget === '/' ? `/${itemName}` : `${normTarget}/${itemName}`);
};

/**
 * Cascades moved paths across a collection of files.
 * If a directory is moved from oldPath to newPath, all descendant files/folders have their paths updated.
 *
 * @param {Array} files List of all files in workspace
 * @param {Object} movedItem The item being moved
 * @param {string} newPath The new path of movedItem
 * @returns {Array} Updated array of files
 */
export const cascadeMovedPaths = (files = [], movedItem, newPath) => {
  const normOldPath = normalizePath(movedItem.path);
  const normNewPath = normalizePath(newPath);
  const newParent = getParentPath(normNewPath);

  if (movedItem.type !== 'directory') {
    return files.map((f) => {
      if (f.id === movedItem.id) {
        return { ...f, path: normNewPath, parentId: newParent === '/' ? null : newParent };
      }
      return f;
    });
  }

  const oldPrefix = `${normOldPath}/`;
  const newPrefix = `${normNewPath}/`;

  return files.map((f) => {
    if (f.id === movedItem.id) {
      return { ...f, path: normNewPath, parentId: newParent === '/' ? null : newParent };
    }
    const fPath = normalizePath(f.path || `/${f.name}`);
    if (fPath.startsWith(oldPrefix)) {
      const updatedPath = fPath.replace(oldPrefix, newPrefix);
      const updatedParent = getParentPath(updatedPath);
      return { ...f, path: updatedPath, parentId: updatedParent === '/' ? null : updatedParent };
    }
    return f;
  });
};

/**
 * Builds a hierarchical tree from a flat list of files and directories
 *
 * @param {Array} files List of file/directory objects
 * @param {Set} expandedPaths Set of currently expanded directory paths
 * @param {string} filterQuery Optional search term to filter files
 * @param {Array} peers List of active collaborator participants
 * @returns {Array} Top-level root tree nodes
 */
export const buildFileTree = (files = [], expandedPaths = new Set(['/']), filterQuery = '', peers = []) => {
  const query = filterQuery ? filterQuery.toLowerCase().trim() : '';

  // 1. Group nodes into directory map
  const dirMap = new Map(); // path -> Array of children nodes
  const allEntries = new Map(); // path -> entry

  dirMap.set('/', []);

  // Register all items
  files.forEach((item) => {
    const itemPath = normalizePath(item.path || `/${item.name}`);
    allEntries.set(itemPath, {
      ...item,
      path: itemPath,
      name: item.name || getBasename(itemPath),
      type: item.type || (item.content !== undefined ? 'file' : 'file'),
    });
  });

  // Ensure all intermediate directories exist
  allEntries.forEach((item, itemPath) => {
    let curr = getParentPath(itemPath);
    while (curr) {
      if (!allEntries.has(curr) && curr !== '/') {
        allEntries.set(curr, {
          id: `synthesized-dir-${curr.replace(/[^a-zA-Z0-9]/g, '-')}`,
          name: getBasename(curr),
          path: curr,
          type: 'directory',
          isSynthesized: true,
        });
      }
      curr = getParentPath(curr);
    }
  });

  // Organize into parent-child hierarchy
  allEntries.forEach((entry, entryPath) => {
    const parentPath = getParentPath(entryPath) || '/';
    if (!dirMap.has(parentPath)) {
      dirMap.set(parentPath, []);
    }
    dirMap.get(parentPath).push(entry);
  });

  // Sort helper: Directories first (A-Z), Files second (A-Z)
  const sortNodes = (a, b) => {
    if (a.type !== b.type) {
      return a.type === 'directory' ? -1 : 1;
    }
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  };

  // 2. Recursive tree builder with peer presence propagation & filtering
  const buildNode = (entry, depth = 0) => {
    const isDir = entry.type === 'directory';
    const rawChildren = isDir ? dirMap.get(entry.path) || [] : [];
    rawChildren.sort(sortNodes);

    const children = [];
    let peerCount = 0;
    const activePeers = [];

    // Find other collaborators directly working on this file (excluding current user)
    if (!isDir) {
      const seenKeys = new Set();
      peers.forEach((p) => {
        if (!p.isMe) {
          const matches = p.activeFileId && (p.activeFileId === entry.id || p.activeFileId === entry.path);
          if (matches) {
            const userKey = p.id || p.username || p.name || p.socketId;
            if (!seenKeys.has(userKey)) {
              seenKeys.add(userKey);
              activePeers.push(p);
              peerCount++;
            }
          }
        }
      });
    }

    // Process children recursively
    rawChildren.forEach((childEntry) => {
      const childNode = buildNode(childEntry, depth + 1);
      if (childNode) {
        children.push(childNode);
        peerCount += childNode.peerCount;
        childNode.activePeers.forEach((p) => {
          const userKey = p.id || p.username || p.name || p.socketId;
          if (!activePeers.some((existing) => (existing.id || existing.username || existing.name || existing.socketId) === userKey)) {
            activePeers.push(p);
          }
        });
      }
    });

    // Check filter match
    const nameMatches = query ? entry.name.toLowerCase().includes(query) : true;
    const hasMatchingDescendant = children.length > 0;

    // If query exists, only keep matching files or directories that contain matching children
    if (query && !nameMatches && !hasMatchingDescendant) {
      return null;
    }

    const isExpanded = query ? true : expandedPaths.has(entry.path);

    return {
      id: entry.id,
      name: entry.name,
      path: entry.path,
      type: entry.type,
      language: entry.language,
      content: entry.content,
      isEntrypoint: !!entry.isEntrypoint,
      depth,
      isExpanded,
      children,
      peerCount,
      activePeers,
      rawItem: entry,
    };
  };

  const rootItems = dirMap.get('/') || [];
  rootItems.sort(sortNodes);

  const tree = [];
  rootItems.forEach((rootEntry) => {
    const node = buildNode(rootEntry, 0);
    if (node) tree.push(node);
  });

  return tree;
};
