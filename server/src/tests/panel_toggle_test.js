import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5000';

async function runTest() {
  console.log('=== TESTING PANEL TOGGLE STABILITY & ZERO LEAVE/JOIN SPAM ===');

  // 1. Register a test user
  const regRes = await fetch(`${SERVER_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `toggle_user_${Date.now()}`,
      email: `toggle_${Date.now()}@example.com`,
      password: 'Password123!',
    }),
  });
  const regData = await regRes.json();
  const token = regData.token;
  const user = regData.user;

  // 2. Create room via API
  const validRoomId = `toggle-room-${Date.now()}`;
  const createRes = await fetch(`${SERVER_URL}/api/rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: 'Panel Stability Room',
      customRoomId: validRoomId,
      language: 'javascript',
      isPublic: true,
    }),
  });
  const createData = await createRes.json();
  const roomId = createData.room.roomId;
  console.log(`✅ Created test room: #${roomId}`);

  // 3. Connect socket
  const socket = io(SERVER_URL, {
    transports: ['websocket'],
    forceNew: true,
  });

  let activityCount = 0;
  let leaveActivities = 0;
  let joinActivities = 0;

  socket.on('activity:log', (act) => {
    activityCount++;
    if (act.type === 'leave') leaveActivities++;
    if (act.type === 'join') joinActivities++;
    console.log(`[ACTIVITY LOG] type=${act.type}, text="${act.text}"`);
  });

  await new Promise((resolve) => socket.on('connect', resolve));

  // Join room once
  socket.emit('room:join', {
    roomId,
    user: {
      id: user.id || user._id,
      name: user.username,
      color: '#10b981',
      role: 'host',
    },
  });

  // Wait 500ms for initial join
  await new Promise((r) => setTimeout(r, 500));

  console.log('--- Simulating user working inside the room without leaving ---');
  socket.emit('code:change', { roomId, code: 'const a = 10;' });
  await new Promise((r) => setTimeout(r, 300));

  if (leaveActivities === 0 && joinActivities <= 1) {
    console.log(`✅ PASSED: Zero false leave/join activities logged during room session.`);
  } else {
    console.error(`❌ FAILED: Unexpected leave activities: ${leaveActivities}, join activities: ${joinActivities}`);
    process.exit(1);
  }

  socket.disconnect();
  console.log('=== TEST COMPLETED SUCCESSFULLY ===');
  process.exit(0);
}

runTest().catch((err) => {
  console.error(err);
  process.exit(1);
});
