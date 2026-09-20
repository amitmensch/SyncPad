import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = 'http://127.0.0.1:5000/api';
const SOCKET_URL = 'http://127.0.0.1:5000';

const runMultiFileTests = async () => {
  console.log('========================================================');
  console.log('TESTING MULTI-FILE WORKSPACE & REAL-TIME SOCKET PROTOCOL');
  console.log('========================================================');

  let passed = 0;
  let failed = 0;

  try {
    // 1. Register User and Create Room
    console.log('\n--- TEST 1: Room Creation with Auto-Populated Default File ---');
    const userRes = await axios.post(`${API_BASE}/auth/register`, {
      username: `dev_${Date.now()}`,
      email: `dev_${Date.now()}@test.com`,
      password: 'Password123!',
    });
    const token = userRes.data.token;
    const user = userRes.data.user;

    const requestedRoomId = `mf-room-${Date.now()}`;
    const roomRes = await axios.post(
      `${API_BASE}/rooms`,
      {
        customRoomId: requestedRoomId,
        title: 'Multi-File Test Workspace',
        language: 'javascript',
      },
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const createdRoom = roomRes.data.room;
    const roomId = createdRoom?.roomId || requestedRoomId;

    if (createdRoom && Array.isArray(createdRoom.files) && createdRoom.files.length > 0) {
      console.log(`✅ TEST 1 PASSED: Room #${roomId} created with default file (count: ${createdRoom.files.length}, name: ${createdRoom.files[0].name}, entrypoint: ${createdRoom.files[0].isEntrypoint})`);
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED: Room files array was not populated.');
      failed++;
    }

    // 2. Socket Room Init with Files
    console.log('\n--- TEST 2: Socket room:init Snapshot Verification ---');
    const socket1 = io(SOCKET_URL, { forceNew: true, transports: ['websocket'] });

    const initData = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for room:init')), 5000);
      socket1.on('connect', () => {
        socket1.emit('room:join', {
          roomId,
          user: { id: user.id || user._id, name: user.username, role: 'host' },
        });
      });
      socket1.on('room:init', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    if (initData && Array.isArray(initData.files) && initData.files.length > 0 && initData.activeFileId) {
      console.log(`✅ TEST 2 PASSED: socket1 received room:init with ${initData.files.length} file(s) and activeFileId: ${initData.activeFileId}`);
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED: room:init missing files or activeFileId:', initData);
      failed++;
    }

    // 3. Connect Socket 2 (Peer) and Create New File
    console.log('\n--- TEST 3: Multi-File Creation (file:create -> file:created) ---');
    const socket2 = io(SOCKET_URL, { forceNew: true, transports: ['websocket'] });

    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for peer join')), 5000);
      socket2.on('connect', () => {
        socket2.emit('room:join', {
          roomId,
          user: { id: `peer-${Date.now()}`, name: 'Bob Peer', role: 'editor' },
        });
      });
      socket2.on('room:init', () => {
        clearTimeout(timer);
        resolve();
      });
    });

    const newHelperFile = {
      id: `file-calc-${Date.now()}`,
      name: 'calc.js',
      path: '/calc.js',
      language: 'javascript',
      content: 'module.exports = { add: (a, b) => a + b };',
      isEntrypoint: false,
    };

    const peerCreatedPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for file:created')), 5000);
      socket2.on('file:created', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    socket1.emit('file:create', { roomId, file: newHelperFile });
    const fileCreatedEvent = await peerCreatedPromise;

    if (fileCreatedEvent && fileCreatedEvent.file && fileCreatedEvent.file.name === 'calc.js') {
      console.log('✅ TEST 3 PASSED: Peer socket2 received file:created for "calc.js"');
      passed++;
    } else {
      console.error('❌ TEST 3 FAILED: Peer socket2 did not receive file:created properly:', fileCreatedEvent);
      failed++;
    }

    // 4. File Content Synchronization
    console.log('\n--- TEST 4: Cross-File Content Change Synchronization (file:content_change) ---');
    const updatedContent = 'module.exports = { add: (a, b) => a + b, mul: (a, b) => a * b };';
    const peerChangePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for file:content_change')), 5000);
      socket2.on('file:content_change', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    socket1.emit('file:content_change', {
      roomId,
      fileId: newHelperFile.id,
      code: updatedContent,
    });

    const changeEvent = await peerChangePromise;
    if (changeEvent && changeEvent.fileId === newHelperFile.id && changeEvent.code === updatedContent) {
      console.log('✅ TEST 4 PASSED: Peer socket2 received file-scoped content change for calc.js');
      passed++;
    } else {
      console.error('❌ TEST 4 FAILED: file:content_change event mismatch:', changeEvent);
      failed++;
    }

    // 5. Scoped Cursor Tracking
    console.log('\n--- TEST 5: File-Scoped Cursor Tracking ---');
    const peerCursorPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for cursor:move')), 5000);
      socket2.on('cursor:move', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    socket1.emit('cursor:move', {
      roomId,
      fileId: newHelperFile.id,
      position: { lineNumber: 2, column: 15 },
      selection: null,
    });

    const cursorEvent = await peerCursorPromise;
    if (cursorEvent && cursorEvent.fileId === newHelperFile.id && cursorEvent.position?.lineNumber === 2) {
      console.log('✅ TEST 5 PASSED: Peer socket2 received cursor:move scoped to fileId: ' + cursorEvent.fileId);
      passed++;
    } else {
      console.error('❌ TEST 5 FAILED: cursor:move event did not include fileId or position:', cursorEvent);
      failed++;
    }

    // 6. Peer Focus Tracking
    console.log('\n--- TEST 6: Peer Focus Tracking (peer:focus) ---');
    const peerFocusPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for peer:focus')), 5000);
      socket2.on('peer:focus', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    socket1.emit('peer:focus', {
      roomId,
      fileId: newHelperFile.id,
    });

    const focusEvent = await peerFocusPromise;
    if (focusEvent && focusEvent.fileId === newHelperFile.id) {
      console.log('✅ TEST 6 PASSED: Peer socket2 received peer:focus on ' + focusEvent.fileId);
      passed++;
    } else {
      console.error('❌ TEST 6 FAILED: peer:focus not received:', focusEvent);
      failed++;
    }

    // 7. Multi-File Code Execution (Requiring sibling module)
    console.log('\n--- TEST 7: Multi-File Sandboxed Execution with Module Resolution ---');
    const mainFileContent = `
const { add, mul } = require('./calc');
console.log("Addition:", add(10, 20));
console.log("Multiplication:", mul(6, 7));
`;

    const execRes = await axios.post(`${API_BASE}/execute`, {
      language: 'javascript',
      code: mainFileContent,
      files: [
        { name: 'calc.js', content: updatedContent },
        { name: 'index.js', content: mainFileContent, isEntrypoint: true },
      ],
      entrypoint: 'index.js',
    });

    const execResult = execRes.data;
    if (
      execResult.success &&
      execResult.stdout.includes('Addition: 30') &&
      execResult.stdout.includes('Multiplication: 42')
    ) {
      console.log('✅ TEST 7 PASSED: Multi-file project executed successfully with intra-project require()!');
      console.log('Output stdout:\n' + execResult.stdout.trim());
      passed++;
    } else {
      console.error('❌ TEST 7 FAILED: Execution did not produce expected output:', execResult);
      failed++;
    }

    // 8. Set Entrypoint
    console.log('\n--- TEST 8: Entrypoint Switching (entrypoint:set) ---');
    const entrypointPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for entrypoint:set')), 5000);
      socket2.on('entrypoint:set', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    socket1.emit('entrypoint:set', { roomId, fileId: newHelperFile.id });
    const entryEvent = await entrypointPromise;

    if (entryEvent && entryEvent.fileId === newHelperFile.id) {
      console.log('✅ TEST 8 PASSED: entrypoint:set broadcast received for calc.js');
      passed++;
    } else {
      console.error('❌ TEST 8 FAILED: entrypoint:set mismatch:', entryEvent);
      failed++;
    }

    // 9. File Deletion
    console.log('\n--- TEST 9: File Deletion (file:delete -> file:deleted) ---');
    const deletePromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timed out waiting for file:deleted')), 5000);
      socket2.on('file:deleted', (data) => {
        clearTimeout(timer);
        resolve(data);
      });
    });

    socket1.emit('file:delete', { roomId, fileId: newHelperFile.id });
    const deleteEvent = await deletePromise;

    if (deleteEvent && deleteEvent.fileId === newHelperFile.id && deleteEvent.activeFileId) {
      console.log('✅ TEST 9 PASSED: File deleted and next active file selected: ' + deleteEvent.activeFileId);
      passed++;
    } else {
      console.error('❌ TEST 9 FAILED: file:deleted event mismatch:', deleteEvent);
      failed++;
    }

    // Clean up sockets
    socket1.disconnect();
    socket2.disconnect();

    // 10. Database Persistence Check
    console.log('\n--- TEST 10: MongoDB Multi-File Persistence Verification ---');
    await new Promise((r) => setTimeout(r, 2000)); // wait for debounce auto-save

    const freshRoomRes = await axios.get(`${API_BASE}/rooms/${roomId}`);
    const persistedRoom = freshRoomRes.data.room;

    if (persistedRoom && Array.isArray(persistedRoom.files)) {
      console.log(`✅ TEST 10 PASSED: MongoDB persisted room files state (Remaining files: ${persistedRoom.files.length})`);
      passed++;
    } else {
      console.error('❌ TEST 10 FAILED: MongoDB room does not contain files array:', persistedRoom);
      failed++;
    }

  } catch (err) {
    console.error('Unhandled Test Exception:', err.response?.data || err.message);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`MULTI-FILE TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  process.exit(failed > 0 ? 1 : 0);
};

runMultiFileTests();
