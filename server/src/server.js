import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import execRoutes from './routes/execRoutes.js';
import { registerEditorSocketHandlers } from './sockets/editorSocket.js';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || '*';

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Middleware
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/execute', execRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'syncpad MERN Real-Time Server',
    time: new Date().toISOString(),
  });
});

// Register Socket.io room handlers
registerEditorSocketHandlers(io);

// Connect Database & Start Server
const start = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`==========================================`);
      console.log(`🚀 syncpad Backend running on port ${PORT}`);
      console.log(`📡 Socket.io ready for real-time collaboration`);
      console.log(`💻 Sandboxed Multi-Language Runner active`);
      console.log(`==========================================`);
    });
  } catch (err) {
    console.error('Fatal server boot error:', err);
    process.exit(1);
  }
};

start();
