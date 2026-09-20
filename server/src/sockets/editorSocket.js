import { Room } from '../models/Room.js';
import { Message } from '../models/Message.js';

// In-memory active room state for ultra-low-latency real-time collaboration
const activeRooms = new Map();

// Helper to return real-time active room stats for public rooms listing
export const getActiveRoomStats = () => {
  const stats = {};
  activeRooms.forEach((data, roomId) => {
    const count = data.users ? data.users.size : 0;
    stats[roomId] = {
      isLive: count > 0,
      onlineCount: count,
    };
  });
  return stats;
};

// Periodic database sync timer / debounce map
const pendingSaveTimers = new Map();

const scheduleRoomSave = (roomId) => {
  if (pendingSaveTimers.has(roomId)) {
    clearTimeout(pendingSaveTimers.get(roomId));
  }

  const timer = setTimeout(async () => {
    const roomState = activeRooms.get(roomId);
    if (!roomState) return;

    try {
      const filesArray = roomState.files ? Array.from(roomState.files.values()) : [];
      const entryFile =
        filesArray.find((f) => f.type !== 'directory' && f.isEntrypoint) ||
        filesArray.find((f) => f.type !== 'directory') ||
        filesArray[0];

      await Room.findOneAndUpdate(
        { roomId },
        {
          files: filesArray,
          activeFileId: roomState.activeFileId || entryFile?.id || '',
          code: entryFile ? entryFile.content : roomState.code,
          language: entryFile ? entryFile.language : roomState.language,
          stdin: roomState.stdin,
          lastActiveAt: new Date(),
        }
      );
    } catch (err) {
      console.error(`[Socket] Error auto-saving room ${roomId}:`, err.message);
    } finally {
      pendingSaveTimers.delete(roomId);
    }
  }, 1500);

  pendingSaveTimers.set(roomId, timer);
};

