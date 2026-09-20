import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = 'http://127.0.0.1:5000/api';
const SOCKET_URL = 'http://127.0.0.1:5000';

const runHierarchicalTreeTests = async () => {
  console.log('===============================================================');
  console.log('TESTING HIERARCHICAL FILE & FOLDER TREE ARCHITECTURE');
  console.log('===============================================================');

  let passed = 0;
  let failed = 0;

  try {
    // 1. Register User & Create Room
    console.log('\n--- TEST 1: User Registration & Room Creation ---');
    const userRes = await axios.post(`${API_BASE}/auth/register`, {
      username: `tree_dev_${Date.now()}`,
      email: `tree_dev_${Date.now()}@test.com`,
      password: 'Password123!',
    });
    const token = userRes.data.token;
    const user = userRes.data.user;

    const requestedRoomId = `tree-room-${Date.now()}`;
    const roomRes = await axios.post(
      `${API_BASE}/rooms`,
      {
        customRoomId: requestedRoomId,
        title: 'Hierarchical Explorer Test Room',
        language: 'javascript',
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const createdRoom = roomRes.data.room;
    const roomId = createdRoom?.roomId || requestedRoomId;

    if (createdRoom && Array.isArray(createdRoom.files) && createdRoom.files.length > 0) {
      console.log(`✅ TEST 1 PASSED: Room #${roomId} created with default file.`);
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED: Room creation failed.');
      failed++;
    }

    // 2. Connect Socket 1 (Alice) & Socket 2 (Bob)
    console.log('\n--- TEST 2: Multi-Client Socket Connection & room:init ---');
    const socket1 = io(SOCKET_URL, { forceNew: true, transports: ['websocket'] });

    const initData1 = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for socket1 init')), 5000);
      const doJoin = () => {
        socket1.emit('room:join', {
          roomId,
          user: { id: user.id || user._id, name: user.username, role: 'host' },
        });
      };
      if (socket1.connected) doJoin();
      else socket1.on('connect', doJoin);

      socket1.on('room:init', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    const socket2 = io(SOCKET_URL, { forceNew: true, transports: ['websocket'] });
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout waiting for socket2 join')), 5000);
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

    if (initData1 && initData1.files && initData1.files.length > 0) {
      console.log(`✅ TEST 2 PASSED: Sockets connected, room:init delivered initial file.`);
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED: Initial files missing in socket snapshot.');
      failed++;
    }

    // 3. Create Hierarchical Folders: /src and /src/utils
    console.log('\n--- TEST 3: Hierarchical Folder Creation (folder:create -> folder:created) ---');
    const folderSrc = {
      id: `folder-src-${Date.now()}`,
      name: 'src',
      path: '/src',
      parentId: null,
      type: 'directory',
    };

    const folderCreatedPromise1 = new Promise((resolve) => {
      socket2.once('folder:created', (data) => resolve(data));
    });
    socket1.emit('folder:create', { roomId, folder: folderSrc });
    const createdRes1 = await folderCreatedPromise1;

    const folderUtils = {
      id: `folder-utils-${Date.now()}`,
      name: 'utils',
      path: '/src/utils',
      parentPath: '/src',
      type: 'directory',
    };

    const folderCreatedPromise2 = new Promise((resolve) => {
      socket2.once('folder:created', (data) => resolve(data));
    });
    socket1.emit('folder:create', { roomId, folder: folderUtils });
    const createdRes2 = await folderCreatedPromise2;

    if (createdRes1?.folder?.path === '/src' && createdRes2?.folder?.path === '/src/utils') {
      console.log('✅ TEST 3 PASSED: Folders /src and /src/utils broadcast successfully.');
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED: Folder creation broadcast mismatch:', createdRes1, createdRes2);
      failed++;
    }

    // 4. Create Nested Files inside Folders: /src/utils/calc.js and /src/app.js
    console.log('\n--- TEST 4: Nested File Creation inside Directories ---');
    const fileCalc = {
      id: `file-calc-${Date.now()}`,
      name: 'calc.js',
      path: '/src/utils/calc.js',
      parentId: '/src/utils',
      language: 'javascript',
      content: 'module.exports = { multiply: (a, b) => a * b, add: (a, b) => a + b };',
      type: 'file',
    };

    const fileCreatedPromise1 = new Promise((resolve) => {
      socket2.once('file:created', (data) => resolve(data));
    });
    socket1.emit('file:create', { roomId, file: fileCalc });
    await fileCreatedPromise1;

    const fileApp = {
      id: `file-app-${Date.now()}`,
      name: 'app.js',
      path: '/src/app.js',
      parentId: '/src',
      language: 'javascript',
      content: `const { multiply, add } = require('./utils/calc');
console.log('Calculation:', multiply(6, 7), add(10, 5));`,
      type: 'file',
      isEntrypoint: true,
    };

    const fileCreatedPromise2 = new Promise((resolve) => {
      socket2.once('file:created', (data) => resolve(data));
    });
    socket1.emit('file:create', { roomId, file: fileApp });
    await fileCreatedPromise2;

    // Set app.js as entrypoint
    socket1.emit('entrypoint:set', { roomId, fileId: fileApp.id });

    console.log('✅ TEST 4 PASSED: Nested files created (/src/utils/calc.js, /src/app.js).');
    passed++;

    // 5. Sandboxed Multi-File Runner with Nested Relative Imports
    console.log('\n--- TEST 5: Sandboxed Multi-Directory Execution (Intra-Project Require) ---');
    const execRes1 = await axios.post(`${API_BASE}/execute`, {
      language: 'javascript',
      code: fileApp.content,
      files: [fileCalc, fileApp],
      entrypoint: 'app.js',
    });

    const output1 = execRes1.data?.stdout || '';
    if (execRes1.data?.success && output1.includes('Calculation: 42 15')) {
      console.log(`✅ TEST 5 PASSED: Execution resolved ./utils/calc correctly. Output: ${output1.trim()}`);
      passed++;
    } else {
      console.error('❌ TEST 5 FAILED: Execution failed or wrong output:', execRes1.data);
      failed++;
    }

    // 6. Test Transitive Relative Imports with ../ parent traversal
    console.log('\n--- TEST 6: Parent Directory Relative Import (../ traversal) ---');
    const fileDeep = {
      id: `file-deep-${Date.now()}`,
      name: 'deepTest.js',
      path: '/src/utils/deep/deepTest.js',
      parentId: '/src/utils/deep',
      language: 'javascript',
      content: `const { multiply } = require('../calc');
console.log('Parent Relative Import Result:', multiply(9, 9));`,
      type: 'file',
      isEntrypoint: true,
    };

    const execRes2 = await axios.post(`${API_BASE}/execute`, {
      language: 'javascript',
      code: fileDeep.content,
      files: [fileCalc, fileApp, fileDeep],
      entrypoint: 'deepTest.js',
    });

    const output2 = execRes2.data?.stdout || '';
    if (execRes2.data?.success && output2.includes('Parent Relative Import Result: 81')) {
      console.log(`✅ TEST 6 PASSED: ../calc resolved across nested directories. Output: ${output2.trim()}`);
      passed++;
    } else {
      console.error('❌ TEST 6 FAILED: Parent import execution failed:', execRes2.data);
      failed++;
    }

    // 7. Test Folder Rename Cascade
    console.log('\n--- TEST 7: Folder Rename Cascade (/src -> /app) ---');
    const folderRenamedPromise = new Promise((resolve) => {
      socket2.once('folder:renamed', (data) => resolve(data));
    });

    socket1.emit('folder:rename', {
      roomId,
      folderId: folderSrc.id,
      oldPath: '/src',
      newPath: '/app',
      newName: 'app',
    });

    const renameRes = await folderRenamedPromise;
    const childrenUpdated = renameRes.updatedChildren || [];
    const hasUpdatedCalc = childrenUpdated.some((c) => c.path.startsWith('/app/utils'));

    if (renameRes.newPath === '/app' && hasUpdatedCalc) {
      console.log(`✅ TEST 7 PASSED: Folder /src renamed to /app, cascaded ${childrenUpdated.length} child paths.`);
      passed++;
    } else {
      console.error('❌ TEST 7 FAILED: Folder rename cascade missing or incomplete:', renameRes);
      failed++;
    }

    // 8. Test Recursive Folder Deletion
    console.log('\n--- TEST 8: Recursive Folder Deletion (/app/utils) ---');
    const folderDeletedPromise = new Promise((resolve) => {
      socket2.once('folder:deleted', (data) => resolve(data));
    });

    socket1.emit('folder:delete', {
      roomId,
      folderId: folderUtils.id,
      folderPath: '/app/utils',
    });

    const deleteRes = await folderDeletedPromise;
    const deletedCount = (deleteRes.deletedIds || []).length;

    if (deletedCount >= 2) {
      console.log(`✅ TEST 8 PASSED: Folder /app/utils recursively deleted (${deletedCount} items removed).`);
      passed++;
    } else {
      console.error('❌ TEST 8 FAILED: Recursive folder delete failed:', deleteRes);
      failed++;
    }

    // 9. Verify DB Persistence after changes
    console.log('\n--- TEST 9: MongoDB Persistence Verification ---');
    // Allow asynchronous scheduled save to commit
    await new Promise((r) => setTimeout(r, 1500));

    const finalRoomRes = await axios.get(`${API_BASE}/rooms/${roomId}`);
    const persistedRoom = finalRoomRes.data.room;

    const remainingFiles = persistedRoom.files || [];
    const hasDeletedCalc = remainingFiles.some((f) => f.path?.includes('/calc.js'));
    const hasRenamedApp = remainingFiles.some((f) => f.path?.startsWith('/app/'));

    if (!hasDeletedCalc && hasRenamedApp) {
      console.log(`✅ TEST 9 PASSED: MongoDB verified! Deleted files gone, renamed files intact (Remaining: ${remainingFiles.length}).`);
      passed++;
    } else {
      console.error('❌ TEST 9 FAILED: DB persistence inconsistency:', remainingFiles);
      failed++;
    }

    socket1.disconnect();
    socket2.disconnect();

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

runHierarchicalTreeTests();
