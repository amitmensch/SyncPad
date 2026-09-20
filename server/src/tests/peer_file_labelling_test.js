import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = 'http://127.0.0.1:5000/api';
const SOCKET_URL = 'http://127.0.0.1:5000';

const runPeerLabellingTest = async () => {
  console.log('========================================================');
  console.log('TESTING PEER FILE LABELLING & REAL-TIME FOCUS SYNC');
  console.log('========================================================');

  let passed = 0;
  let failed = 0;

  try {
    // 1. Create User A & User B
    const userARes = await axios.post(`${API_BASE}/auth/register`, {
      username: `alice_${Date.now()}`,
      email: `alice_${Date.now()}@test.com`,
      password: 'Password123!',
    });
    const tokenA = userARes.data.token;
    const userA = userARes.data.user;

    const userBRes = await axios.post(`${API_BASE}/auth/register`, {
      username: `bob_${Date.now()}`,
      email: `bob_${Date.now()}@test.com`,
      password: 'Password123!',
    });
    const tokenB = userBRes.data.token;
    const userB = userBRes.data.user;

    // 2. Create Room with JavaScript
    const roomRes = await axios.post(
      `${API_BASE}/rooms`,
      {
        title: 'Peer Labelling Workspace',
        language: 'javascript',
      },
      { headers: { Authorization: `Bearer ${tokenA}` } }
    );
    const room = roomRes.data.room;
    const roomId = room.roomId;
    const files = room.files;
    const file1 = files[0]; // index.js

    // 3. Socket A connects and joins with initial activeFileId = file1.id
    const socketA = io(SOCKET_URL, { forceNew: true, transports: ['websocket'] });
    await new Promise((resolve) => {
      socketA.on('connect', () => {
        socketA.emit('room:join', {
          roomId,
          user: {
            id: userA.id || userA._id,
            name: userA.username,
            avatar: userA.avatar,
            color: '#3b82f6',
            role: 'host',
            activeFileId: file1.id,
          },
        });
      });
      socketA.on('room:init', () => resolve());
    });

    const file2 = {
      id: `file-utils-${Date.now()}`,
      name: 'utils.js',
      path: '/utils.js',
      language: 'javascript',
      content: '// utils module\n',
      isEntrypoint: false,
    };
    const file3 = {
      id: `file-helpers-${Date.now() + 1}`,
      name: 'helpers.js',
      path: '/helpers.js',
      language: 'javascript',
      content: '// helpers module\n',
      isEntrypoint: false,
    };

    await new Promise((resolve) => {
      socketA.on('file:created', (data) => {
        if (data.file.id === file2.id) resolve();
      });
      socketA.emit('file:create', { roomId, file: file2 });
    });

    await new Promise((resolve) => {
      socketA.on('file:created', (data) => {
        if (data.file.id === file3.id) resolve();
      });
      socketA.emit('file:create', { roomId, file: file3 });
    });

    console.log(`\n--- Room #${roomId} initialized with files: ${file1.name}, ${file2.name}, ${file3.name} ---`);
    console.log(`✅ Alice joined room on file: ${file1.name} (${file1.id})`);
    passed++;

    // 4. Socket B connects and joins on file2.id (utils.js)
    const socketB = io(SOCKET_URL, { forceNew: true, transports: ['websocket'] });
    let aliceNotifiedOfBob = null;
    socketA.on('peer:focus', (data) => {
      aliceNotifiedOfBob = data;
    });

    const bobInit = await new Promise((resolve) => {
      socketB.on('connect', () => {
        socketB.emit('room:join', {
          roomId,
          user: {
            id: userB.id || userB._id,
            name: userB.username,
            avatar: userB.avatar,
            color: '#10b981',
            role: 'editor',
            activeFileId: file2.id,
          },
        });
      });
      socketB.on('room:init', (data) => resolve(data));
    });

    // Check that Bob's room:init snapshot contains Alice with activeFileId = file1.id
    const aliceInBobSnapshot = bobInit.users.find(
      (u) => (u.id && (u.id === userA.id || u.id === userA._id)) || u.name === userA.username
    );
    if (aliceInBobSnapshot && aliceInBobSnapshot.activeFileId === file1.id) {
      console.log(`✅ TEST: Bob's room snapshot correctly has Alice working on ${file1.name}`);
      passed++;
    } else {
      console.error('❌ TEST FAILED: Alice activeFileId not found in Bob snapshot:', aliceInBobSnapshot);
      failed++;
    }

    // 5. Bob switches to file3 (helpers.js) -> emits peer:focus
    const bobFocusPromise = new Promise((resolve) => {
      socketA.on('peer:focus', (data) => {
        if (data.fileId === file3.id) resolve(data);
      });
    });

    socketB.emit('peer:focus', {
      roomId,
      fileId: file3.id,
    });

    const receivedFocus = await bobFocusPromise;
    if (receivedFocus && receivedFocus.fileId === file3.id) {
      console.log(`✅ TEST: Alice received real-time peer:focus that Bob moved to ${file3.name} (${file3.id})`);
      passed++;
    } else {
      console.error('❌ TEST FAILED: Bob focus event not received properly:', receivedFocus);
      failed++;
    }

    // 6. Alice switches to file2 (utils.js) -> emits peer:focus
    const aliceFocusPromise = new Promise((resolve) => {
      socketB.on('peer:focus', (data) => {
        if (data.fileId === file2.id) resolve(data);
      });
    });

    socketA.emit('peer:focus', {
      roomId,
      fileId: file2.id,
    });

    const receivedAliceFocus = await aliceFocusPromise;
    if (receivedAliceFocus && receivedAliceFocus.fileId === file2.id) {
      console.log(`✅ TEST: Bob received real-time peer:focus that Alice moved to ${file2.name} (${file2.id})`);
      passed++;
    } else {
      console.error('❌ TEST FAILED: Alice focus event not received properly:', receivedAliceFocus);
      failed++;
    }

    socketA.disconnect();
    socketB.disconnect();

    console.log('\n========================================================');
    console.log(`PEER LABELLING TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
};

runPeerLabellingTest();
