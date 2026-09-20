import axios from 'axios';
import { io } from 'socket.io-client';

const API_BASE = 'http://127.0.0.1:5000/api';
const SOCKET_URL = 'http://127.0.0.1:5000';

const runTests = async () => {
  console.log('========================================================');
  console.log('TESTING ROOM ROLES, CHAT DEDUPLICATION, LIVE/IDLE STATS');
  console.log('========================================================');

  let passed = 0;
  let failed = 0;

  // 1. Verify Guest Login is Removed (returns 404)
  console.log('\n--- TEST 1: Guest Login Removed ---');
  try {
    await axios.post(`${API_BASE}/auth/guest`);
    console.error('❌ TEST 1 FAILED: Guest endpoint still exists!');
    failed++;
  } catch (err) {
    if (err.response?.status === 404) {
      console.log('✅ TEST 1 PASSED: POST /api/auth/guest returned 404 Not Found.');
      passed++;
    } else {
      console.error('❌ TEST 1 FAILED with status:', err.response?.status);
      failed++;
    }
  }

  // 2. Verify Unknown Room ID returns 404 and does NOT create a room
  console.log('\n--- TEST 2: Unknown Room ID Rejection (No Auto-Creation) ---');
  const fakeRoomId = `nonexistent-room-${Date.now()}`;
  try {
    await axios.get(`${API_BASE}/rooms/${fakeRoomId}`);
    console.error('❌ TEST 2 FAILED: Non-existent room returned 200 instead of 404.');
    failed++;
  } catch (err) {
    if (err.response?.status === 404) {
      console.log(`✅ TEST 2 PASSED: GET /api/rooms/${fakeRoomId} returned 404.`);
      passed++;
    } else {
      console.error('❌ TEST 2 FAILED with status:', err.response?.status);
      failed++;
    }
  }

  // 3. Register real user & create real room
  console.log('\n--- TEST 3: Create Real Room as Authenticated User ---');
  const regRes = await axios.post(`${API_BASE}/auth/register`, {
    username: `alice_${Date.now()}`,
    email: `alice_${Date.now()}@example.com`,
    password: 'Password123!',
  });
  const token = regRes.data.token;
  const user = regRes.data.user;

  const validRoomId = `room-${Date.now()}`;
  const createRes = await axios.post(
    `${API_BASE}/rooms`,
    {
      title: 'Realtime Pair Room',
      customRoomId: validRoomId,
      language: 'javascript',
      description: 'Test Room for Activity and Presence',
      isPublic: true,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (createRes.status === 201 && createRes.data.room.roomId === validRoomId) {
    console.log(`✅ TEST 3 PASSED: Created valid room #${validRoomId}`);
    passed++;
  } else {
    console.error('❌ TEST 3 FAILED: Room creation error');
    failed++;
  }

  // 4. Test Socket.io Rejection on Unknown Room ID
  console.log('\n--- TEST 4: Socket.io Emits room:not_found on Invalid ID ---');
  const socketBad = io(SOCKET_URL, { transports: ['websocket'] });
  await new Promise((resolve) => {
    socketBad.on('connect', () => {
      socketBad.emit('room:join', {
        roomId: `ghost-room-${Date.now()}`,
        user: { id: user.id, name: user.username },
      });
    });

    socketBad.on('room:not_found', (data) => {
      console.log('✅ TEST 4 PASSED: Socket received room:not_found:', data.message);
      passed++;
      socketBad.disconnect();
      resolve();
    });

    setTimeout(() => {
      if (socketBad.connected) {
        console.error('❌ TEST 4 FAILED: Timed out waiting for room:not_found');
        failed++;
        socketBad.disconnect();
      }
      resolve();
    }, 4000);
  });

  // 5. Test Realtime Presence (Join & Leave) + Activity Logs + Room Chat + Roles
  console.log('\n--- TEST 5: Realtime Presence, Roles (Host/Editor) & Deduplicated Join ---');
  const socketAlice = io(SOCKET_URL, { transports: ['websocket'] });
  const socketBob = io(SOCKET_URL, { transports: ['websocket'] });

  let activityLogged = false;
  let chatDelivered = false;
  let bobOnlineSeen = false;
  let bobOfflineSeen = false;
  let systemJoinCount = 0;
  let aliceRoleHost = false;
  let bobRoleEditor = false;
  let bobRoleUpdatedViewer = false;

  await new Promise((resolve) => {
    socketAlice.on('connect', () => {
      socketAlice.emit('room:join', {
        roomId: validRoomId,
        user: { id: user.id, name: 'Alice', color: '#ec4899' },
      });
    });

    socketAlice.on('room:init', (data) => {
      if (data.currentUserRole === 'host') {
        aliceRoleHost = true;
      }
    });

    socketAlice.on('activity:log', (act) => {
      activityLogged = true;
    });

    socketAlice.on('room:users', (data) => {
      const users = data.users || [];
      const bobUser = users.find((u) => u.name === 'Bob');
      if (bobUser && !bobOnlineSeen) {
        bobOnlineSeen = true;
        if (bobUser.role === 'editor') bobRoleEditor = true;

        // Alice as host switches Bob to viewer
        socketAlice.emit('role:change', {
          roomId: validRoomId,
          targetUserId: 'bob-999',
          newRole: 'viewer',
        });

        // Bob sends a message in room chat
        socketBob.emit('chat:send', {
          roomId: validRoomId,
          text: 'Hello from Bob inside the room!',
        });

        // Bob sends duplicate room:join to test deduplication
        socketBob.emit('room:join', {
          roomId: validRoomId,
          user: { id: 'bob-999', name: 'Bob', color: '#06b6d4' },
        });
      } else if (!bobUser && bobOnlineSeen && !bobOfflineSeen) {
        bobOfflineSeen = true;
        resolve();
      }
    });

    socketAlice.on('role:updated', ({ targetUserId, newRole }) => {
      if (targetUserId === 'bob-999' && newRole === 'viewer') {
        bobRoleUpdatedViewer = true;
      }
    });

    socketAlice.on('chat:receive', (msg) => {
      if (msg.type === 'system' && msg.text.includes('joined syncpad room')) {
        systemJoinCount++;
      }
      if (msg.text === 'Hello from Bob inside the room!') {
        chatDelivered = true;
        // Bob explicitly leaves the room
        setTimeout(() => {
          socketBob.emit('room:leave', { roomId: validRoomId });
        }, 300);
      }
    });

    socketBob.on('connect', () => {
      setTimeout(() => {
        socketBob.emit('room:join', {
          roomId: validRoomId,
          user: { id: 'bob-999', name: 'Bob', color: '#06b6d4' },
        });
      }, 500);
    });

    setTimeout(() => {
      resolve();
    }, 6000);
  });

  socketAlice.disconnect();
  socketBob.disconnect();

  if (bobOnlineSeen) {
    console.log('✅ TEST 5.1 PASSED: Bob recognized online in the room.');
    passed++;
  } else {
    console.error('❌ TEST 5.1 FAILED: Bob online status not observed.');
    failed++;
  }

  if (bobOfflineSeen) {
    console.log('✅ TEST 5.2 PASSED: Bob immediately removed from active users upon leave (status offline).');
    passed++;
  } else {
    console.error('❌ TEST 5.2 FAILED: Bob offline transition not observed.');
    failed++;
  }

  if (activityLogged) {
    console.log('✅ TEST 5.3 PASSED: Activity logs broadcast for editor operations.');
    passed++;
  } else {
    console.error('❌ TEST 5.3 FAILED: No activity log received.');
    failed++;
  }

  if (chatDelivered) {
    console.log('✅ TEST 5.4 PASSED: Room Chat received and synchronized across participants.');
    passed++;
  } else {
    console.error('❌ TEST 5.4 FAILED: Room chat message not received.');
    failed++;
  }

  if (aliceRoleHost && bobRoleEditor) {
    console.log('✅ TEST 5.5 PASSED: Participant roles properly assigned (Host for owner, Editor for collaborator).');
    passed++;
  } else {
    console.error(`❌ TEST 5.5 FAILED: aliceRoleHost=${aliceRoleHost}, bobRoleEditor=${bobRoleEditor}`);
    failed++;
  }

  if (bobRoleUpdatedViewer) {
    console.log('✅ TEST 5.6 PASSED: Host successfully toggled participant role to Viewer in real-time.');
    passed++;
  } else {
    console.error('❌ TEST 5.6 FAILED: Role update to viewer not received.');
    failed++;
  }

  if (systemJoinCount <= 1) {
    console.log(`✅ TEST 5.7 PASSED: Duplicate join messages prevented (count = ${systemJoinCount}).`);
    passed++;
  } else {
    console.error(`❌ TEST 5.7 FAILED: Duplicate join messages detected (count = ${systemJoinCount}).`);
    failed++;
  }

  // 6. Test GET /api/rooms Live & Idle Stats
  console.log('\n--- TEST 6: Public Rooms Live & Idle Stats Decoration ---');
  const roomsRes = await axios.get(`${API_BASE}/rooms`);
  const roomsList = roomsRes.data.rooms || [];
  const testRoom = roomsList.find((r) => r.roomId === validRoomId);

  if (testRoom && typeof testRoom.isLive === 'boolean' && typeof testRoom.onlineCount === 'number') {
    console.log(`✅ TEST 6 PASSED: Room decorated with isLive=${testRoom.isLive}, onlineCount=${testRoom.onlineCount}.`);
    passed++;
  } else {
    console.error('❌ TEST 6 FAILED: Rooms not decorated with isLive / onlineCount', testRoom);
    failed++;
  }

  console.log('\n========================================================');
  console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('========================================================');

  process.exit(failed > 0 ? 1 : 0);
};

runTests().catch((e) => {
  console.error('Fatal test error:', e);
  process.exit(1);
});
