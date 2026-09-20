import mongoose from 'mongoose';

const messageSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      index: true,
    },
    user: {
      id: String,
      name: { type: String, required: true },
      avatar: String,
      color: String,
      isGuest: { type: Boolean, default: false },
    },
    text: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    type: {
      type: String,
      enum: ['text', 'system', 'code'],
      default: 'text',
    },
  },
  { timestamps: true }
);

export const Message = mongoose.model('Message', messageSchema);
