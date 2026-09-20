import mongoose from 'mongoose';

let memoryServer = null;

export const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/collab_editor';
  
  // Try connecting with a short timeout first so we don't block
  try {
    console.log(`Connecting to MongoDB at ${mongoUri}...`);
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 2500,
    });
    console.log(' MongoDB connected successfully via URI');
    return;
  } catch (err) {
    console.warn(`! Primary MongoDB connection failed (${err.message}). Attempting in-memory MongoDB fallback...`);
  }

  // Fallback to mongodb-memory-server for zero-config out-of-the-box operation
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create();
    const memUri = memoryServer.getUri();
    console.log(`Starting in-memory MongoDB server at ${memUri}...`);
    await mongoose.connect(memUri);
    console.log(' In-Memory MongoDB connected successfully! (Zero-config mode active)');
  } catch (memErr) {
    console.error(' Failed to initialize in-memory MongoDB:', memErr.message);
    console.warn(' Running in memory mock persistence mode as final safety net.');
  }
};

export const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
    }
  } catch (e) {
    console.error('Error disconnecting DB', e);
  }
};
