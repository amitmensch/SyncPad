import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = 'http://127.0.0.1:5000/api';
const SOCKET_URL = 'http://127.0.0.1:5000';

const runDragAndDropMoveTests = async () => {
  console.log('===============================================================');
  console.log('TESTING DRAG-AND-DROP FILE & FOLDER MOVE ARCHITECTURE');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  try {
    // Setup: Register User and Create Room
    console.log('\n--- SETUP: Register User & Create Room ---');
    const userRes = await axios.post(`${API_BASE}/auth/register`, {
      username: `dnd_dev_${Date.now()}`,
      email: `dnd_dev_${Date.now()}@test.com`,
      password: 'Password123!',
    });
    const token = userRes.data.token;
    const user = userRes.data.user;

    const requestedRoomId = `dnd-room-${Date.now()}`;
    const roomRes = await axios.post(
      `${API_BASE}/rooms`,
      {
        customRoomId: requestedRoomId,
        title: 'Drag and Drop Test Room',
        language: 'javascript',
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const createdRoom = roomRes.data.room;
    const roomId = createdRoom?.roomId || requestedRoomId;

    // Connect Sockets (Socket 1: Host, Socket 2: Peer Editor, Socket 3: Viewer)
    const socket1 = io(SOCKET_URL, { forceNew: true, transports: ['websocket'] });
    const socket2 = io(SOCKET_URL, { forceNew: true, transports: ['websocket'] });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout socket1')), 5000);
      const doJoin = () => {
        socket1.emit('room:join', {
          roomId,
          user: { id: user.id || user._id, name: user.username, role: 'host' },
        });
      };
      if (socket1.connected) doJoin();
      else socket1.on('connect', doJoin);
      socket1.on('room:init', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout socket2')), 5000);
      const doJoin = () => {
        socket2.emit('room:join', {
          roomId,
          user: { id: `peer_${Date.now()}`, name: 'Bob Peer', role: 'editor' },
        });
      };
      if (socket2.connected) doJoin();
      else socket2.on('connect', doJoin);
      socket2.on('room:init', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    // Create Initial Folders: /src and /app
    const folderSrc = {
      id: `folder-src-${Date.now()}`,
      name: 'src',
      path: '/src',
      type: 'directory',
    };
    const folderApp = {
      id: `folder-app-${Date.now()}`,
      name: 'app',
      path: '/app',
      type: 'directory',
    };
    socket1.emit('folder:create', { roomId, folder: folderSrc });
    socket1.emit('folder:create', { roomId, folder: folderApp });
    await new Promise((r) => setTimeout(r, 200));

    // Create File /src/calc.js
    const fileCalc = {
      id: `file-calc-${Date.now()}`,
      name: 'calc.js',
      path: '/src/calc.js',
      parentId: '/src',
      type: 'file',
      language: 'javascript',
      content: 'module.exports = { multiply: (a, b) => a * b };',
    };
    socket1.emit('file:create', { roomId, file: fileCalc });
    await new Promise((r) => setTimeout(r, 200));

    console.log('✅ SETUP COMPLETE: Sockets connected, base folders and files created.');

    // TEST 1: File Move into Directory (e.g. /src/calc.js -> /app)
    console.log('\n--- TEST 1: Move File into Directory (/src/calc.js -> /app) ---');
    const movePromise1 = new Promise((resolve) => {
      socket2.once('item:moved', (data) => resolve(data));
    });

    socket1.emit('item:move', {
      roomId,
      itemId: fileCalc.id,
      targetFolderPath: '/app',
    });

    const moveRes1 = await movePromise1;
    if (moveRes1.itemId === fileCalc.id && moveRes1.newPath === '/app/calc.js') {
      console.log(`✅ TEST 1 PASSED: File moved into folder. New Path: ${moveRes1.newPath}`);
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED: Unexpected move result:', moveRes1);
      failed++;
    }

    // TEST 2: File Move out to Root (/app/calc.js -> /)
    console.log('\n--- TEST 2: Move File to Workspace Root (/app/calc.js -> /) ---');
    const movePromise2 = new Promise((resolve) => {
      socket2.once('item:moved', (data) => resolve(data));
    });

    socket1.emit('item:move', {
      roomId,
      itemId: fileCalc.id,
      targetFolderPath: '/',
    });

    const moveRes2 = await movePromise2;
    if (moveRes2.itemId === fileCalc.id && moveRes2.newPath === '/calc.js') {
      console.log(`✅ TEST 2 PASSED: File moved to workspace root. New Path: ${moveRes2.newPath}`);
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED: Move to root failed:', moveRes2);
      failed++;
    }

    // TEST 3: Nested Folder Move with Cascading Descendants
    console.log('\n--- TEST 3: Folder Move with Subtree Descendant Cascades ---');
    // Create /src/utils and /src/utils/math.js and /src/utils/deep/test.js
    const folderUtils = {
      id: `folder-utils-${Date.now()}`,
      name: 'utils',
      path: '/src/utils',
      type: 'directory',
    };
    const fileMath = {
      id: `file-math-${Date.now()}`,
      name: 'math.js',
      path: '/src/utils/math.js',
      parentId: '/src/utils',
      type: 'file',
      language: 'javascript',
      content: 'module.exports = { add: (a, b) => a + b };',
    };
    const fileDeep = {
      id: `file-deep-${Date.now()}`,
      name: 'test.js',
      path: '/src/utils/deep/test.js',
      parentId: '/src/utils/deep',
      type: 'file',
      language: 'javascript',
      content: 'console.log("Deep test active");',
    };

    socket1.emit('folder:create', { roomId, folder: folderUtils });
    socket1.emit('file:create', { roomId, file: fileMath });
    socket1.emit('file:create', { roomId, file: fileDeep });
    await new Promise((r) => setTimeout(r, 200));

    // Move folder /src/utils into /app
    const moveFolderPromise = new Promise((resolve) => {
      socket2.once('item:moved', (data) => resolve(data));
    });

    socket1.emit('item:move', {
      roomId,
      itemId: folderUtils.id,
      targetFolderPath: '/app',
    });

    const moveFolderRes = await moveFolderPromise;
    const updatedChildren = moveFolderRes.updatedChildren || [];
    const hasUpdatedMath = updatedChildren.some((c) => c.path === '/app/utils/math.js');
    const hasUpdatedDeep = updatedChildren.some((c) => c.path === '/app/utils/deep/test.js');

    if (moveFolderRes.newPath === '/app/utils' && hasUpdatedMath && hasUpdatedDeep) {
      console.log(`✅ TEST 3 PASSED: Folder moved to /app/utils with all ${updatedChildren.length} child paths cascaded.`);
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED: Subtree cascade failed:', moveFolderRes);
      failed++;
    }

    // TEST 4: Circular Dependency Prevention (Moving ancestor into descendant)
    console.log('\n--- TEST 4: Circular Dependency Rejection (Move /app into /app/utils) ---');
    const errorPromise4 = new Promise((resolve) => {
      socket1.once('file:error', (data) => resolve(data));
    });

    socket1.emit('item:move', {
      roomId,
      itemId: folderApp.id,
      targetFolderPath: '/app/utils',
    });

    const errorRes4 = await errorPromise4;
    if (errorRes4.message && errorRes4.message.toLowerCase().includes('circular')) {
      console.log(`✅ TEST 4 PASSED: Circular move blocked with error: "${errorRes4.message}"`);
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED: Expected circular dependency rejection, got:', errorRes4);
      failed++;
    }

    // TEST 5: Self-Move Rejection
    console.log('\n--- TEST 5: Self-Move Rejection (Move /app into /app) ---');
    const errorPromise5 = new Promise((resolve) => {
      socket1.once('file:error', (data) => resolve(data));
    });

    socket1.emit('item:move', {
      roomId,
      itemId: folderApp.id,
      targetFolderPath: '/app',
    });

    const errorRes5 = await errorPromise5;
    if (errorRes5.message && errorRes5.message.toLowerCase().includes('itself')) {
      console.log(`✅ TEST 5 PASSED: Self-move blocked with error: "${errorRes5.message}"`);
      passed++;
    } else {
      console.error('❌ TEST 5 FAILED: Expected self-move rejection, got:', errorRes5);
      failed++;
    }

    // TEST 6: Viewer Permission Enforcement
    console.log('\n--- TEST 6: Viewer Role Read-Only Enforcement ---');
    const socket3 = io(SOCKET_URL, { forceNew: true, transports: ['websocket'] });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout socket3')), 5000);
      const doJoin = () => {
        socket3.emit('room:join', {
          roomId,
          user: { id: `viewer_${Date.now()}`, name: 'Charlie Viewer', role: 'viewer' },
        });
      };
      if (socket3.connected) doJoin();
      else socket3.on('connect', doJoin);
      socket3.on('room:init', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    const errorPromise6 = new Promise((resolve) => {
      socket3.once('file:error', (data) => resolve(data));
    });

    socket3.emit('item:move', {
      roomId,
      itemId: fileCalc.id,
      targetFolderPath: '/src',
    });

    const errorRes6 = await errorPromise6;
    if (errorRes6.message && errorRes6.message.toLowerCase().includes('read-only')) {
      console.log(`✅ TEST 6 PASSED: Viewer move blocked with error: "${errorRes6.message}"`);
      passed++;
    } else {
      console.error('❌ TEST 6 FAILED: Viewer should have been blocked, got:', errorRes6);
      failed++;
    }

    // TEST 7: Sandboxed Execution After Moves
    console.log('\n--- TEST 7: Sandboxed Runner with Modules in Moved Directories ---');
    const entryFile = {
      id: `file-entry-${Date.now()}`,
      name: 'index.js',
      path: '/index.js',
      type: 'file',
      language: 'javascript',
      content: `const { multiply } = require('./calc');
const { add } = require('./app/utils/math');
console.log('Post-Move Calculation:', multiply(4, 5), add(20, 22));`,
      isEntrypoint: true,
    };

    const execRes = await axios.post(`${API_BASE}/execute`, {
      language: 'javascript',
      code: entryFile.content,
      files: [
        { ...fileCalc, path: '/calc.js' },
        { ...fileMath, path: '/app/utils/math.js' },
        entryFile,
      ],
      entrypoint: 'index.js',
    });

    const execOutput = execRes.data?.stdout || '';
    if (execRes.data?.success && execOutput.includes('Post-Move Calculation: 20 42')) {
      console.log(`✅ TEST 7 PASSED: Execution resolved moved modules correctly! Output: ${execOutput.trim()}`);
      passed++;
    } else {
      console.error('❌ TEST 7 FAILED: Execution failed:', execRes.data);
      failed++;
    }

    // TEST 8: Database Persistence Verification
    console.log('\n--- TEST 8: MongoDB Persistence Verification ---');
    await new Promise((r) => setTimeout(r, 1500)); // Allow scheduled save

    const finalRoomRes = await axios.get(`${API_BASE}/rooms/${roomId}`);
    const persistedFiles = finalRoomRes.data.room?.files || [];

    const persistedCalc = persistedFiles.find((f) => f.id === fileCalc.id);
    const persistedMath = persistedFiles.find((f) => f.id === fileMath.id);
    const persistedUtils = persistedFiles.find((f) => f.id === folderUtils.id);

    if (
      persistedCalc?.path === '/calc.js' &&
      persistedMath?.path === '/app/utils/math.js' &&
      persistedUtils?.path === '/app/utils'
    ) {
      console.log('✅ TEST 8 PASSED: MongoDB verified! All moved items persisted with updated canonical paths.');
      passed++;
    } else {
      console.error('❌ TEST 8 FAILED: DB paths not matching expected:', {
        calc: persistedCalc?.path,
        math: persistedMath?.path,
        utils: persistedUtils?.path,
      });
      failed++;
    }

    socket1.disconnect();
    socket2.disconnect();
    socket3.disconnect();

    console.log('\n===============================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('===============================================================');

    if (failed > 0) process.exit(1);
    process.exit(0);
  } catch (err) {
    console.error('❌ FATAL TEST ERROR:', err.message);
    if (err.response) console.error('Response data:', err.response.data);
    process.exit(1);
  }
};

runDragAndDropMoveTests();
