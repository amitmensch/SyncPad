import express from 'express';
import { Room } from '../models/Room.js';
import { optionalAuthMiddleware, authMiddleware } from './authRoutes.js';
import { v4 as uuidv4 } from 'uuid';
import { getActiveRoomStats } from '../sockets/editorSocket.js';

const router = express.Router();

const STARTER_CODE = {
  javascript: `// JavaScript Room — syncpad
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const diff = target - nums[i];
    if (map.has(diff)) return [map.get(diff), i];
    map.set(nums[i], i);
  }
  return [];
}

const result = twoSum([2, 7, 11, 15], 9);
console.log("Two Sum indices:", result);
`,
  python: `# Python Room — syncpad
def is_palindrome(s: str) -> bool:
    cleaned = ''.join(c.lower() for c in s if c.isalnum())
    return cleaned == cleaned[::-1]

test_string = "A man, a plan, a canal: Panama"
print(f"Is '{test_string}' a palindrome? -> {is_palindrome(test_string)}")
`,
  cpp: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    std::cout << "=== syncpad C++ Room ===" << std::endl;
    std::vector<int> numbers = {64, 34, 25, 12, 22, 11, 90};
    std::sort(numbers.begin(), numbers.end());
    
    std::cout << "Sorted array: ";
    for (int n : numbers) {
        std::cout << n << " ";
    }
    std::cout << std::endl;
    return 0;
}
`,
  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("=== syncpad Java Room ===");
        String[] languages = {"JavaScript", "Python", "C++", "Java", "TypeScript", "Rust", "Go"};
        for (String lang : languages) {
            System.out.println("Supports: " + lang);
        }
    }
}
`,
  typescript: `// TypeScript Room — syncpad
interface Participant {
  name: string;
  role: 'host' | 'participant';
  online: boolean;
}

const user: Participant = {
  name: "syncpad Developer",
  role: "host",
  online: true
};

console.log(\`Participant \${user.name} is \${user.online ? 'Online' : 'Offline'}\`);
`,
  go: `package main

import (
	"fmt"
	"strings"
)

func main() {
	msg := "hello from syncpad collaborative editor"
	fmt.Println(strings.ToUpper(msg))
}
`,
  rust: `fn main() {
    let message = "Real-Time Systems in syncpad Rust";
    println!("{}", message);
    
    let numbers: Vec<i32> = (1..=5).collect();
    let sum: i32 = numbers.iter().sum();
    println!("Sum 1..5 = {}", sum);
}
`,
};

// GET /api/rooms - List all public rooms for Rooms page & search
router.get('/', async (req, res) => {
  try {
    const { search, language, tag, limit = 50 } = req.query;
    const filter = { isPublic: { $ne: false } };

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } },
        { roomId: { $regex: search.trim(), $options: 'i' } },
        { tags: { $in: [new RegExp(search.trim(), 'i')] } },
      ];
    }

    if (language && language !== 'all') {
      filter.language = language;
    }

    if (tag && tag !== 'all') {
      filter.tags = tag;
    }

    const rooms = await Room.find(filter)
      .sort({ lastActiveAt: -1, updatedAt: -1 })
      .limit(parseInt(limit))
      .populate('owner', 'username avatar')
      .lean();

    const stats = getActiveRoomStats ? getActiveRoomStats() : {};
    const enrichedRooms = rooms.map((r) => {
      const roomStat = stats[r.roomId];
      const onlineCount = roomStat ? roomStat.onlineCount : 0;
      return {
        ...r,
        isLive: onlineCount > 0,
        onlineCount,
      };
    });

    res.json({ rooms: enrichedRooms });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching rooms: ' + err.message });
  }
});

// GET /api/rooms/user/mine - Get current user's created rooms and joined rooms
router.get('/user/mine', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const username = req.user.username;

    const createdRooms = await Room.find({ owner: userId })
      .sort({ lastActiveAt: -1 })
      .lean();

    const createdIds = new Set(createdRooms.map((r) => r.roomId));

    // Rooms joined or worked on by this user
    const joinedRooms = await Room.find({
      $or: [
        { 'collaborators.id': userId },
        { 'collaborators.username': username },
      ],
      roomId: { $nin: Array.from(createdIds) },
    })
      .sort({ lastActiveAt: -1 })
      .lean();

    res.json({
      createdRooms,
      joinedRooms,
      rooms: [...createdRooms, ...joinedRooms],
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching user rooms: ' + err.message });
  }
});

