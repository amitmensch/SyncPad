import mongoose from 'mongoose';

const fileSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    name: { type: String, required: true },
    path: { type: String, default: '' },
    parentId: { type: String, default: null },
    type: { type: String, enum: ['file', 'directory'], default: 'file' },
    language: { type: String, default: 'javascript' },
    content: { type: String, default: '' },
    isEntrypoint: { type: Boolean, default: false },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      default: 'Untitled Session',
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      default: '',
      maxlength: 500,
    },
    language: {
      type: String,
      default: 'javascript',
      enum: ['javascript', 'python', 'cpp', 'java', 'typescript', 'go', 'rust'],
    },
    code: {
      type: String,
      default: '// Welcome to SyncPad!\n// Start typing to collaborate in real-time with your team.\n\nfunction greet(name) {\n  return `Hello, ${name}! Welcome to SyncPad.`;\n}\n\nconsole.log(greet("Developer"));\n',
    },
    files: {
      type: [fileSchema],
      default: [],
    },
    activeFileId: {
      type: String,
      default: '',
    },
    stdin: {
      type: String,
      default: '',
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    ownerName: {
      type: String,
      default: 'Guest Host',
    },
    collaborators: [
      {
        id: String,
        username: String,
        avatar: String,
        color: String,
        isGuest: Boolean,
        lastActiveAt: { type: Date, default: Date.now },
      },
    ],
    isPublic: {
      type: Boolean,
      default: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    stars: {
      type: Number,
      default: 0,
    },
    forks: {
      type: Number,
      default: 0,
    },
    lastActiveAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

roomSchema.pre('save', function (next) {
  if (!this.files || this.files.length === 0) {
    const extMap = {
      javascript: 'js',
      python: 'py',
      cpp: 'cpp',
      java: 'java',
      typescript: 'ts',
      go: 'go',
      rust: 'rs',
    };
    const ext = extMap[this.language] || 'js';
    const defaultName = this.language === 'java' ? 'Main.java' : `index.${ext}`;
    const defaultId = `file-default-${Date.now()}`;
    this.files = [
      {
        id: defaultId,
        name: defaultName,
        path: `/${defaultName}`,
        parentId: null,
        type: 'file',
        language: this.language || 'javascript',
        content: this.code || '// Welcome to syncpad!\n',
        isEntrypoint: true,
        updatedAt: new Date(),
      },
    ];
    this.activeFileId = defaultId;
  }
  next();
});

export const Room = mongoose.model('Room', roomSchema);
