import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Navbar } from '../components/Navbar';
import { OutputPanel } from '../components/OutputPanel';
import { ShareModal } from '../components/ShareModal';
import { InvalidRoomModal } from '../components/InvalidRoomModal';
import { FileExplorer } from '../components/FileExplorer';
import { EditorTabBar } from '../components/EditorTabBar';
import {
  getBreadcrumbs,
  normalizePath,
  getParentPath,
  findDescendantIds,
  computeMovedPath,
  cascadeMovedPaths,
} from '../utils/fileTree';
import {
  Play,
  Share2,
  Users,
  Code2,
  Save,
  Check,
  Activity,
  MessageSquare,
  Send,
  FileCode,
  Folder,
  FolderPlus,
  FolderMinus,
  FolderEdit,
  FilePlus,
  FileMinus,
  Edit3,
  Move,
  ChevronRight,
  ChevronLeft,
  UserCheck,
  UserMinus,
  Sparkles,
  Clock,
  Eye,
  LogOut,
  Copy,
  Sun,
  Moon,
  Loader2,
} from 'lucide-react';

const LANGUAGES = [
  { id: 'javascript', name: 'JavaScript', monaco: 'javascript' },
  { id: 'typescript', name: 'TypeScript', monaco: 'typescript' },
  { id: 'python', name: 'Python', monaco: 'python' },
  { id: 'cpp', name: 'C++', monaco: 'cpp' },
  { id: 'java', name: 'Java', monaco: 'java' },
  { id: 'go', name: 'Go', monaco: 'go' },
  { id: 'rust', name: 'Rust', monaco: 'rust' },
];



const PEER_COLORS = [
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#3b82f6', // Blue
];