// POST /api/rooms - Create new room (Requires valid authenticated account)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, language = 'javascript', customRoomId, isPublic = true, tags = [] } = req.body;

    const roomId =
      customRoomId && customRoomId.trim().length >= 3
        ? customRoomId.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-')
        : `room-${uuidv4().substring(0, 8)}`;

    // Check if custom ID is already taken
    const existing = await Room.findOne({ roomId });
    if (existing) {
      return res.status(400).json({ message: `Room ID "${roomId}" is already in use. Please choose another.` });
    }

    const code = STARTER_CODE[language] || STARTER_CODE.javascript;
    const ownerName = req.user.username;

    const newRoom = await Room.create({
      roomId,
      title: title?.trim() || `Room #${roomId}`,
      description: description?.trim() || 'Live collaborative coding room on syncpad.',
      language,
      code,
      files: [],
      activeFileId: '',
      owner: req.user.id,
      ownerName,
      isPublic,
      tags: Array.isArray(tags) ? tags : [],
      collaborators: [
        {
          id: req.user.id,
          username: ownerName,
          avatar: req.user.avatar,
          lastActiveAt: new Date(),
        },
      ],
    });

    res.status(201).json({ room: newRoom });
  } catch (err) {
    res.status(500).json({ message: 'Error creating room: ' + err.message });
  }
});

// GET /api/rooms/:roomId - Get room by ID (NO AUTO-CREATION: Returns 404 if not found)
router.get('/:roomId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId }).populate('owner', 'username avatar').lean();

    if (!room) {
      return res.status(404).json({
        message: `Room "${roomId}" does not exist or the link is invalid.`,
        exists: false,
      });
    }

    res.json({ room, exists: true });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching room: ' + err.message });
  }
});

// PUT /api/rooms/:roomId - Update room metadata or code snapshot
router.put('/:roomId', optionalAuthMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { code, language, stdin, title, description, isPublic, tags } = req.body;

    const updateFields = { lastActiveAt: new Date() };
    if (code !== undefined) updateFields.code = code;
    if (language !== undefined) updateFields.language = language;
    if (stdin !== undefined) updateFields.stdin = stdin;
    if (title !== undefined) updateFields.title = title;
    if (description !== undefined) updateFields.description = description;
    if (isPublic !== undefined) updateFields.isPublic = isPublic;
    if (tags !== undefined) updateFields.tags = tags;
    if (req.body.files !== undefined) updateFields.files = req.body.files;
    if (req.body.activeFileId !== undefined) updateFields.activeFileId = req.body.activeFileId;

    const room = await Room.findOneAndUpdate({ roomId }, updateFields, { new: true });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    res.json({ room });
  } catch (err) {
    res.status(500).json({ message: 'Error saving room: ' + err.message });
  }
});

// DELETE /api/rooms/:roomId - Delete room
router.delete('/:roomId', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await Room.findOne({ roomId });

    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // Must be room owner or admin
    if (room.owner && room.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the room creator can delete this room.' });
    }

    await Room.deleteOne({ roomId });
    res.json({ message: 'Room deleted successfully.' });
  } catch (err) {
    res.status(500).json({ message: 'Error deleting room: ' + err.message });
  }
});

// POST /api/rooms/:roomId/fork - Fork room
router.post('/:roomId/fork', authMiddleware, async (req, res) => {
  try {
    const { roomId } = req.params;
    const sourceRoom = await Room.findOne({ roomId });

    if (!sourceRoom) {
      return res.status(404).json({ message: 'Source room not found' });
    }

    const newRoomId = `fork-${uuidv4().substring(0, 8)}`;
    const ownerName = req.user.username;

    const forkedRoom = await Room.create({
      roomId: newRoomId,
      title: `${sourceRoom.title} (Fork)`,
      description: `Forked from #${sourceRoom.roomId}. ${sourceRoom.description || ''}`,
      language: sourceRoom.language,
      code: sourceRoom.code,
      stdin: sourceRoom.stdin || '',
      owner: req.user.id,
      ownerName,
      forkedFrom: sourceRoom.roomId,
      isPublic: true,
      tags: sourceRoom.tags,
      collaborators: [
        {
          id: req.user.id,
          username: ownerName,
          avatar: req.user.avatar,
          lastActiveAt: new Date(),
        },
      ],
    });

    // Increment fork counter on original
    await Room.updateOne({ roomId }, { $inc: { forksCount: 1 } });

    res.status(201).json({ room: forkedRoom });
  } catch (err) {
    res.status(500).json({ message: 'Error forking room: ' + err.message });
  }
});

export default router;