export const registerEditorSocketHandlers = (io) => {
  io.on('connection', (socket) => {
    // Join collaborative room
    socket.on('room:join', async ({ roomId, user }) => {
      if (!roomId) return;

      // Verify room exists in database - DO NOT AUTO-CREATE
      let dbRoom = null;
      try {
        dbRoom = await Room.findOne({ roomId });
        if (!dbRoom) {
          socket.emit('room:not_found', {
            roomId,
            message: `Room "${roomId}" does not exist or the link is invalid.`,
          });
          return;
        }
      } catch (err) {
        console.error('[Socket] Error querying room:', err.message);
        socket.emit('room:not_found', {
          roomId,
          message: 'Error verifying room existence.',
        });
        return;
      }

      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.user = user;

      // Add user to DB room collaborators record if not present
      if (user?.id) {
        const alreadyCollab = dbRoom.collaborators?.some((c) => c.id === user.id);
        if (!alreadyCollab) {
          await Room.updateOne(
            { roomId },
            {
              $push: {
                collaborators: {
                  id: user.id,
                  username: user.name || 'Developer',
                  avatar: user.avatar,
                  color: user.color,
                  lastActiveAt: new Date(),
                },
              },
              lastActiveAt: new Date(),
            }
          ).catch((e) => console.error('[Socket] Update collaborators error:', e.message));
        }
      }

      // Initialize or retrieve room state in memory
      if (!activeRooms.has(roomId)) {
        let roomFiles = dbRoom.files && dbRoom.files.length > 0 ? dbRoom.files : [];
        if (roomFiles.length === 0) {
          const extMap = {
            javascript: 'js',
            python: 'py',
            cpp: 'cpp',
            java: 'java',
            typescript: 'ts',
            go: 'go',
            rust: 'rs',
          };
          const ext = extMap[dbRoom.language] || 'js';
          const defaultName = dbRoom.language === 'java' ? 'Main.java' : `index.${ext}`;
          const defaultId = `file-default-${Date.now()}`;

          roomFiles = [
            {
              id: defaultId,
              name: defaultName,
              path: `/${defaultName}`,
              language: dbRoom.language || 'javascript',
              content: dbRoom.code || '// Welcome to syncpad!\n',
              isEntrypoint: true,
              updatedAt: new Date(),
            },
          ];
        }

        const filesMap = new Map();
        roomFiles.forEach((f) => {
          filesMap.set(f.id, {
            id: f.id,
            name: f.name,
            path: f.path || `/${f.name}`,
            parentId: f.parentId || null,
            type: f.type || 'file',
            language: f.language || 'javascript',
            content: f.content || '',
            isEntrypoint: !!f.isEntrypoint,
            updatedAt: f.updatedAt || new Date(),
          });
        });

        const activeFile = roomFiles.find((f) => f.type !== 'directory' && f.id === dbRoom.activeFileId)
          || roomFiles.find((f) => f.type !== 'directory')
          || roomFiles[0];
        const activeFileId = activeFile?.id || '';

        activeRooms.set(roomId, {
          code: dbRoom.code || '// Welcome to syncpad!\n',
          language: dbRoom.language || 'javascript',
          stdin: dbRoom.stdin || '',
          title: dbRoom.title || `Room ${roomId}`,
          files: filesMap,
          activeFileId,
          users: new Map(),
        });
      }

      const room = activeRooms.get(roomId);
      const isAlreadyInRoom = Array.from(room.users.values()).some(
        (u) => (u.id && user?.id && String(u.id) === String(user.id)) || u.socketId === socket.id
      );

      const isOwner = dbRoom.owner && user?.id && String(dbRoom.owner) === String(user.id);
      const userRole = user?.role || (isOwner ? 'host' : 'editor');

      const participant = {
        ...user,
        socketId: socket.id,
        cursor: null,
        activeFileId: user?.activeFileId || room.activeFileId || '',
        online: true,
        role: userRole,
      };

      room.users.set(socket.id, participant);

      // Fetch recent messages
      let recentMessages = [];
      try {
        recentMessages = await Message.find({ roomId }).sort({ createdAt: -1 }).limit(30).lean();
        recentMessages.reverse();
      } catch (e) {
        console.error('[Socket] Error fetching messages:', e.message);
      }

      const activeUsersList = Array.from(room.users.values());

      let freshParticipants = [];
      try {
        const freshDb = await Room.findOne({ roomId }).lean();
        freshParticipants = freshDb?.collaborators || dbRoom.collaborators || [];
      } catch (e) {}

      // Send initial room snapshot to joining user
      socket.emit('room:init', {
        roomId,
        title: dbRoom.title || room.title,
        code: room.code,
        language: room.language,
        files: Array.from(room.files.values()),
        activeFileId: room.activeFileId,
        stdin: room.stdin,
        users: activeUsersList,
        participants: freshParticipants,
        messages: recentMessages,
        currentUserRole: userRole,
      });

      // Broadcast updated participants list to everyone in the room
      io.in(roomId).emit('room:users', {
        users: activeUsersList,
        participants: freshParticipants,
      });

      socket.to(roomId).emit('user:joined', {
        user: participant,
        users: activeUsersList,
        participants: freshParticipants,
      });

      // Broadcast Activity Log event & system chat only if user was NOT already inside the room
      if (!isAlreadyInRoom) {
        const joinActivity = {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'join',
          user: user?.name || 'Developer',
          text: `${user?.name || 'A developer'} entered the room`,
          timestamp: new Date().toISOString(),
        };
        io.in(roomId).emit('activity:log', joinActivity);

        // System chat message to existing room members
        const systemMsg = {
          _id: `sys-join-${roomId}-${user?.id || socket.id}-${Date.now()}`,
          roomId,
          user: { name: 'System' },
          text: `${user?.name || 'A developer'} joined syncpad room.`,
          type: 'system',
          createdAt: new Date(),
        };
        socket.to(roomId).emit('chat:receive', systemMsg);
      }
    });

    // Host can change participant role between editor and viewer
    socket.on('role:change', ({ roomId, targetUserId, newRole }) => {
      const room = activeRooms.get(roomId);
      if (!room) return;

      room.users.forEach((u) => {
        if (String(u.id) === String(targetUserId) || u.socketId === targetUserId) {
          u.role = newRole;
        }
      });

      const updatedUsers = Array.from(room.users.values());
      io.in(roomId).emit('room:users', { users: updatedUsers });
      io.in(roomId).emit('role:updated', { targetUserId, newRole });

      const roleActivity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'system',
        user: socket.data.user?.name || 'Host',
        text: `Role for a participant updated to ${newRole.toUpperCase()}`,
        timestamp: new Date().toISOString(),
      };
      io.in(roomId).emit('activity:log', roleActivity);
    });

    // Handle user explicitly leaving or disconnecting
    const handleLeave = (targetRoomId) => {
      const roomId = targetRoomId || socket.data.roomId;
      const user = socket.data.user;

      if (roomId && activeRooms.has(roomId)) {
        const room = activeRooms.get(roomId);
        room.users.delete(socket.id);

        const remainingUsers = Array.from(room.users.values());

        // Notify room immediately with updated presence
        Room.findOne({ roomId })
          .lean()
          .then((freshDb) => {
            const participants = freshDb?.collaborators || [];
            io.in(roomId).emit('room:users', { users: remainingUsers, participants });
            socket.to(roomId).emit('user:left', {
              socketId: socket.id,
              user,
              users: remainingUsers,
              participants,
            });
          })
          .catch(() => {
            io.in(roomId).emit('room:users', { users: remainingUsers });
            socket.to(roomId).emit('user:left', {
              socketId: socket.id,
              user,
              users: remainingUsers,
            });
          });

        // Broadcast Activity Log
        const leaveActivity = {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'leave',
          user: user?.name || 'Developer',
          text: `${user?.name || 'A developer'} left the room`,
          timestamp: new Date().toISOString(),
        };
        io.in(roomId).emit('activity:log', leaveActivity);

        // System message for leave
        const systemMsg = {
          _id: `sys-${Date.now()}-${Math.random()}`,
          roomId,
          user: { name: 'System' },
          text: `${user?.name || 'A participant'} left the room.`,
          type: 'system',
          createdAt: new Date(),
        };
        io.in(roomId).emit('chat:receive', systemMsg);

        // Persist code snapshot immediately to DB
        const filesArray = room.files ? Array.from(room.files.values()) : [];
        const entryFile =
          filesArray.find((f) => f.type !== 'directory' && f.isEntrypoint) ||
          filesArray.find((f) => f.type !== 'directory') ||
          filesArray[0];

        Room.findOneAndUpdate(
          { roomId },
          {
            files: filesArray,
            activeFileId: room.activeFileId || entryFile?.id || '',
            code: entryFile ? entryFile.content : room.code,
            language: entryFile ? entryFile.language : room.language,
            stdin: room.stdin,
            lastActiveAt: new Date(),
          }
        ).catch((e) => console.error('[Socket] Final room save error:', e.message));

        socket.leave(roomId);
      }
    };

    // Explicit leave event
    socket.on('room:leave', ({ roomId }) => {
      handleLeave(roomId);
    });

    // Code change synchronization (backward compatible & multi-file aware)
    socket.on('code:change', ({ roomId, code, fileId }) => {
      const room = activeRooms.get(roomId);
      if (room) {
        room.code = code;
        const targetId = fileId || room.activeFileId;
        if (targetId && room.files && room.files.has(targetId)) {
          const file = room.files.get(targetId);
          file.content = code;
          file.updatedAt = new Date();
        }
        scheduleRoomSave(roomId);
      }
      socket.to(roomId).emit('code:change', { code, fileId, socketId: socket.id });
    });

    // Multi-file content change
    socket.on('file:content_change', ({ roomId, fileId, code }) => {
      const room = activeRooms.get(roomId);
      if (room && room.files && room.files.has(fileId)) {
        const file = room.files.get(fileId);
        file.content = code;
        file.updatedAt = new Date();
        if (file.isEntrypoint) {
          room.code = code;
          room.language = file.language;
        }
        scheduleRoomSave(roomId);
      }
      socket.to(roomId).emit('file:content_change', { fileId, code, socketId: socket.id });
    });

    // Multi-file: Create file or directory
    socket.on('file:create', ({ roomId, file }) => {
      const room = activeRooms.get(roomId);
      if (!room || !file || !file.name) return;

      const fileId = file.id || `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const normalizedPath = (file.path || `/${file.name.trim()}`).replace(/\/+/g, '/');
      const newFile = {
        id: fileId,
        name: file.name.trim(),
        path: normalizedPath,
        parentId: file.parentId || null,
        type: file.type || 'file',
        language: file.language || 'javascript',
        content: file.content || '',
        isEntrypoint: !!file.isEntrypoint,
        updatedAt: new Date(),
      };

      if (!room.files) room.files = new Map();
      room.files.set(fileId, newFile);
      scheduleRoomSave(roomId);

      const creator = socket.data.user?.name || 'A participant';
      io.in(roomId).emit('file:created', { file: newFile, createdBy: creator });

      const activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'file_create',
        user: creator,
        text: `${creator} created ${newFile.type === 'directory' ? 'folder' : 'file'} "${newFile.name}"`,
        timestamp: new Date().toISOString(),
      };
      io.in(roomId).emit('activity:log', activity);
    });

    // Multi-file: Create folder
    socket.on('folder:create', ({ roomId, folder }) => {
      const room = activeRooms.get(roomId);
      if (!room || !folder || !folder.name) return;

      const folderId = folder.id || `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const rawPath = folder.path || (folder.parentPath ? `${folder.parentPath}/${folder.name.trim()}` : `/${folder.name.trim()}`);
      const normalizedPath = rawPath.replace(/\/+/g, '/');

      const newFolder = {
        id: folderId,
        name: folder.name.trim(),
        path: normalizedPath,
        parentId: folder.parentId || null,
        type: 'directory',
        updatedAt: new Date(),
      };

      if (!room.files) room.files = new Map();
      room.files.set(folderId, newFolder);
      scheduleRoomSave(roomId);

      const creator = socket.data.user?.name || 'A participant';
      io.in(roomId).emit('folder:created', { folder: newFolder, createdBy: creator });

      const activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'folder_create',
        user: creator,
        text: `${creator} created folder "${newFolder.name}"`,
        timestamp: new Date().toISOString(),
      };
      io.in(roomId).emit('activity:log', activity);
    });

    // Multi-file: Rename folder (cascades to all nested descendants)
    socket.on('folder:rename', ({ roomId, folderId, oldPath, newPath, newName }) => {
      const room = activeRooms.get(roomId);
      if (!room || !room.files || !folderId || !newPath) return;

      const folder = room.files.get(folderId);
      if (folder) {
        folder.name = newName.trim();
        folder.path = newPath;
        folder.updatedAt = new Date();
      }

      const updatedChildren = [];
      const prefix = oldPath.endsWith('/') ? oldPath : `${oldPath}/`;
      const newPrefix = newPath.endsWith('/') ? newPath : `${newPath}/`;

      room.files.forEach((item) => {
        if (item.id !== folderId && item.path && item.path.startsWith(prefix)) {
          item.path = item.path.replace(prefix, newPrefix);
          item.updatedAt = new Date();
          updatedChildren.push({ id: item.id, path: item.path });
        }
      });

      scheduleRoomSave(roomId);

      const renamer = socket.data.user?.name || 'A participant';
      io.in(roomId).emit('folder:renamed', {
        folderId,
        oldPath,
        newPath,
        newName,
        updatedChildren,
      });

      const activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'folder_rename',
        user: renamer,
        text: `${renamer} renamed folder to "${newName}"`,
        timestamp: new Date().toISOString(),
      };
      io.in(roomId).emit('activity:log', activity);
    });

    // Multi-file: Move item (file or folder) into directory with circular check & cascading updates
    socket.on('item:move', ({ roomId, itemId, targetFolderPath, overwrite = false }) => {
      const room = activeRooms.get(roomId);
      if (!room || !room.files || !itemId) return;

      // 1. Role Permission Check: Viewers are read-only
      const sender = room.users?.get(socket.id) || socket.data.user;
      if (sender?.role === 'viewer') {
        socket.emit('file:error', { message: 'Read-only mode: Viewers cannot move files or folders.' });
        return;
      }

      const item = room.files.get(itemId);
      if (!item) {
        socket.emit('file:error', { message: 'Item not found.' });
        return;
      }

      const rawOldPath = item.path || `/${item.name}`;
      const normOldPath = rawOldPath.replace(/\\/g, '/').replace(/\/+/g, '/');
      const normTarget = (targetFolderPath || '/').replace(/\\/g, '/').replace(/\/+/g, '/');

      // 2. Circular Move Prevention & Self-Move Check
      if (item.type === 'directory') {
        if (normTarget === normOldPath) {
          socket.emit('file:error', { message: 'Cannot move a folder into itself.' });
          return;
        }
        const sourcePrefix = normOldPath.endsWith('/') ? normOldPath : `${normOldPath}/`;
        if (normTarget.startsWith(sourcePrefix)) {
          socket.emit('file:error', { message: 'Circular dependency: Cannot move a folder into one of its own subfolders.' });
          return;
        }
      }

      // 3. Compute New Canonical Path
      const itemName = item.name.trim();
      const normNewPath = normTarget === '/' ? `/${itemName}` : `${normTarget}/${itemName}`.replace(/\/+/g, '/');

      if (normNewPath === normOldPath) {
        return; // No-op move
      }

      // 4. Collision Check
      let collisionItem = null;
      room.files.forEach((f, id) => {
        if (id !== itemId && f.path === normNewPath) {
          collisionItem = f;
        }
      });

      if (collisionItem && !overwrite) {
        socket.emit('file:error', {
          message: `An item named "${itemName}" already exists in destination.`,
          collision: true,
          targetPath: normNewPath,
        });
        return;
      }

      if (collisionItem && overwrite) {
        room.files.delete(collisionItem.id);
      }

      // 5. Update Item Path & Parent
      const lastSlash = normNewPath.lastIndexOf('/');
      const newParent = lastSlash <= 0 ? (normNewPath.startsWith('/') && lastSlash === 0 ? '/' : null) : normNewPath.substring(0, lastSlash);
      const parentId = newParent === '/' ? null : newParent;

      item.path = normNewPath;
      item.parentId = parentId;
      item.updatedAt = new Date();

      // 6. Cascade Updates if Folder
      const updatedChildren = [];
      if (item.type === 'directory') {
        const oldPrefix = normOldPath.endsWith('/') ? normOldPath : `${normOldPath}/`;
        const newPrefix = normNewPath.endsWith('/') ? normNewPath : `${normNewPath}/`;

        room.files.forEach((child, id) => {
          if (id !== itemId && child.path && child.path.startsWith(oldPrefix)) {
            child.path = child.path.replace(oldPrefix, newPrefix);
            const cSlash = child.path.lastIndexOf('/');
            child.parentId = cSlash <= 0 ? null : child.path.substring(0, cSlash);
            child.updatedAt = new Date();
            updatedChildren.push({ id: child.id, path: child.path, parentId: child.parentId });
          }
        });
      }

      scheduleRoomSave(roomId);

      // 7. Broadcast to peers & Activity Stream
      const mover = sender?.name || 'A participant';
      io.in(roomId).emit('item:moved', {
        itemId,
        itemType: item.type,
        oldPath: normOldPath,
        newPath: normNewPath,
        targetFolderPath: normTarget,
        updatedChildren,
        movedBy: mover,
      });

      const activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'item_move',
        user: mover,
        text: `${mover} moved ${item.type === 'directory' ? 'folder' : 'file'} "${itemName}" to "${normTarget}"`,
        timestamp: new Date().toISOString(),
      };
      io.in(roomId).emit('activity:log', activity);
    });

    // Multi-file: Delete folder (cascading delete to all nested descendants)
    socket.on('folder:delete', ({ roomId, folderId, folderPath }) => {
      const room = activeRooms.get(roomId);
      if (!room || !room.files || !folderId) return;

      const targetPath = folderPath || room.files.get(folderId)?.path;
      const prefix = targetPath.endsWith('/') ? targetPath : `${targetPath}/`;

      const deletedIds = [];
      room.files.forEach((item, id) => {
        if (id === folderId || item.path === targetPath || (item.path && item.path.startsWith(prefix))) {
          deletedIds.push(id);
        }
      });

      deletedIds.forEach((id) => room.files.delete(id));

      if (deletedIds.includes(room.activeFileId)) {
        const remainingFile = Array.from(room.files.values()).find((f) => f.type !== 'directory');
        room.activeFileId = remainingFile ? remainingFile.id : '';
      }

      scheduleRoomSave(roomId);

      const deleter = socket.data.user?.name || 'A participant';
      io.in(roomId).emit('folder:deleted', {
        folderId,
        folderPath: targetPath,
        deletedIds,
        activeFileId: room.activeFileId,
      });

      const activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'folder_delete',
        user: deleter,
        text: `${deleter} deleted folder "${targetPath}" (${deletedIds.length} items)`,
        timestamp: new Date().toISOString(),
      };
      io.in(roomId).emit('activity:log', activity);
    });

    // Multi-file: Delete file
    socket.on('file:delete', ({ roomId, fileId }) => {
      const room = activeRooms.get(roomId);
      if (!room || !room.files || !room.files.has(fileId)) return;
      const remainingFilesCount = Array.from(room.files.values()).filter((f) => f.type !== 'directory').length;
      if (remainingFilesCount <= 1) {
        socket.emit('file:error', { message: 'Cannot delete the only remaining file in the room.' });
        return;
      }

      const deletedFile = room.files.get(fileId);
      room.files.delete(fileId);

      if (room.activeFileId === fileId) {
        const remaining = Array.from(room.files.values()).find((f) => f.type !== 'directory');
        room.activeFileId = remaining ? remaining.id : '';
      }

      scheduleRoomSave(roomId);

      const deleter = socket.data.user?.name || 'A participant';
      io.in(roomId).emit('file:deleted', { fileId, activeFileId: room.activeFileId, deletedBy: deleter });

      const activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'file_delete',
        user: deleter,
        text: `${deleter} deleted file "${deletedFile?.name || fileId}"`,
        timestamp: new Date().toISOString(),
      };
      io.in(roomId).emit('activity:log', activity);
    });

    // Multi-file: Rename file
    socket.on('file:rename', ({ roomId, fileId, newName, newLanguage, newPath }) => {
      const room = activeRooms.get(roomId);
      if (!room || !room.files || !room.files.has(fileId) || !newName) return;

      const file = room.files.get(fileId);
      file.name = newName.trim();
      file.path = newPath || (file.path ? file.path.replace(/[^/]+$/, newName.trim()) : `/${newName.trim()}`);
      if (newLanguage) file.language = newLanguage;
      file.updatedAt = new Date();

      scheduleRoomSave(roomId);

      const renamer = socket.data.user?.name || 'A participant';
      io.in(roomId).emit('file:renamed', { fileId, newName: file.name, newLanguage: file.language, newPath: file.path });

      const activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'file_rename',
        user: renamer,
        text: `${renamer} renamed file to "${file.name}"`,
        timestamp: new Date().toISOString(),
      };
      io.in(roomId).emit('activity:log', activity);
    });

    // Multi-file: Set entrypoint
    socket.on('entrypoint:set', ({ roomId, fileId }) => {
      const room = activeRooms.get(roomId);
      if (!room || !room.files || !room.files.has(fileId)) return;

      room.files.forEach((f, id) => {
        f.isEntrypoint = id === fileId;
      });

      const entryFile = room.files.get(fileId);
      room.code = entryFile.content;
      room.language = entryFile.language;

      scheduleRoomSave(roomId);

      const actor = socket.data.user?.name || 'A participant';
      io.in(roomId).emit('entrypoint:set', { fileId });

      const activity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'entrypoint',
        user: actor,
        text: `${actor} set "${entryFile.name}" as execution entrypoint`,
        timestamp: new Date().toISOString(),
      };
      io.in(roomId).emit('activity:log', activity);
    });

    // Multi-file: Peer focus tracking
    socket.on('peer:focus', ({ roomId, fileId }) => {
      const room = activeRooms.get(roomId);
      if (room && room.users && room.users.has(socket.id)) {
        const userData = room.users.get(socket.id);
        userData.activeFileId = fileId;
      }
      if (socket.data.user) {
        socket.data.user.activeFileId = fileId;
      }
      socket.to(roomId).emit('peer:focus', {
        socketId: socket.id,
        fileId,
        user: socket.data.user,
      });
    });

    // Remote cursor & selection tracking (scoped to fileId)
    socket.on('cursor:move', ({ roomId, fileId, position, selection }) => {
      const room = activeRooms.get(roomId);
      if (room && room.users.has(socket.id)) {
        const userData = room.users.get(socket.id);
        userData.cursor = { fileId, position, selection };
        if (fileId) userData.activeFileId = fileId;
      }
      socket.to(roomId).emit('cursor:move', {
        socketId: socket.id,
        fileId,
        user: socket.data.user,
        position,
        selection,
      });
    });

    // Language change synchronization
    socket.on('language:change', async ({ roomId, language, fileId }) => {
      const room = activeRooms.get(roomId);
      if (room) {
        room.language = language;
        const targetId = fileId || room.activeFileId;
        if (targetId && room.files && room.files.has(targetId)) {
          const file = room.files.get(targetId);
          file.language = language;
        }
        scheduleRoomSave(roomId);
      }
      const updatedBy = socket.data.user?.name || 'A participant';
      io.in(roomId).emit('language:change', {
        language,
        fileId,
        updatedBy,
      });

      // Broadcast Activity Log
      const langActivity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'language',
        user: updatedBy,
        text: `${updatedBy} switched language to ${language.toUpperCase()}`,
        timestamp: new Date().toISOString(),
      };
      io.in(roomId).emit('activity:log', langActivity);
    });

    // Standard Input (stdin) sync
    socket.on('stdin:change', ({ roomId, stdin }) => {
      const room = activeRooms.get(roomId);
      if (room) {
        room.stdin = stdin;
      }
      socket.to(roomId).emit('stdin:change', { stdin });
    });

    // Execution state synchronization
    socket.on('code:executing', ({ roomId, isExecuting, triggeredBy }) => {
      const actor = triggeredBy || socket.data.user?.name || 'A participant';
      socket.to(roomId).emit('code:executing', {
        isExecuting,
        triggeredBy: actor,
      });

      if (isExecuting) {
        const execActivity = {
          id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          type: 'execution',
          user: actor,
          text: `${actor} triggered code execution`,
          timestamp: new Date().toISOString(),
        };
        io.in(roomId).emit('activity:log', execActivity);
      }
    });

    // Room Save notification
    socket.on('room:save', ({ roomId }) => {
      const saver = socket.data.user?.name || 'A participant';
      const saveActivity = {
        id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        type: 'save',
        user: saver,
        text: `${saver} saved room snapshot`,
        timestamp: new Date().toISOString(),
      };
      io.in(roomId).emit('activity:log', saveActivity);
    });

    // In-room live chat
    socket.on('chat:send', async ({ roomId, text, type = 'text' }) => {
      const user = socket.data.user || { name: 'Anonymous' };
      try {
        const savedMessage = await Message.create({
          roomId,
          user: {
            id: user.id || socket.id,
            name: user.name || 'Anonymous',
            avatar: user.avatar,
            color: user.color,
          },
          text,
          type,
        });
        io.in(roomId).emit('chat:receive', savedMessage);
      } catch (err) {
        const fallbackMsg = {
          _id: `msg-${Date.now()}`,
          roomId,
          user,
          text,
          type,
          createdAt: new Date(),
        };
        io.in(roomId).emit('chat:receive', fallbackMsg);
      }
    });

    // Disconnect handling
    socket.on('disconnecting', () => {
      handleLeave();
    });
    socket.on('disconnect', () => {});
  });
};