export const EditorRoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { socket, isConnected } = useSocket();

  // Room verification state
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [notFoundMessage, setNotFoundMessage] = useState('');
  const [isVerifyingRoom, setIsVerifyingRoom] = useState(true);
  const [roomOwner, setRoomOwner] = useState(null);

  // Multi-File Workspace State
  const [files, setFiles] = useState([]);
  const [activeFileId, setActiveFileId] = useState('');
  const [openTabs, setOpenTabs] = useState([]); // array of fileIds
  const [isExplorerOpen, setIsExplorerOpen] = useState(true);

  // Monaco multi-model references
  const modelsRef = useRef({});
  const viewStatesRef = useRef({});
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  const activeFileIdRef = useRef(activeFileId);
  useEffect(() => {
    activeFileIdRef.current = activeFileId;
  }, [activeFileId]);

  // Synchronize active file focus with room collaborators in real-time
  useEffect(() => {
    if (socket && isConnected && activeFileId) {
      socket.emit('peer:focus', { roomId, fileId: activeFileId });
    }
  }, [socket, isConnected, activeFileId, roomId]);

  // Core Editor State
  const [code, setCode] = useState('// Welcome to syncpad! Connecting to room...\n');
  const [language, setLanguage] = useState('javascript');
  // Theme State ('dark' | 'light')
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('syncpad_theme');
      return saved === 'light' ? 'light' : 'dark';
    } catch (_) {
      return 'dark';
    }
  });

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('syncpad_theme', next);
      } catch (_) {}
      return next;
    });
  };
  const [stdin, setStdin] = useState('');
  const [roomTitle, setRoomTitle] = useState(`Room: ${roomId}`);

  // Collaboration State
  const [activeUsers, setActiveUsers] = useState([]);
  const [knownParticipants, setKnownParticipants] = useState([]);
  const [remoteCursors, setRemoteCursors] = useState(new Map());
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activities, setActivities] = useState([]);
  const [isPeerExecuting, setIsPeerExecuting] = useState(null);
  const [currentUserRole, setCurrentUserRole] = useState('editor'); // 'host' | 'editor' | 'viewer'

  // Right Sidebar State (Supports hide/unhide just like Explorer)
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(true);
  const [sidebarTab, setSidebarTab] = useState('chat'); // 'chat' | 'participants' | 'activity'
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Stable reference for active sidebar tab
  const sidebarTabRef = useRef(sidebarTab);
  useEffect(() => {
    sidebarTabRef.current = sidebarTab;
  }, [sidebarTab]);

  // Execution State
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionOutput, setExecutionOutput] = useState(null);

  // Saved feedback
  const [isSaved, setIsSaved] = useState(false);

  // Monaco References
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  const decorationsRef = useRef([]);
  const isLocalChange = useRef(false);
  const chatScrollRef = useRef(null);
  const hasJoinedRef = useRef(false);

  // Redirect to login if user is not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate(`/login?redirect=editor/${roomId}`);
    }
  }, [isLoading, isAuthenticated, roomId, navigate]);

  // Save room to local storage recent list for dashboard activity (user-scoped)
  useEffect(() => {
    if (!roomId || roomNotFound) return;
    try {
      const storageKey = user?.id ? `syncpad_recent_rooms_${user.id}` : 'syncpad_recent_rooms_guest';
      const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = [
        { roomId, title: roomTitle, language, lastVisited: Date.now() },
        ...stored.filter((r) => r.roomId !== roomId),
      ].slice(0, 20);
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {}
  }, [roomId, roomTitle, language, roomNotFound, user?.id]);

  // Verify Room Exists in DB (Do not auto-create on invalid link)
  useEffect(() => {
    if (!roomId) return;
    setIsVerifyingRoom(true);

    fetch(`/api/rooms/${roomId}`)
      .then((res) => {
        if (!res.ok) {
          setRoomNotFound(true);
          setNotFoundMessage(`Room "${roomId}" does not exist or the link is invalid.`);
          setIsVerifyingRoom(false);
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (!data || !data.room) {
          setRoomNotFound(true);
          setNotFoundMessage(`Room "${roomId}" does not exist or the link is invalid.`);
        } else {
          setRoomNotFound(false);
          if (data.room.title) setRoomTitle(data.room.title);
          if (data.room.stdin) setStdin(data.room.stdin);
          if (data.room.owner) setRoomOwner(data.room.owner);
          if (data.room.collaborators) setKnownParticipants(data.room.collaborators);

          if (data.room.files && data.room.files.length > 0) {
            setFiles(data.room.files);
            const nonDirFiles = data.room.files.filter((f) => f.type !== 'directory');
            const initialId =
              (data.room.activeFileId && nonDirFiles.some((f) => f.id === data.room.activeFileId))
                ? data.room.activeFileId
                : (nonDirFiles[0]?.id || data.room.files[0].id);
            setActiveFileId(initialId);
            setOpenTabs(nonDirFiles.map((f) => f.id));
            const initialFile = nonDirFiles.find((f) => f.id === initialId) || nonDirFiles[0] || data.room.files[0];
            if (initialFile) {
              setCode(initialFile.content || '');
              setLanguage(initialFile.language || 'javascript');
            }
          } else {
            if (data.room.language) setLanguage(data.room.language);
            if (data.room.code) setCode(data.room.code);
          }

          if (user && data.room.owner) {
            const ownerId = data.room.owner.id || data.room.owner._id;
            const myId = user.id || user._id;
            if (ownerId && myId && String(ownerId) === String(myId)) {
              setCurrentUserRole('host');
            }
          }
        }
        setIsVerifyingRoom(false);
      })
      .catch((e) => {
        console.error('Room fetch error:', e);
        setRoomNotFound(true);
        setNotFoundMessage('Unable to reach server or room does not exist.');
        setIsVerifyingRoom(false);
      });
  }, [roomId, user]);

  // Join Room over Socket.io
  useEffect(() => {
    if (!socket || !roomId || !user || roomNotFound) return;

    if (!hasJoinedRef.current) {
      hasJoinedRef.current = true;

      const userColor = user.avatar?.startsWith('#')
        ? user.avatar
        : PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)];

      const joinPayload = {
        roomId,
        user: {
          id: user.id || user._id || socket.id,
          name: user.username || 'Developer',
          avatar: user.avatar,
          color: userColor,
          role: currentUserRole,
          activeFileId: activeFileId || '',
        },
      };

      socket.emit('room:join', joinPayload);
    }

    const handleRoomInit = (data) => {
      if (data.title) setRoomTitle(data.title);
      if (data.stdin !== undefined) setStdin(data.stdin);
      if (data.users) setActiveUsers(data.users);
      if (data.participants) setKnownParticipants(data.participants);
      if (data.currentUserRole) setCurrentUserRole(data.currentUserRole);

      if (data.files && data.files.length > 0) {
        setFiles(data.files);
        const nonDirFiles = data.files.filter((f) => f.type !== 'directory');
        const targetId =
          (data.activeFileId && nonDirFiles.some((f) => f.id === data.activeFileId))
            ? data.activeFileId
            : (nonDirFiles[0]?.id || data.files[0].id);
        setActiveFileId(targetId);
        setOpenTabs(nonDirFiles.map((f) => f.id));
        const activeFile = nonDirFiles.find((f) => f.id === targetId) || nonDirFiles[0] || data.files[0];
        if (activeFile) {
          setCode(activeFile.content || '');
          setLanguage(activeFile.language || 'javascript');
        }
        if (socket && isConnected && targetId) {
          socket.emit('peer:focus', { roomId, fileId: targetId });
        }
      } else {
        if (data.code !== undefined) setCode(data.code);
        if (data.language) setLanguage(data.language);
      }

      if (data.messages && data.messages.length > 0) {
        setMessages((prev) => {
          const ids = new Set(prev.map((m) => m._id).filter(Boolean));
          const list = [...prev];
          data.messages.forEach((m) => {
            if (!ids.has(m._id)) {
              list.push(m);
              if (m._id) ids.add(m._id);
            }
          });
          return list;
        });
      }
    };

    const handleRoomNotFound = (data) => {
      setRoomNotFound(true);
      setNotFoundMessage(data.message || `Room "${roomId}" does not exist.`);
    };

    const handleRoomUsers = (data) => {
      if (data.users) setActiveUsers(data.users);
      if (data.participants) setKnownParticipants(data.participants);
    };

    const handleUserJoined = (data) => {
      if (data.users) setActiveUsers(data.users);
      if (data.participants) setKnownParticipants(data.participants);
    };

    const handleUserLeft = (data) => {
      if (data.users) setActiveUsers(data.users);
      if (data.participants) setKnownParticipants(data.participants);
      setRemoteCursors((prev) => {
        const next = new Map(prev);
        next.delete(data.socketId);
        return next;
      });
    };

    const handleActivityLog = (act) => {
      setActivities((prev) => [act, ...prev.slice(0, 49)]);
    };

    const handleRoleUpdated = ({ targetUserId, newRole }) => {
      const myId = user?.id || user?._id;
      if (myId && String(myId) === String(targetUserId)) {
        setCurrentUserRole(newRole);
      }
    };

    const handleRemoteCodeChange = (data) => {
      if (data.socketId !== socket.id) {
        setCode(data.code);
        if (editorRef.current && editorRef.current.getValue() !== data.code) {
          isLocalChange.current = true;
          const position = editorRef.current.getPosition();
          editorRef.current.setValue(data.code);
          if (position) editorRef.current.setPosition(position);
          isLocalChange.current = false;
        }
      }
    };

    const handleRemoteCursor = (data) => {
      if (data.socketId !== socket.id) {
        setRemoteCursors((prev) => {
          const next = new Map(prev);
          next.set(data.socketId, data);
          return next;
        });
        if (data.fileId) {
          setActiveUsers((prev) =>
            prev.map((u) => {
              if (u.socketId === data.socketId || (data.user?.id && (u.id === data.user.id || u._id === data.user.id))) {
                return { ...u, activeFileId: data.fileId };
              }
              return u;
            })
          );
        }
      }
    };

    const handleFileCreated = ({ file }) => {
      setFiles((prev) => {
        if (prev.some((f) => f.id === file.id)) return prev;
        return [...prev, file];
      });
      if (file.type !== 'directory') {
        setOpenTabs((prev) => (prev.includes(file.id) ? prev : [...prev, file.id]));
        if (monacoRef.current) {
          getOrCreateModel(file);
        }
      }
    };

    const handleFileDeleted = ({ fileId, activeFileId: nextActiveId }) => {
      if (modelsRef.current[fileId]) {
        modelsRef.current[fileId].dispose();
        delete modelsRef.current[fileId];
      }
      delete viewStatesRef.current[fileId];

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setOpenTabs((prev) => prev.filter((id) => id !== fileId));

      if (activeFileIdRef.current === fileId && nextActiveId) {
        handleSwitchFile(nextActiveId);
      }
    };

    const handleFileRenamed = ({ fileId, newName, newLanguage, newPath }) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.id === fileId
            ? { ...f, name: newName, path: newPath || `/${newName}`, language: newLanguage || f.language }
            : f
        )
      );

      if (modelsRef.current[fileId] && newLanguage && monacoRef.current) {
        const monacoLang = LANGUAGES.find((l) => l.id === newLanguage)?.monaco || newLanguage;
        monacoRef.current.editor.setModelLanguage(modelsRef.current[fileId], monacoLang);
      }

      if (activeFileIdRef.current === fileId && newLanguage) {
        setLanguage(newLanguage);
      }
    };

    const handleFolderCreated = ({ folder }) => {
      setFiles((prev) => {
        if (prev.some((f) => f.id === folder.id)) return prev;
        return [...prev, folder];
      });
    };

    const handleFolderRenamed = ({ folderId, oldPath, newPath, newName, updatedChildren }) => {
      setFiles((prev) => {
        const updatedMap = new Map((updatedChildren || []).map((c) => [c.id, c.path]));
        const prefix = oldPath.endsWith('/') ? oldPath : `${oldPath}/`;
        const newPrefix = newPath.endsWith('/') ? newPath : `${newPath}/`;

        return prev.map((f) => {
          if (f.id === folderId) {
            return { ...f, name: newName, path: newPath };
          }
          if (updatedMap.has(f.id)) {
            return { ...f, path: updatedMap.get(f.id) };
          }
          if (f.path && f.path.startsWith(prefix)) {
            return { ...f, path: f.path.replace(prefix, newPrefix) };
          }
          return f;
        });
      });
    };

    const handleFolderDeleted = ({ folderId, folderPath, deletedIds = [], activeFileId: nextActiveId }) => {
      const idsToRemove = new Set([folderId, ...deletedIds]);

      idsToRemove.forEach((id) => {
        if (modelsRef.current[id]) {
          modelsRef.current[id].dispose();
          delete modelsRef.current[id];
        }
        delete viewStatesRef.current[id];
      });

      setFiles((prev) => prev.filter((f) => !idsToRemove.has(f.id)));
      setOpenTabs((prev) => prev.filter((id) => !idsToRemove.has(id)));

      if (idsToRemove.has(activeFileIdRef.current)) {
        if (nextActiveId) {
          handleSwitchFile(nextActiveId);
        } else {
          const remainingFile = filesRef.current.find((f) => !idsToRemove.has(f.id) && f.type !== 'directory');
          if (remainingFile) {
            handleSwitchFile(remainingFile.id);
          }
        }
      }
    };

    const handleItemMoved = ({ itemId, itemType, oldPath, newPath, updatedChildren = [] }) => {
      setFiles((prev) => {
        const childMap = new Map((updatedChildren || []).map((c) => [c.id, c.path]));
        const oldPrefix = oldPath.endsWith('/') ? oldPath : `${oldPath}/`;
        const newPrefix = newPath.endsWith('/') ? newPath : `${newPath}/`;

        return prev.map((f) => {
          if (f.id === itemId) {
            const lastSlash = newPath.lastIndexOf('/');
            const newParent = lastSlash <= 0 ? null : newPath.substring(0, lastSlash);
            return { ...f, path: newPath, parentId: newParent === '/' ? null : newParent };
          }
          if (childMap.has(f.id)) {
            const updatedChildPath = childMap.get(f.id);
            const cSlash = updatedChildPath.lastIndexOf('/');
            const cParent = cSlash <= 0 ? null : updatedChildPath.substring(0, cSlash);
            return { ...f, path: updatedChildPath, parentId: cParent === '/' ? null : cParent };
          }
          if (f.path && f.path.startsWith(oldPrefix)) {
            const updatedChildPath = f.path.replace(oldPrefix, newPrefix);
            const cSlash = updatedChildPath.lastIndexOf('/');
            const cParent = cSlash <= 0 ? null : updatedChildPath.substring(0, cSlash);
            return { ...f, path: updatedChildPath, parentId: cParent === '/' ? null : cParent };
          }
          return f;
        });
      });
    };

    const handleFileContentChange = ({ fileId, code: newCode, socketId: senderSocketId }) => {
      if (senderSocketId !== socket.id) {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, content: newCode } : f))
        );

        const targetModel = modelsRef.current[fileId];
        if (targetModel && targetModel.getValue() !== newCode) {
          isLocalChange.current = true;
          targetModel.setValue(newCode);
          isLocalChange.current = false;
        }

        if (activeFileIdRef.current === fileId) {
          setCode(newCode);
        }
      }
    };

    const handlePeerFocus = ({ socketId: peerSocketId, fileId: focusedFileId, user: peerUser }) => {
      setActiveUsers((prev) => {
        let found = false;
        const next = prev.map((u) => {
          const matchesSocket = u.socketId && peerSocketId && u.socketId === peerSocketId;
          const matchesId = peerUser?.id && (u.id === peerUser.id || u._id === peerUser.id);
          const matchesName = peerUser?.name && u.name === peerUser.name;
          if (matchesSocket || matchesId || matchesName) {
            found = true;
            return { ...u, activeFileId: focusedFileId, socketId: peerSocketId || u.socketId };
          }
          return u;
        });
        if (!found && (peerUser || peerSocketId)) {
          next.push({
            ...(peerUser || {}),
            id: peerUser?.id || peerSocketId,
            name: peerUser?.name || 'Developer',
            color: peerUser?.color || '#3b82f6',
            socketId: peerSocketId,
            activeFileId: focusedFileId,
            isOnline: true,
          });
        }
        return next;
      });
    };

    const handleEntrypointSet = ({ fileId }) => {
      setFiles((prev) =>
        prev.map((f) => ({ ...f, isEntrypoint: f.id === fileId }))
      );
    };

    const handleLanguageChange = (data) => {
      setLanguage(data.language);
      if (data.fileId) {
        setFiles((prev) =>
          prev.map((f) => (f.id === data.fileId ? { ...f, language: data.language } : f))
        );
        if (modelsRef.current[data.fileId] && monacoRef.current) {
          const monacoLang = LANGUAGES.find((l) => l.id === data.language)?.monaco || data.language;
          monacoRef.current.editor.setModelLanguage(modelsRef.current[data.fileId], monacoLang);
        }
      }
    };

    const handleStdinChange = (data) => {
      setStdin(data.stdin || '');
    };

    const handlePeerExecuting = (data) => {
      if (data.isExecuting) {
        setIsPeerExecuting(data.triggeredBy);
      } else {
        setIsPeerExecuting(null);
      }
    };

    const handleChatReceive = (msg) => {
      setMessages((prev) => {
        if (msg._id && prev.some((m) => m._id === msg._id)) {
          return prev;
        }
        if (
          msg.type === 'system' &&
          prev.some(
            (m) =>
              m.type === 'system' &&
              m.text === msg.text &&
              Math.abs(new Date(m.createdAt || 0) - new Date(msg.createdAt || 0)) < 10000
          )
        ) {
          return prev;
        }
        return [...prev, msg];
      });

      // Track unread chat count when user is on another tab
      if (sidebarTabRef.current !== 'chat') {
        setUnreadChatCount((count) => count + 1);
      }
    };

    socket.on('room:init', handleRoomInit);
    socket.on('room:not_found', handleRoomNotFound);
    socket.on('room:users', handleRoomUsers);
    socket.on('user:joined', handleUserJoined);
    socket.on('user:left', handleUserLeft);
    socket.on('activity:log', handleActivityLog);
    socket.on('role:updated', handleRoleUpdated);
    socket.on('chat:receive', handleChatReceive);
    socket.on('code:change', handleRemoteCodeChange);
    socket.on('cursor:move', handleRemoteCursor);
    socket.on('language:change', handleLanguageChange);
    socket.on('stdin:change', handleStdinChange);
    socket.on('code:executing', handlePeerExecuting);
    socket.on('file:created', handleFileCreated);
    socket.on('file:deleted', handleFileDeleted);
    socket.on('file:renamed', handleFileRenamed);
    socket.on('file:content_change', handleFileContentChange);
    socket.on('peer:focus', handlePeerFocus);
    socket.on('entrypoint:set', handleEntrypointSet);
    socket.on('folder:created', handleFolderCreated);
    socket.on('folder:renamed', handleFolderRenamed);
    socket.on('folder:deleted', handleFolderDeleted);
    socket.on('item:moved', handleItemMoved);

    const handleBeforeUnload = () => {
      socket.emit('room:leave', { roomId });
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      hasJoinedRef.current = false;
      socket.emit('room:leave', { roomId });
      window.removeEventListener('beforeunload', handleBeforeUnload);

      socket.off('room:init', handleRoomInit);
      socket.off('room:not_found', handleRoomNotFound);
      socket.off('room:users', handleRoomUsers);
      socket.off('user:joined', handleUserJoined);
      socket.off('user:left', handleUserLeft);
      socket.off('activity:log', handleActivityLog);
      socket.off('role:updated', handleRoleUpdated);
      socket.off('chat:receive', handleChatReceive);
      socket.off('code:change', handleRemoteCodeChange);
      socket.off('cursor:move', handleRemoteCursor);
      socket.off('language:change', handleLanguageChange);
      socket.off('stdin:change', handleStdinChange);
      socket.off('code:executing', handlePeerExecuting);
      socket.off('file:created', handleFileCreated);
      socket.off('file:deleted', handleFileDeleted);
      socket.off('file:renamed', handleFileRenamed);
      socket.off('file:content_change', handleFileContentChange);
      socket.off('peer:focus', handlePeerFocus);
      socket.off('entrypoint:set', handleEntrypointSet);
      socket.off('folder:created', handleFolderCreated);
      socket.off('folder:renamed', handleFolderRenamed);
      socket.off('folder:deleted', handleFolderDeleted);
      socket.off('item:moved', handleItemMoved);
    };
  }, [socket, roomId, user, roomNotFound]);

  // Keyboard Shortcuts: Ctrl+Enter (Run) & Ctrl+S (Save)
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunCode();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSaveRoom();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [code, language, stdin, roomTitle, isExecuting, currentUserRole]);

  const handleSelectTab = (tab) => {
    setSidebarTab(tab);
    if (tab === 'chat') {
      setUnreadChatCount(0);
    }
  };

  const handleCopyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const participantsList = useMemo(() => {
    const map = new Map();

    const isUserOwner = (uid, uname) => {
      if (roomOwner) {
        if (roomOwner.id && uid && String(roomOwner.id) === String(uid)) return true;
        if (roomOwner._id && uid && String(roomOwner._id) === String(uid)) return true;
        if (roomOwner.username && uname && roomOwner.username === uname) return true;
      }
      return false;
    };

    knownParticipants.forEach((p) => {
      const key = p.id || p.username || p.name;
      if (key) {
        const isHost = isUserOwner(p.id, p.username);
        map.set(key, {
          id: p.id,
          name: p.username || p.name || 'Developer',
          avatar: p.avatar,
          color: p.color,
          role: isHost ? 'host' : (p.role || 'editor'),
          isOnline: false,
          isHost,
        });
      }
    });

    if (roomOwner) {
      const key = roomOwner.id || roomOwner._id || roomOwner.username;
      if (key && !map.has(key)) {
        map.set(key, {
          id: key,
          name: roomOwner.username || 'Room Host',
          avatar: roomOwner.avatar,
          color: '#818cf8',
          role: 'host',
          isOnline: false,
          isHost: true,
        });
      }
    }

    activeUsers.forEach((u) => {
      const key = u.id || u.username || u.name;
      if (key) {
        const prev = map.get(key) || {};
        const isHost = isUserOwner(u.id, u.name) || prev.isHost || u.role === 'host';
        map.set(key, {
          ...prev,
          id: u.id || prev.id || key,
          name: u.name || u.username || prev.name || 'Developer',
          avatar: u.avatar || prev.avatar,
          color: u.color || prev.color || '#10b981',
          socketId: u.socketId || prev.socketId,
          role: isHost ? 'host' : (u.role || prev.role || 'editor'),
          isOnline: true,
          isHost,
          activeFileId: u.activeFileId !== undefined ? u.activeFileId : prev.activeFileId,
        });
      }
    });

    if (user) {
      const myKey = user.id || user._id || user.username;
      if (myKey) {
        const prev = map.get(myKey) || {};
        const isHost = isUserOwner(user.id || user._id, user.username) || prev.isHost;
        map.set(myKey, {
          ...prev,
          id: myKey,
          name: user.username || prev.name || 'Developer',
          avatar: user.avatar || prev.avatar,
          color: prev.color || '#3b82f6',
          role: isHost ? 'host' : (currentUserRole || prev.role || 'editor'),
          isOnline: true,
          isHost,
          isMe: true,
          activeFileId: activeFileId,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.isHost !== b.isHost) return a.isHost ? -1 : 1;
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [knownParticipants, activeUsers, roomOwner, user, currentUserRole, activeFileId]);

  const onlineCount = useMemo(() => {
    return participantsList.filter((p) => p.isOnline).length;
  }, [participantsList]);

  const onlineParticipants = useMemo(() => {
    return participantsList.filter((p) => p.isOnline);
  }, [participantsList]);

  const isCurrentHost = useMemo(() => {
    return participantsList.some((p) => p.isMe && p.role === 'host');
  }, [participantsList]);

  const handleToggleRole = (participant) => {
    if (!isCurrentHost || participant.isHost) return;
    const targetRole = participant.role === 'viewer' ? 'editor' : 'viewer';
    if (socket && isConnected) {
      socket.emit('role:change', {
        roomId,
        targetUserId: participant.id || participant.socketId,
        newRole: targetRole,
      });
    }
  };

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages, sidebarTab]);

  useEffect(() => {
    if (!editorRef.current || !monacoRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;

    const newDecorations = [];

    remoteCursors.forEach((cursorData, peerSocketId) => {
      // Only render cursor if peer is editing the same file
      if (cursorData.fileId && cursorData.fileId !== activeFileId) {
        return;
      }
      if (!cursorData.position) return;
      const { lineNumber, column } = cursorData.position;
      const peerColor = cursorData.user?.color || '#ec4899';
      const peerName = cursorData.user?.name || 'Peer';

      newDecorations.push({
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          className: `remote-cursor-${peerSocketId.replace(/[^a-zA-Z0-9]/g, '')}`,
          before: {
            content: ` ${peerName} `,
            inlineClassName: `remote-tag-${peerSocketId.replace(/[^a-zA-Z0-9]/g, '')}`,
          },
          overviewRuler: {
            color: peerColor,
            position: monaco.editor.OverviewRulerLane.Full,
          },
        },
      });

      const styleId = `cursor-style-${peerSocketId}`;
      let styleTag = document.getElementById(styleId);
      if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = styleId;
        document.head.appendChild(styleTag);
      }
      styleTag.innerHTML = `
        .remote-cursor-${peerSocketId.replace(/[^a-zA-Z0-9]/g, '')} {
          border-left: 2px solid ${peerColor} !important;
          margin-left: -1px;
          z-index: 20;
        }
        .remote-tag-${peerSocketId.replace(/[^a-zA-Z0-9]/g, '')} {
          background-color: ${peerColor};
          color: #ffffff;
          font-size: 10px;
          font-weight: 700;
          border-radius: 3px;
          padding: 1px 4px;
          margin-right: 4px;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        }
      `;
    });

    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, newDecorations);
  }, [remoteCursors, activeFileId]);

  const getOrCreateModel = (file) => {
    if (!monacoRef.current || !file) return null;
    const monaco = monacoRef.current;
    if (modelsRef.current[file.id]) {
      return modelsRef.current[file.id];
    }
    const monacoLang = LANGUAGES.find((l) => l.id === file.language)?.monaco || file.language || 'javascript';
    const uri = monaco.Uri.parse(`inmemory://syncpad/${roomId}/${file.id}/${file.name}`);
    let model = monaco.editor.getModel(uri);
    if (!model) {
      model = monaco.editor.createModel(file.content || '', monacoLang, uri);
    }
    modelsRef.current[file.id] = model;
    return model;
  };

  const handleSwitchFile = (targetFileId) => {
    if (!targetFileId || targetFileId === activeFileIdRef.current) return;
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    const currentId = activeFileIdRef.current;

    // 1. Save view state of current file
    if (editor && currentId) {
      viewStatesRef.current[currentId] = editor.saveViewState();
    }

    const targetFile = filesRef.current.find((f) => f.id === targetFileId);
    if (!targetFile) return;

    // 2. Ensure model exists
    let targetModel = modelsRef.current[targetFileId];
    if (!targetModel && monaco) {
      targetModel = getOrCreateModel(targetFile);
    }

    // 3. Switch model & restore view state
    if (editor && targetModel) {
      editor.setModel(targetModel);
      if (viewStatesRef.current[targetFileId]) {
        editor.restoreViewState(viewStatesRef.current[targetFileId]);
      }
      editor.focus();
    }

    // 4. Update component state
    setActiveFileId(targetFileId);
    setCode(targetFile.content || '');
    setLanguage(targetFile.language || 'javascript');

    // Ensure tab is open
    setOpenTabs((prev) => (prev.includes(targetFileId) ? prev : [...prev, targetFileId]));

    // 5. Broadcast focus to peers
    if (socket && isConnected) {
      socket.emit('peer:focus', { roomId, fileId: targetFileId });
      if (editor) {
        socket.emit('cursor:move', {
          roomId,
          fileId: targetFileId,
          position: editor.getPosition(),
          selection: editor.getSelection(),
        });
      }
    }
  };

  const handleCloseTab = (fileId) => {
    const remaining = openTabs.filter((id) => id !== fileId);
    if (remaining.length === 0) {
      return;
    }
    setOpenTabs(remaining);
    if (activeFileId === fileId) {
      handleSwitchFile(remaining[remaining.length - 1]);
    }
  };

  const handleCreateFile = ({ name, path: filePath, parentPath, language: fileLang, content }) => {
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const finalPath = filePath || (parentPath ? `${parentPath}/${name}` : `/${name}`);
    const normalizedPath = normalizePath(finalPath);
    const newFile = {
      id: fileId,
      name,
      path: normalizedPath,
      parentId: parentPath || null,
      type: 'file',
      language: fileLang,
      content: content || '',
      isEntrypoint: files.filter((f) => f.type !== 'directory').length === 0,
      updatedAt: new Date(),
    };

    setFiles((prev) => [...prev, newFile]);
    setOpenTabs((prev) => [...prev, fileId]);

    if (monacoRef.current) {
      getOrCreateModel(newFile);
    }

    handleSwitchFile(fileId);

    if (socket && isConnected) {
      socket.emit('file:create', { roomId, file: newFile });
    }
  };

  const handleDeleteFile = (fileId) => {
    const remainingFiles = files.filter((f) => f.type !== 'directory' && f.id !== fileId);
    if (remainingFiles.length === 0) return;
    if (socket && isConnected) {
      socket.emit('file:delete', { roomId, fileId });
    }

    if (modelsRef.current[fileId]) {
      modelsRef.current[fileId].dispose();
      delete modelsRef.current[fileId];
    }
    delete viewStatesRef.current[fileId];

    const remaining = files.filter((f) => f.id !== fileId);
    setFiles(remaining);
    setOpenTabs((prev) => prev.filter((id) => id !== fileId));

    if (activeFileId === fileId && remainingFiles.length > 0) {
      handleSwitchFile(remainingFiles[0].id);
    }
  };

  const handleRenameFile = (fileId, newName, newLang, newPath) => {
    const current = filesRef.current.find((f) => f.id === fileId);
    const finalPath = newPath || (current?.path ? current.path.replace(/[^/]+$/, newName) : `/${newName}`);
    if (socket && isConnected) {
      socket.emit('file:rename', { roomId, fileId, newName, newLanguage: newLang, newPath: finalPath });
    }

    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, name: newName, path: finalPath, language: newLang || f.language } : f
      )
    );

    if (modelsRef.current[fileId] && newLang && monacoRef.current) {
      const monacoLang = LANGUAGES.find((l) => l.id === newLang)?.monaco || newLang;
      monacoRef.current.editor.setModelLanguage(modelsRef.current[fileId], monacoLang);
    }

    if (activeFileId === fileId && newLang) {
      setLanguage(newLang);
    }
  };

  const handleCreateFolder = ({ name, path: folderPath, parentPath }) => {
    const folderId = `folder-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const finalPath = folderPath || (parentPath ? `${parentPath}/${name}` : `/${name}`);
    const normalizedPath = normalizePath(finalPath);
    const newFolder = {
      id: folderId,
      name,
      path: normalizedPath,
      parentId: parentPath || null,
      type: 'directory',
      updatedAt: new Date(),
    };

    setFiles((prev) => [...prev, newFolder]);

    if (socket && isConnected) {
      socket.emit('folder:create', { roomId, folder: newFolder });
    }
  };

  const handleRenameFolder = (folderId, oldPath, newPath, newName) => {
    const prefix = oldPath.endsWith('/') ? oldPath : `${oldPath}/`;
    const newPrefix = newPath.endsWith('/') ? newPath : `${newPath}/`;

    setFiles((prev) =>
      prev.map((f) => {
        if (f.id === folderId) {
          return { ...f, name: newName, path: newPath };
        }
        if (f.path && f.path.startsWith(prefix)) {
          return { ...f, path: f.path.replace(prefix, newPrefix) };
        }
        return f;
      })
    );

    if (socket && isConnected) {
      socket.emit('folder:rename', { roomId, folderId, oldPath, newPath, newName });
    }
  };

  const handleDeleteFolder = (folderId, folderPath) => {
    const targetPath = folderPath || filesRef.current.find((f) => f.id === folderId)?.path;
    const prefix = targetPath?.endsWith('/') ? targetPath : `${targetPath}/`;

    const idsToDelete = new Set();
    idsToDelete.add(folderId);
    filesRef.current.forEach((item) => {
      if (item.id === folderId || item.path === targetPath || (item.path && item.path.startsWith(prefix))) {
        idsToDelete.add(item.id);
      }
    });

    idsToDelete.forEach((id) => {
      if (modelsRef.current[id]) {
        modelsRef.current[id].dispose();
        delete modelsRef.current[id];
      }
      delete viewStatesRef.current[id];
    });

    const remaining = filesRef.current.filter((f) => !idsToDelete.has(f.id));
    setFiles(remaining);
    setOpenTabs((prev) => prev.filter((id) => !idsToDelete.has(id)));

    if (idsToDelete.has(activeFileIdRef.current)) {
      const nextFile = remaining.find((f) => f.type !== 'directory');
      if (nextFile) {
        handleSwitchFile(nextFile.id);
      }
    }

    if (socket && isConnected) {
      socket.emit('folder:delete', { roomId, folderId, folderPath: targetPath });
    }
  };

  const handleSetEntrypoint = (fileId) => {
    if (socket && isConnected) {
      socket.emit('entrypoint:set', { roomId, fileId });
    }
    setFiles((prev) =>
      prev.map((f) => ({ ...f, isEntrypoint: f.id === fileId }))
    );
  };

  const handleMoveItem = ({ item, targetFolderPath, destPath, overwrite = false }) => {
    if (currentUserRole === 'viewer') return;

    const normDestPath = destPath || computeMovedPath(item, targetFolderPath);
    const updatedFiles = cascadeMovedPaths(filesRef.current, item, normDestPath);
    setFiles(updatedFiles);

    if (socket && isConnected) {
      socket.emit('item:move', {
        roomId,
        itemId: item.id,
        targetFolderPath,
        overwrite,
      });
    }
  };

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Initialize all existing models
    filesRef.current.forEach((f) => {
      getOrCreateModel(f);
    });

    const currId = activeFileIdRef.current || filesRef.current[0]?.id;
    if (currId) {
      const targetFile = filesRef.current.find((f) => f.id === currId);
      const model = targetFile ? getOrCreateModel(targetFile) : null;
      if (model) {
        editor.setModel(model);
        if (viewStatesRef.current[currId]) {
          editor.restoreViewState(viewStatesRef.current[currId]);
        }
      }
    }

    editor.onDidChangeModelContent(() => {
      if (isLocalChange.current) return;
      const currentId = activeFileIdRef.current;
      const currentModel = editor.getModel();
      if (!currentModel || !currentId) return;

      const newCode = currentModel.getValue();
      setCode(newCode);

      setFiles((prev) =>
        prev.map((f) => (f.id === currentId ? { ...f, content: newCode, updatedAt: new Date() } : f))
      );

      if (socket && isConnected && currentUserRole !== 'viewer') {
        socket.emit('file:content_change', {
          roomId,
          fileId: currentId,
          code: newCode,
        });
      }
    });

    editor.onDidChangeCursorPosition((e) => {
      const currentId = activeFileIdRef.current;
      if (socket && isConnected) {
        socket.emit('cursor:move', {
          roomId,
          fileId: currentId,
          position: e.position,
          selection: editor.getSelection(),
        });
      }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      handleRunCode();
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSaveRoom();
    });
  };



  const handleStdinChange = (newStdin) => {
    setStdin(newStdin);
    if (socket && isConnected) {
      socket.emit('stdin:change', { roomId, stdin: newStdin });
    }
  };

  const handleRunCode = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    // Expand output panel smoothly without destroying current output content
    setIsOutputCollapsed(false);

    if (socket && isConnected) {
      socket.emit('code:executing', {
        roomId,
        isExecuting: true,
        triggeredBy: user?.username || 'Collaborator',
      });
    }

    const currentFiles = filesRef.current;
    const entryFile =
      currentFiles.find((f) => f.isEntrypoint) ||
      currentFiles.find((f) => f.id === activeFileIdRef.current) ||
      currentFiles[0];

    // Minimum visual window (450ms) to ensure smooth transition and prevent epileptic flashes on fast responses
    const minWaitPromise = new Promise((resolve) => setTimeout(resolve, 450));

    try {
      const fetchPromise = fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: entryFile?.language || language,
          code: entryFile?.content || code,
          stdin,
          files: currentFiles.map((f) => ({
            id: f.id,
            name: f.name,
            path: f.path,
            language: f.language,
            content: f.content,
            isEntrypoint: !!f.isEntrypoint,
          })),
          entrypoint: entryFile?.name,
        }),
      });

      const [response] = await Promise.all([fetchPromise, minWaitPromise]);
      const data = await response.json();
      setExecutionOutput(data);
    } catch (err) {
      await minWaitPromise;
      setExecutionOutput({
        success: false,
        stdout: '',
        stderr: 'Execution Error: ' + err.message,
        output: err.message,
        exitCode: 1,
      });
    } finally {
      setIsExecuting(false);
      if (socket && isConnected) {
        socket.emit('code:executing', {
          roomId,
          isExecuting: false,
        });
      }
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!socket || !chatInput.trim()) return;
    socket.emit('chat:send', {
      roomId,
      text: chatInput.trim(),
      type: 'text',
    });
    setChatInput('');
  };

  const handleSaveRoom = async () => {
    if (currentUserRole === 'viewer') return;
    try {
      const currentFiles = filesRef.current;
      const entryFile =
        currentFiles.find((f) => f.isEntrypoint) ||
        currentFiles.find((f) => f.id === activeFileIdRef.current) ||
        currentFiles[0];

      const res = await fetch(`/api/rooms/${roomId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          files: currentFiles,
          activeFileId: activeFileIdRef.current,
          code: entryFile ? entryFile.content : code,
          language: entryFile ? entryFile.language : language,
          stdin,
          title: roomTitle,
          isPublic: true,
        }),
      });
      if (res.ok) {
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
        if (socket && isConnected) {
          socket.emit('room:save', { roomId });
        }
      }
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  const handleLeaveRoom = () => {
    if (socket && isConnected) {
      socket.emit('room:leave', { roomId });
    }
    if (isAuthenticated) {
      navigate('/dashboard');
    } else {
      navigate('/rooms');
    }
  };

  const entrypointId = useMemo(() => {
    const entry = files.find((f) => f.type !== 'directory' && f.isEntrypoint);
    if (entry) return entry.id;
    const firstFile = files.find((f) => f.type !== 'directory');
    return firstFile ? firstFile.id : '';
  }, [files]);

  const openFilesList = useMemo(() => {
    return openTabs
      .map((id) => files.find((f) => f.id === id))
      .filter((f) => f && f.type !== 'directory');
  }, [openTabs, files]);

  const activeFile = useMemo(() => {
    return files.find((f) => f.id === activeFileId && f.type !== 'directory') || null;
  }, [files, activeFileId]);

  const breadcrumbs = useMemo(() => {
    if (!activeFile) return [];
    return getBreadcrumbs(activeFile.path || `/${activeFile.name}`);
  }, [activeFile]);



  const formatActivityTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch (e) {
      return 'Just now';
    }
  };

  if (isVerifyingRoom && !roomNotFound) {
    return (
      <div className="room-loading-screen-modern">
        <Navbar />
        <div className="loading-container-modern">
          <div className="pulse-ring"></div>
          <h2 className="loading-title">Preparing Workspace</h2>
          <p className="loading-subtitle">Initializing room #{roomId}</p>
        </div>
      </div>
    );
  }

  if (roomNotFound) {
    return (
      <InvalidRoomModal
        isOpen={true}
        onClose={() => navigate('/rooms')}
        roomId={roomId}
        onBrowseRooms={() => navigate('/rooms')}
      />
    );
  }

  return (
    <div className="editor-room-root">
      <Navbar />

      {/* Minimalist Engineering Workspace Toolbar */}
      <header className="room-toolbar">
        {/* Zone 1: Identity & Environment (Left) */}
        <div className="toolbar-zone zone-identity">
          <div className="room-identity-group">
            <span className="room-title-text" title={roomTitle}>
              {roomTitle}
            </span>
            <button
              onClick={handleCopyRoomId}
              className="room-id-pill font-code"
              title="Click to copy Room ID"
            >
              <span>#{roomId}</span>
              {copiedId ? (
                <Check size={11} className="text-emerald" />
              ) : (
                <Copy size={10} className="copy-icon-glyph" />
              )}
            </button>
          </div>

          <div className="toolbar-divider" />

          {/* Theme Toggle Switch */}
          <button
            type="button"
            onClick={toggleTheme}
            className={`btn-theme-toggle ${theme}`}
            title={theme === 'dark' ? 'Switch to Light theme' : 'Switch to Dark theme'}
            aria-label={`Toggle editor theme (currently ${theme})`}
          >
            {theme === 'dark' ? (
              <Moon size={12} className="theme-toggle-icon" />
            ) : (
              <Sun size={12} className="theme-toggle-icon" />
            )}
            <span className="theme-toggle-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
          </button>
        </div>

        {/* Zone 2: Presence & Status (Center) */}
        <div className="toolbar-zone zone-presence">
          <div className="presence-group">
            {/* Minimal Avatar Stack */}
            <div className="avatar-stack">
              {onlineParticipants.slice(0, 4).map((p, idx) => {
                return (
                  <div
                    key={p.id || p.name || idx}
                    className="avatar-bubble font-code"
                    title={`${p.name}${p.isMe ? ' (You)' : ''} — ${p.role?.toUpperCase() || 'COLLABORATOR'}`}
                  >
                    {(p.name || 'D').charAt(0).toUpperCase()}
                  </div>
                );
              })}
              {onlineParticipants.length > 4 && (
                <div
                  className="avatar-bubble avatar-more font-code"
                  title={`${onlineParticipants.length - 4} more online`}
                >
                  +{onlineParticipants.length - 4}
                </div>
              )}
            </div>

            <div className="presence-status-badge">
              <span className="status-dot online" />
              <span className="presence-text font-code">{onlineCount} Online</span>
            </div>
          </div>

          {/* Peer Compiling Indicator */}
          {isPeerExecuting && (
            <div className="peer-running-indicator font-code animate-fade-in">
              <div className="spinner-indicator-micro" />
              <span>{isPeerExecuting} compiling...</span>
            </div>
          )}

          {currentUserRole === 'viewer' && (
            <div className="viewer-mode-badge font-code">
              <Eye size={10} />
              <span>Read-Only</span>
            </div>
          )}
        </div>

        {/* Zone 3: Actions (Right) */}
        <div className="toolbar-zone zone-actions">
          {/* Save Button */}
          {currentUserRole !== 'viewer' && (
            <button
              onClick={handleSaveRoom}
              className={`btn-toolbar-action ${isSaved ? 'btn-saved' : ''}`}
              title="Save Workspace (Ctrl+S)"
            >
              {isSaved ? <Check size={12} className="text-emerald" /> : <Save size={12} />}
              <span>{isSaved ? 'Saved' : 'Save'}</span>
            </button>
          )}

          {/* Share Button */}
          <button
            onClick={() => setIsShareOpen(true)}
            className="btn-toolbar-action"
            title="Share Workspace Link"
          >
            <Share2 size={12} />
            <span>Share</span>
          </button>

          {/* Minimalist Run Button */}
          <button
            onClick={handleRunCode}
            disabled={isExecuting}
            className={`btn-toolbar-run ${isExecuting ? 'is-loading' : ''}`}
            title="Run Code (Ctrl+Enter)"
          >
            {isExecuting ? (
              <Loader2 size={12} className="run-spinner-loop" />
            ) : (
              <Play size={10} fill="currentColor" className="run-play-glyph" />
            )}
            <span className="btn-run-text">Run</span>
          </button>

          <div className="toolbar-divider" />

          {/* Leave Workspace Button */}
          <button
            onClick={handleLeaveRoom}
            className="btn-toolbar-action btn-leave-room"
            title="Exit workspace and return to dashboard"
          >
            <LogOut size={12} />
            <span>Leave</span>
          </button>
        </div>
      </header>

      {/* Main Room Workspace: Left File Explorer, Center Tabs + Monaco + Output, Right Tabbed Sidebar */}
      <div className="room-workspace">
        {/* Left Dock: File Explorer */}
        <FileExplorer
          files={files}
          activeFileId={activeFileId}
          onSelectFile={handleSwitchFile}
          onCreateFile={handleCreateFile}
          onDeleteFile={handleDeleteFile}
          onRenameFile={handleRenameFile}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onSetEntrypoint={handleSetEntrypoint}
          onMoveItem={handleMoveItem}
          currentUserRole={currentUserRole}
          entrypointId={entrypointId}
          peers={onlineParticipants}
          isOpen={isExplorerOpen}
          onToggleOpen={() => setIsExplorerOpen(!isExplorerOpen)}
        />

        {/* Center/Left: Tab Bar + Monaco Editor + Output Console */}
        <div className="room-center-area">
          {/* VS Code Tab Bar */}
          <EditorTabBar
            openFiles={openFilesList}
            activeFileId={activeFileId}
            onSelectTab={handleSwitchFile}
            onCloseTab={handleCloseTab}
            onNewFile={() => {
              setIsExplorerOpen(true);
            }}
            peers={onlineParticipants}
            entrypointId={entrypointId}
          />

          {/* Breadcrumbs Navigation Bar */}
          {activeFile && breadcrumbs.length > 0 && (
            <div className="editor-breadcrumbs-bar font-code">
              {breadcrumbs.map((crumb, idx) => {
                const isLast = idx === breadcrumbs.length - 1;
                const isRoot = idx === 0;
                return (
                  <React.Fragment key={crumb.path}>
                    <div
                      className={`breadcrumb-item ${isLast ? 'active' : ''}`}
                      title={crumb.path}
                    >
                      {isRoot ? (
                        <span className="crumb-icon-root">📁</span>
                      ) : !isLast ? (
                        <Folder size={11} className="crumb-icon folder" />
                      ) : (
                        <FileCode size={11} className="crumb-icon file" />
                      )}
                      <span className="crumb-label">{crumb.name}</span>
                    </div>
                    {!isLast && <ChevronRight size={10} className="breadcrumb-separator" />}
                  </React.Fragment>
                );
              })}
            </div>
          )}

          <div className="monaco-wrapper">
            <Editor
              height="100%"
              theme={theme === 'light' ? 'vs-light' : 'vs-dark'}
              onMount={handleEditorDidMount}
              options={{
                readOnly: currentUserRole === 'viewer',
                fontSize: 13.5,
                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                fontLigatures: true,
                lineNumbers: 'on',
                roundedSelection: true,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                minimap: { enabled: false },
                bracketPairColorization: { enabled: true },
                padding: { top: 12, bottom: 12 },
                smoothScrolling: true,
                tabSize: 2,
                renderLineHighlight: 'all',
              }}
            />
          </div>

          {/* Output Terminal Console (Bottom Split) */}
          <OutputPanel
            output={executionOutput}
            isExecuting={isExecuting}
            stdin={stdin}
            onStdinChange={handleStdinChange}
            onClear={() => setExecutionOutput(null)}
            onRun={handleRunCode}
            isCollapsed={isOutputCollapsed}
            onToggleCollapse={() => setIsOutputCollapsed(!isOutputCollapsed)}
          />
        </div>

        {/* Right Dock: Tabbed Collaboration Sidebar (Collapsible like Explorer) */}
        {!isRightPanelOpen ? (
          <aside className="room-sidebar-collapsed" title="Collaboration Panel (Collapsed)">
            <button
              onClick={() => setIsRightPanelOpen(true)}
              className="collapsed-sidebar-btn"
              title="Expand Collaboration Panel"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="collapsed-divider" />
            <button
              onClick={() => {
                handleSelectTab('chat');
                setIsRightPanelOpen(true);
              }}
              className={`collapsed-sidebar-tab ${sidebarTab === 'chat' ? 'active' : ''}`}
              title={`Room Chat (${messages.length})`}
            >
              <MessageSquare size={16} />
              {unreadChatCount > 0 && <span className="collapsed-unread-dot" />}
            </button>
            <button
              onClick={() => {
                handleSelectTab('participants');
                setIsRightPanelOpen(true);
              }}
              className={`collapsed-sidebar-tab ${sidebarTab === 'participants' ? 'active' : ''}`}
              title={`Room Members (${onlineCount})`}
            >
              <Users size={16} />
            </button>
            <button
              onClick={() => {
                handleSelectTab('activity');
                setIsRightPanelOpen(true);
              }}
              className={`collapsed-sidebar-tab ${sidebarTab === 'activity' ? 'active' : ''}`}
              title="Live Activity Stream"
            >
              <Activity size={16} />
            </button>
          </aside>
        ) : (
          <aside className="room-sidebar">
            {/* Tab Navigation Header with Collapse Button */}
            <div className="sidebar-tabs-bar">
              <div className="sidebar-tabs-list">
                <button
                  onClick={() => handleSelectTab('chat')}
                  className={`sidebar-tab-btn ${sidebarTab === 'chat' ? 'active' : ''}`}
                  title="Room Chat"
                >
                  <MessageSquare size={13} />
                  <span>Chat</span>
                  {unreadChatCount > 0 && sidebarTab !== 'chat' ? (
                    <span className="tab-pill-unread font-code">{unreadChatCount}</span>
                  ) : (
                    <span className="tab-pill-count font-code">{messages.length}</span>
                  )}
                </button>

                <button
                  onClick={() => handleSelectTab('participants')}
                  className={`sidebar-tab-btn ${sidebarTab === 'participants' ? 'active' : ''}`}
                  title="Room Participants & Roles"
                >
                  <Users size={13} />
                  <span>Members</span>
                  <span className="tab-pill-count font-code">{onlineCount}</span>
                </button>

                <button
                  onClick={() => handleSelectTab('activity')}
                  className={`sidebar-tab-btn ${sidebarTab === 'activity' ? 'active' : ''}`}
                  title="Live Activity Stream"
                >
                  <Activity size={13} />
                  <span>Activity</span>
                </button>
              </div>

              {/* Collapse Panel Button */}
              <button
                onClick={() => setIsRightPanelOpen(false)}
                className="btn-collapse-sidebar"
                title="Collapse Panel"
              >
                <ChevronRight size={14} />
              </button>
            </div>

          {/* Tab Body 1: Room Chat (Full Height) */}
          {sidebarTab === 'chat' && (
            <div className="tab-panel-body chat-panel-body">
              <div className="room-chat-stream custom-scrollbar" ref={chatScrollRef}>
                {messages.length === 0 ? (
                  <div className="empty-chat">
                    <MessageSquare size={22} className="text-muted" />
                    <span className="empty-chat-title">Welcome to the Room!</span>
                    <p>Send messages in real-time to your team members.</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isSystem = msg.type === 'system';
                    const isSelf = msg.user?.id === user?.id || (user?._id && msg.user?.id === user._id);

                    if (isSystem) {
                      return (
                        <div key={msg._id || idx} className="chat-system-item">
                          <span>{msg.text}</span>
                        </div>
                      );
                    }

                    return (
                      <div key={msg._id || idx} className={`chat-message-row ${isSelf ? 'self' : 'peer'}`}>
                        <div
                          className="chat-avatar-circle"
                          style={{ backgroundColor: msg.user?.color || '#6366f1' }}
                        >
                          {(msg.user?.name || 'U').charAt(0).toUpperCase()}
                        </div>
                        <div className="chat-bubble">
                          <div className="chat-bubble-header">
                            <span className="chat-author">{msg.user?.name || 'Developer'}</span>
                            <span className="chat-time font-code">
                              {msg.createdAt
                                ? new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : ''}
                            </span>
                          </div>
                          <div className="chat-body">{msg.text}</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendChat} className="room-chat-form">
                <input
                  type="text"
                  placeholder="Type message to room..."
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="room-chat-input font-code"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="btn-chat-send"
                  title="Send Message (Enter)"
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          )}

          {/* Tab Body 2: Participants & Roles (Full Height) */}
          {sidebarTab === 'participants' && (
            <div className="tab-panel-body participants-panel-body">
              <div className="participants-tab-header">
                <span className="participants-header-text">
                  Active & Recognized Members ({participantsList.length})
                </span>
                {isCurrentHost && (
                  <span className="host-tip-text">Click role badge to toggle permissions</span>
                )}
              </div>

              <div className="participants-list custom-scrollbar">
                {participantsList.map((p, i) => {
                  const pColor = p.color || PEER_COLORS[i % PEER_COLORS.length];
                  const role = p.role || (p.isHost ? 'host' : 'editor');

                  return (
                    <div
                      key={p.id || p.name || i}
                      className={`participant-card ${p.isOnline ? 'online' : 'offline'}`}
                    >
                      <div className="participant-swatch" style={{ backgroundColor: pColor }}>
                        {(p.name || 'D').charAt(0).toUpperCase()}
                      </div>

                      <div className="participant-details">
                        <div className="participant-name-row">
                          <span className="participant-name">
                            {p.name}
                            {p.isMe && <span className="tag-you font-code">You</span>}
                          </span>

                          <span
                            className={`role-badge role-${role} ${
                              isCurrentHost && !p.isHost ? 'role-clickable' : ''
                            }`}
                            onClick={() => handleToggleRole(p)}
                            title={
                              isCurrentHost && !p.isHost
                                ? `Click to toggle role to ${role === 'viewer' ? 'Editor' : 'Viewer'}`
                                : `Role: ${role.toUpperCase()}`
                            }
                          >
                            {role === 'host' ? 'Host' : role === 'viewer' ? 'Viewer' : 'Editor'}
                          </span>
                        </div>

                        <div className="participant-status-indicator">
                          <span className={`status-dot ${p.isOnline ? 'online pulsing' : 'offline'}`} />
                          <span className="participant-status-text font-code">
                            {p.isOnline ? 'Active in room' : 'Offline'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="participants-footer">
                <button
                  onClick={() => setIsShareOpen(true)}
                  className="btn btn-secondary btn-sm btn-full-width"
                >
                  <Share2 size={13} />
                  <span>Invite Collaborators</span>
                </button>
              </div>
            </div>
          )}

          {/* Tab Body 3: Activity Feed (Full Height) */}
          {sidebarTab === 'activity' && (
            <div className="tab-panel-body activity-panel-body">
              <div className="activity-feed custom-scrollbar">
                {activities.length === 0 ? (
                  <div className="empty-activity">
                    <Clock size={18} className="text-muted" />
                    <span>No room activity recorded yet</span>
                  </div>
                ) : (
                  activities.map((act) => (
                    <div key={act.id || Math.random()} className="activity-item">
                      <div className={`act-icon-wrap act-${act.type || 'info'}`}>
                        {act.type === 'join' && <UserCheck size={11} strokeWidth={1.6} />}
                        {act.type === 'leave' && <UserMinus size={11} strokeWidth={1.6} />}
                        {act.type === 'language' && <FileCode size={11} strokeWidth={1.6} />}
                        {act.type === 'execution' && <Play size={10} strokeWidth={1.6} />}
                        {act.type === 'save' && <Save size={11} strokeWidth={1.6} />}
                        {act.type === 'item_move' && <Move size={11} strokeWidth={1.5} />}
                        {act.type === 'folder_create' && <FolderPlus size={11} strokeWidth={1.5} />}
                        {act.type === 'folder_delete' && <FolderMinus size={11} strokeWidth={1.5} />}
                        {act.type === 'folder_rename' && <FolderEdit size={11} strokeWidth={1.5} />}
                        {act.type === 'file_create' && <FilePlus size={11} strokeWidth={1.5} />}
                        {act.type === 'file_delete' && <FileMinus size={11} strokeWidth={1.5} />}
                        {act.type === 'file_rename' && <Edit3 size={11} strokeWidth={1.5} />}
                        {(!act.type || act.type === 'system' || act.type === 'info') && <Sparkles size={11} strokeWidth={1.5} />}
                      </div>
                      <div className="act-content">
                        <div className="act-text">{act.text}</div>
                        <div className="act-time font-code">{formatActivityTime(act.timestamp)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </aside>
      )}
    </div>

      {/* Share Room Modal */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        roomId={roomId}
        roomTitle={roomTitle}
      />

      <style>{`
        .editor-room-root {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          overflow: hidden;
        }

        /* Minimalist Engineering Room Toolbar */
        .room-toolbar {
          height: 44px;
          background: #090a0f;
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          gap: 16px;
          z-index: 50;
          flex-shrink: 0;
        }

        .toolbar-zone {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Zone 1: Identity & Environment */
        .room-identity-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .room-title-text {
          font-size: 13px;
          font-weight: 500;
          color: #ffffff;
          max-width: 200px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          letter-spacing: -0.01em;
        }

        .room-id-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          color: #71717a;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          padding: 2px 7px;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.12s ease;
        }

        .room-id-pill:hover {
          background: rgba(255, 255, 255, 0.07);
          color: #e5e7eb;
          border-color: rgba(255, 255, 255, 0.14);
        }

        .copy-icon-glyph {
          color: #71717a;
        }

        .room-id-pill:hover .copy-icon-glyph {
          color: #a1a1aa;
        }

        .toolbar-divider {
          width: 1px;
          height: 14px;
          background: rgba(255, 255, 255, 0.08);
          margin: 0 2px;
        }

        /* Theme Toggle Switch */
        .btn-theme-toggle {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 26px;
          padding: 0 8px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          color: #71717a;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.12s ease;
          user-select: none;
        }

        .btn-theme-toggle:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.16);
        }

        .theme-toggle-icon {
          color: #71717a;
          transition: color 0.12s ease;
        }

        .btn-theme-toggle:hover .theme-toggle-icon {
          color: #ffffff;
        }

        .theme-toggle-label {
          font-size: 11px;
          letter-spacing: 0.02em;
        }

        /* Zone 2: Presence & Status */
        .presence-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .avatar-stack {
          display: flex;
          align-items: center;
        }

        .avatar-bubble {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 1.5px solid #090a0f;
          margin-left: -5px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 500;
          color: #ffffff;
          background: #1c1e27;
          cursor: default;
          transition: transform 0.12s ease;
        }

        .avatar-bubble:first-child {
          margin-left: 0;
        }

        .avatar-bubble:hover {
          transform: translateY(-1px);
          z-index: 10;
        }

        .avatar-more {
          background: #181a22;
          color: #71717a;
          font-size: 9px;
        }

        .presence-status-badge {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 2px 7px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 4px;
        }

        .status-dot.online {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
        }

        .presence-text {
          font-size: 11px;
          color: #71717a;
        }

        .viewer-mode-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 10px;
          color: #71717a;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.07);
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .peer-running-indicator {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: #9ca3af;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .spinner-indicator-micro {
          width: 10px;
          height: 10px;
          border: 1.5px solid rgba(255, 255, 255, 0.15);
          border-top-color: #ffffff;
          border-radius: 50%;
          animation: spinMicro 0.7s linear infinite;
        }

        @keyframes spinMicro {
          to {
            transform: rotate(360deg);
          }
        }

        /* Zone 3: Actions */
        .btn-toolbar-action {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          height: 28px;
          padding: 0 10px;
          font-size: 11.5px;
          font-weight: 500;
          color: #9ca3af;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.12s ease;
          user-select: none;
        }

        .btn-toolbar-action:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.16);
        }

        .btn-toolbar-action.btn-saved {
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.25);
          background: rgba(16, 185, 129, 0.06);
        }

        .btn-leave-room {
          color: #71717a !important;
          border-color: rgba(255, 255, 255, 0.06) !important;
        }

        .btn-leave-room:hover {
          color: #ffffff !important;
          border-color: rgba(255, 255, 255, 0.16) !important;
          background: rgba(255, 255, 255, 0.05) !important;
        }

        /* Minimalist Run Button */
        .btn-toolbar-run {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 28px;
          padding: 0 12px;
          background: #ffffff;
          color: #090a0f;
          border: 1px solid #ffffff;
          border-radius: 4px;
          cursor: pointer;
          font-size: 11.5px;
          font-weight: 500;
          transition: all 0.12s ease;
          user-select: none;
          flex-shrink: 0;
        }

        .btn-toolbar-run:hover:not(:disabled) {
          background: #e5e7eb;
          border-color: #e5e7eb;
          transform: translateY(-0.5px);
        }

        .btn-toolbar-run:disabled,
        .btn-toolbar-run.is-loading {
          cursor: not-allowed;
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.1);
          color: #71717a;
          transform: none;
        }

        .run-play-glyph {
          flex-shrink: 0;
        }

        .run-spinner-loop {
          animation: spinMicro 0.7s linear infinite;
          flex-shrink: 0;
        }

        .btn-run-text {
          font-size: 11.5px;
          font-weight: 500;
          line-height: 1;
        }

        /* Room Workspace Layout */
        .room-workspace {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }

        .room-center-area {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #0d0d11;
        }

        /* Breadcrumbs Bar */
        .editor-breadcrumbs-bar {
          height: 26px;
          min-height: 26px;
          display: flex;
          align-items: center;
          padding: 0 14px;
          background: #09090b;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 11px;
          color: #71717a;
          overflow-x: auto;
          white-space: nowrap;
          gap: 6px;
          user-select: none;
        }

        .editor-breadcrumbs-bar::-webkit-scrollbar {
          height: 0px;
        }

        .breadcrumb-item {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #71717a;
          transition: color 0.12s ease;
          cursor: default;
        }

        .breadcrumb-item.active {
          color: #e4e4e7;
          font-weight: 500;
        }

        .breadcrumb-separator {
          color: #3f3f46;
          flex-shrink: 0;
        }

        .crumb-icon-root {
          font-size: 10px;
          line-height: 1;
        }

        .crumb-icon {
          flex-shrink: 0;
        }

        .crumb-icon.folder {
          color: #eab308;
        }

        .crumb-icon.file {
          color: #60a5fa;
        }

        .crumb-label {
          letter-spacing: -0.01em;
        }

        .monaco-wrapper {
          flex: 1;
          position: relative;
          overflow: hidden;
        }

        /* Minimalist Engineering Right Sidebar (Zero Glassmorphism) */
        .room-sidebar {
          width: 320px;
          min-width: 320px;
          border-left: 1px solid rgba(255, 255, 255, 0.07);
          background: #090a0f;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          overflow: hidden;
        }

        .sidebar-tabs-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 38px;
          background: #0c0e14;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          flex-shrink: 0;
          padding: 0 4px 0 0;
        }

        .sidebar-tabs-list {
          display: flex;
          height: 100%;
          flex: 1;
          overflow: hidden;
        }

        .sidebar-tab-btn {
          flex: 1;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-size: 11.5px;
          font-weight: 400;
          color: #71717a;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          transition: all 0.12s ease;
          white-space: nowrap;
          padding: 0 4px;
        }

        .sidebar-tab-btn:hover {
          color: #d4d4d8;
          background: rgba(255, 255, 255, 0.02);
        }

        .sidebar-tab-btn.active {
          color: #ffffff;
          font-weight: 500;
          border-bottom-color: #ffffff;
          background: #090a0f;
        }

        .tab-pill-count {
          font-size: 9px;
          color: #71717a;
          background: rgba(255, 255, 255, 0.04);
          padding: 1px 5px;
          border-radius: 3px;
        }

        .sidebar-tab-btn.active .tab-pill-count {
          color: #a1a1aa;
          background: rgba(255, 255, 255, 0.08);
        }

        .tab-pill-unread {
          font-size: 9px;
          font-weight: 500;
          color: #10b981;
          background: rgba(16, 185, 129, 0.12);
          border: 1px solid rgba(16, 185, 129, 0.2);
          padding: 1px 5px;
          border-radius: 3px;
        }

        .btn-collapse-sidebar {
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          border-radius: 4px;
          color: #71717a;
          cursor: pointer;
          transition: all 0.12s ease;
          flex-shrink: 0;
          margin-left: 2px;
        }

        .btn-collapse-sidebar:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
        }

        /* Minimalist Collapsed Right Sidebar View */
        .room-sidebar-collapsed {
          width: 40px;
          min-width: 40px;
          height: 100%;
          background: #090a0f;
          border-left: 1px solid rgba(255, 255, 255, 0.07);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding-top: 10px;
          gap: 6px;
          flex-shrink: 0;
          z-index: 10;
        }

        .collapsed-sidebar-btn {
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 6px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.12s ease;
        }

        .collapsed-sidebar-btn:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.06);
        }

        .collapsed-divider {
          width: 18px;
          height: 1px;
          background: rgba(255, 255, 255, 0.07);
          margin: 2px 0;
        }

        .collapsed-sidebar-tab {
          position: relative;
          background: transparent;
          border: none;
          color: #71717a;
          cursor: pointer;
          padding: 7px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.12s ease;
        }

        .collapsed-sidebar-tab:hover {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.05);
        }

        .collapsed-sidebar-tab.active {
          color: #ffffff;
          background: rgba(255, 255, 255, 0.08);
        }

        .collapsed-unread-dot {
          position: absolute;
          top: 4px;
          right: 4px;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #10b981;
        }

        /* Tab Panel Bodies */
        .tab-panel-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #090a0f;
        }

        /* 1. Chat Panel */
        .chat-panel-body {
          flex: 1;
        }

        .room-chat-stream {
          flex: 1;
          overflow-y: auto;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .empty-chat {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          gap: 6px;
          font-size: 11px;
          color: #71717a;
          text-align: center;
          padding: 24px;
        }

        .empty-chat-title {
          font-size: 13px;
          font-weight: 500;
          color: #ffffff;
        }

        .chat-system-item {
          text-align: center;
          font-size: 10.5px;
          color: #71717a;
          background: rgba(255, 255, 255, 0.025);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 2px 8px;
          border-radius: 4px;
          margin: 4px auto;
        }

        .chat-message-row {
          display: flex;
          gap: 8px;
          max-width: 90%;
        }

        .chat-message-row.self {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .chat-message-row.peer {
          align-self: flex-start;
        }

        .chat-avatar-circle {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 9.5px;
          font-weight: 600;
          color: #ffffff;
          background: #1c1e27;
          border: 1px solid rgba(255, 255, 255, 0.08);
          flex-shrink: 0;
        }

        .chat-bubble {
          background: #0f1118;
          border: 1px solid rgba(255, 255, 255, 0.07);
          padding: 6px 10px;
          border-radius: 6px;
          font-size: 12px;
        }

        .chat-message-row.self .chat-bubble {
          background: #151822;
          border-color: rgba(255, 255, 255, 0.12);
        }

        .chat-bubble-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }

        .chat-author {
          font-size: 10.5px;
          font-weight: 500;
          color: #a1a1aa;
        }

        .chat-time {
          font-size: 9px;
          color: #71717a;
        }

        .chat-body {
          color: #e5e7eb;
          line-height: 1.4;
          word-break: break-word;
        }

        .room-chat-form {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 10px;
          background: #0c0e14;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .room-chat-input {
          flex: 1;
          background: #090a0f;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          padding: 6px 9px;
          font-size: 11.5px;
          color: #ffffff;
          outline: none;
          transition: border-color 0.12s ease;
        }

        .room-chat-input:focus {
          border-color: rgba(255, 255, 255, 0.25);
        }

        .btn-chat-send {
          background: rgba(255, 255, 255, 0.06);
          color: #e5e7eb;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 4px;
          padding: 6px 9px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.12s ease;
        }

        .btn-chat-send:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        .btn-chat-send:not(:disabled):hover {
          background: rgba(255, 255, 255, 0.12);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.18);
        }

        /* 2. Participants Panel */
        .participants-tab-header {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 10px 14px;
          background: #0c0e14;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .participants-header-text {
          font-size: 10.5px;
          font-weight: 500;
          color: #71717a;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .host-tip-text {
          font-size: 10px;
          color: #52525b;
        }

        .participants-list {
          flex: 1;
          padding: 10px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .participant-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 10px;
          border-radius: 6px;
          background: #0c0e14;
          border: 1px solid rgba(255, 255, 255, 0.05);
          transition: all 0.12s ease;
        }

        .participant-card.online {
          border-color: rgba(255, 255, 255, 0.07);
        }

        .participant-card.offline {
          opacity: 0.5;
          background: transparent;
          border-color: rgba(255, 255, 255, 0.03);
        }

        .participant-swatch {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          background: #1c1e27;
          border: 1px solid rgba(255, 255, 255, 0.08);
          font-size: 10px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .participant-details {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .participant-name-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 6px;
        }

        .participant-name {
          font-size: 12px;
          font-weight: 500;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .tag-you {
          font-size: 9px;
          color: #71717a;
          background: rgba(255, 255, 255, 0.05);
          padding: 0 4px;
          border-radius: 2px;
        }

        .role-badge {
          font-size: 9px;
          font-weight: 500;
          padding: 1px 5px;
          border-radius: 3px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          flex-shrink: 0;
        }

        .role-badge.role-host {
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          color: #ffffff;
        }

        .role-badge.role-editor {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.06);
          color: #a1a1aa;
        }

        .role-badge.role-viewer {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.05);
          color: #71717a;
        }

        .role-badge.role-clickable {
          cursor: pointer;
          transition: border-color 0.12s ease;
        }

        .role-badge.role-clickable:hover {
          border-color: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }

        .participant-status-indicator {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .status-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
        }

        .status-dot.online {
          background-color: #10b981;
        }

        .status-dot.offline {
          background-color: #52525b;
        }

        .participant-status-text {
          font-size: 10px;
          color: #71717a;
        }

        .participants-footer {
          padding: 10px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          background: #0c0e14;
        }

        .btn-full-width {
          width: 100%;
          justify-content: center;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #a1a1aa;
          font-size: 11.5px;
          padding: 6px 12px;
          border-radius: 4px;
          transition: all 0.12s ease;
        }

        .btn-full-width:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.15);
        }

        /* Minimalist Activity Feed & Modern Stream */
        .activity-feed {
          flex: 1;
          padding: 12px 14px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .empty-activity {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 100%;
          font-size: 11.5px;
          color: #71717a;
          text-align: center;
          padding: 24px;
        }

        .empty-activity svg {
          color: #52525b;
        }

        .activity-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 11.5px;
          padding: 8px 10px;
          border-radius: 6px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.04);
          transition: background-color 0.12s ease, border-color 0.12s ease;
        }

        .activity-item:hover {
          background-color: rgba(255, 255, 255, 0.02);
          border-color: rgba(255, 255, 255, 0.08);
        }

        .act-icon-wrap {
          width: 20px;
          height: 20px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          margin-top: 1px;
          color: #71717a;
          background: #111318;
          border: 1px solid rgba(255, 255, 255, 0.06);
          transition: all 0.12s ease;
        }

        .activity-item:hover .act-icon-wrap {
          color: #e4e4e7;
          border-color: rgba(255, 255, 255, 0.14);
          background: #161820;
        }

        .act-icon-wrap.act-join {
          color: #10b981;
          border-color: rgba(16, 185, 129, 0.18);
          background: rgba(16, 185, 129, 0.05);
        }

        .act-icon-wrap.act-leave {
          color: #71717a;
        }

        /* Minimalist File & Folder Activity Badges */
        .act-icon-wrap.act-folder_create,
        .act-icon-wrap.act-file_create {
          color: #a1a1aa;
          background: #111318;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .activity-item:hover .act-icon-wrap.act-folder_create,
        .activity-item:hover .act-icon-wrap.act-file_create {
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.18);
        }

        .act-icon-wrap.act-folder_rename,
        .act-icon-wrap.act-file_rename {
          color: #a1a1aa;
          background: #111318;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .activity-item:hover .act-icon-wrap.act-folder_rename,
        .activity-item:hover .act-icon-wrap.act-file_rename {
          color: #d4d4d8;
          border-color: rgba(255, 255, 255, 0.16);
        }

        .act-icon-wrap.act-folder_delete,
        .act-icon-wrap.act-file_delete {
          color: #71717a;
          background: #111318;
          border-color: rgba(255, 255, 255, 0.06);
        }

        .activity-item:hover .act-icon-wrap.act-folder_delete,
        .activity-item:hover .act-icon-wrap.act-file_delete {
          color: #f87171;
          background: rgba(239, 68, 68, 0.06);
          border-color: rgba(239, 68, 68, 0.2);
        }

        .act-icon-wrap.act-item_move {
          color: #a1a1aa;
          background: #111318;
          border-color: rgba(255, 255, 255, 0.08);
        }

        .activity-item:hover .act-icon-wrap.act-item_move {
          color: #ffffff;
          border-color: rgba(255, 255, 255, 0.18);
        }

        .act-icon-wrap.act-language,
        .act-icon-wrap.act-execution,
        .act-icon-wrap.act-save,
        .act-icon-wrap.act-info,
        .act-icon-wrap.act-system {
          color: #8e95a5;
        }

        .act-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          overflow: hidden;
        }

        .act-text {
          color: #d4d4d8;
          word-break: break-word;
          line-height: 1.4;
          letter-spacing: -0.01em;
        }

        .act-time {
          font-size: 9.5px;
          color: #52525b;
          letter-spacing: 0.02em;
        }

        /* Minimalist Hairline Scrollbar (Firefox + WebKit) */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.1) transparent;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 9999px;
          transition: background-color 0.15s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        /* Modern Loading Screen */
        .room-loading-screen-modern {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background-color: #f9fafb;
          color: #111827;
        }

        .loading-container-modern {
          margin: auto;
          padding: 48px 64px;
          background-color: #ffffff;
          border: 1px solid #e5e7eb;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
          border-radius: 12px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .pulse-ring {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 3px solid #f3f4f6;
          border-top-color: #64748b;
          animation: spin-pulse 1s linear infinite;
        }

        @keyframes spin-pulse {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .loading-title {
          margin: 0;
          font-size: 1.125rem;
          font-weight: 500;
          color: #1f2937;
          letter-spacing: -0.01em;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .loading-subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        }

        @media (max-width: 900px) {
          .room-title-text {
            display: none;
          }
          .zone-presence {
            display: none;
          }
          .room-sidebar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};
