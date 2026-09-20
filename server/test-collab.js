import { io } from '../client/node_modules/socket.io-client/build/esm/index.js';

const SERVER_URL = 'http://localhost:5000';
const ROOM_ID = 'test-collab-sync-101';

async function runTest() {
  console.log('🧪 Starting Socket.io Real-Time Synchronization Test...');

  const client1 = io(SERVER_URL);
  const client2 = io(SERVER_URL);

  let step1Passed = false;
  let step2Passed = false;
  let step3Passed = false;

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    client1.on('connect', check);
    client2.on('connect', check);
  });

  console.log(' Both Client 1 & Client 2 connected successfully to Socket.io');

  // Step 1: Join Room
  client1.emit('room:join', {
    roomId: ROOM_ID,
    user: { id: 'user-1', name: 'Alice', color: '#ec4899' },
  });

  client2.emit('room:join', {
    roomId: ROOM_ID,
    user: { id: 'user-2', name: 'Bob', color: '#06b6d4' },
  });

  // Step 2: Code synchronization test
  client2.on('code:change', (data) => {
    if (data.code === 'const x = 42;') {
      console.log(' Client 2 received code:change from Client 1 successfully!');
      step1Passed = true;
    }
  });

  // Step 3: Cursor tracking test
  client2.on('cursor:move', (data) => {
    if (data.position && data.position.lineNumber === 12) {
      console.log(` Client 2 received remote cursor at line 12 from ${data.user?.name}!`);
      step2Passed = true;
    }
  });

  // Step 4: Chat test
  client1.on('chat:receive', (msg) => {
    if (msg.text === 'Hey Alice, testing live chat!') {
      console.log(' Client 1 received chat message from Client 2!');
      step3Passed = true;
    }
  });

  // Wait 500ms then dispatch events
  await new Promise((r) => setTimeout(r, 600));

  client1.emit('code:change', { roomId: ROOM_ID, code: 'const x = 42;' });
  client1.emit('cursor:move', {
    roomId: ROOM_ID,
    position: { lineNumber: 12, column: 5 },
    selection: null,
  });
  client2.emit('chat:send', {
    roomId: ROOM_ID,
    text: 'Hey Alice, testing live chat!',
  });

  // Wait 1.5s for all messages to arrive
  await new Promise((r) => setTimeout(r, 1500));

  client1.disconnect();
  client2.disconnect();

  if (step1Passed && step2Passed && step3Passed) {
    console.log('🎉 ALL REAL-TIME COLLABORATION TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('❌ Some tests did not pass:', { step1Passed, step2Passed, step3Passed });
    process.exit(1);
  }
}

runTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
