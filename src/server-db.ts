import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface User {
  id: string;
  name: string;
  passwordHash: string;
  role: 'user' | 'admin' | 'superadmin';
  profileImage?: string; // base64 or placeholder
  isBlocked?: boolean;
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  status: 'pending' | 'completed' | 'missed';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  role: 'user' | 'model';
  text: string;
  createdAt: string;
}

interface DatabaseSchema {
  users: User[];
  tasks: Task[];
  chatHistory?: ChatMessage[];
  sessions?: Record<string, string>; // token -> userId
}

const DB_PATH = path.resolve(process.cwd(), 'db.json');

// Password hashing helper
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Generate secure random tokens
export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function createSession(userId: string): string {
  const token = generateToken();
  const db = initDb();
  db.sessions = db.sessions || {};
  db.sessions[token] = userId;
  saveDb(db);
  return token;
}

export function getUserIdFromSession(token: string): string | null {
  const db = initDb();
  db.sessions = db.sessions || {};
  return db.sessions[token] || null;
}

export function deleteSession(token: string): void {
  const db = initDb();
  db.sessions = db.sessions || {};
  delete db.sessions[token];
  saveDb(db);
}

// Initialize and load database
function initDb(): DatabaseSchema {
  try {
    if (fs.existsSync(DB_PATH)) {
      const content = fs.readFileSync(DB_PATH, 'utf-8');
      const db = JSON.parse(content) as DatabaseSchema;
      if (!db.users || !db.tasks) {
        throw new Error('Malformed DB file structure');
      }
      db.chatHistory = db.chatHistory || [];
      db.sessions = db.sessions || {};

      // Auto-seed/ensure superadmin always exists
      const sa = db.users.find(u => u.name.toLowerCase() === 'superadmin');
      if (!sa) {
        db.users.push({
          id: 'superadmin-id-789',
          name: 'superadmin',
          passwordHash: hashPassword('superadmin123'),
          role: 'superadmin',
          createdAt: new Date().toISOString(),
          isBlocked: false,
        });
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
      } else {
        // Double-check if existing superadmin is blocked, has wrong role, or wrong password
        sa.isBlocked = false;
        sa.role = 'superadmin';
        sa.passwordHash = hashPassword('superadmin123');
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
      }

      return db;
    }
  } catch (error) {
    console.error('Error reading database, creating a fresh one:', error);
  }

  // Pre-seed default database with an admin and a standard user
  const defaultDb: DatabaseSchema = {
    users: [
      {
        id: 'superadmin-id-789',
        name: 'superadmin',
        passwordHash: hashPassword('superadmin123'),
        role: 'superadmin',
        createdAt: new Date().toISOString(),
        isBlocked: false,
      },
      {
        id: 'admin-id-123',
        name: 'admin',
        passwordHash: hashPassword('admin123'),
        role: 'admin',
        createdAt: new Date().toISOString(),
        isBlocked: false,
      },
      {
        id: 'user-id-456',
        name: 'user',
        passwordHash: hashPassword('user123'),
        role: 'user',
        createdAt: new Date().toISOString(),
        isBlocked: false,
      }
    ],
    tasks: [
      {
        id: 'task-1',
        userId: 'user-id-456',
        title: 'Səhər idmanı və qaçış',
        description: 'Hər gün 30 dəqiqə bədən tərbiyəsi',
        date: '2026-07-01',
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task-2',
        userId: 'user-id-456',
        title: 'React v19 və Vite öyrənilməsi',
        description: 'Yeni developer alətlərini sınaqdan keçir',
        date: '2026-07-01',
        status: 'pending',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task-3',
        userId: 'user-id-456',
        title: 'Kitab oxumaq (Atomic Habits)',
        description: 'Hər gün ən azı 10 səhifə mütaliə',
        date: '2026-06-30', // Yesterday
        status: 'completed',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'task-4',
        userId: 'user-id-456',
        title: 'Gündəlik plan yazmaq',
        description: 'Dünəndən qalan işlərin təhlili',
        date: '2026-06-30', // Yesterday
        status: 'missed', // Already missed
        createdAt: new Date().toISOString(),
      }
    ],
    sessions: {},
  };

  saveDb(defaultDb);
  return defaultDb;
}

function saveDb(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write database file:', error);
  }
}

// Database Actions
export const ServerDB = {
  getUsers(): User[] {
    const db = initDb();
    return db.users;
  },

  getUserById(id: string): User | null {
    const db = initDb();
    return db.users.find((u) => u.id === id) || null;
  },

  getUserByName(name: string): User | null {
    const db = initDb();
    return db.users.find((u) => u.name.toLowerCase() === name.toLowerCase()) || null;
  },

  createUser(name: string, passwordPlain: string, role: 'user' | 'admin' = 'user'): User {
    const db = initDb();
    
    if (db.users.some((u) => u.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('User already exists');
    }

    const newUser: User = {
      id: 'usr_' + crypto.randomBytes(8).toString('hex'),
      name,
      passwordHash: hashPassword(passwordPlain),
      role,
      createdAt: new Date().toISOString(),
      isBlocked: false,
    };

    db.users.push(newUser);
    saveDb(db);
    return newUser;
  },

  updateUser(id: string, updates: Partial<Pick<User, 'name' | 'passwordHash' | 'profileImage' | 'role' | 'isBlocked'>>): User {
    const db = initDb();
    const index = db.users.findIndex((u) => u.id === id);
    if (index === -1) {
      throw new Error('User not found');
    }

    const user = db.users[index];
    const finalUpdates = { ...updates };
    if (user.role === 'superadmin' || user.name === 'superadmin') {
      if (finalUpdates.isBlocked) finalUpdates.isBlocked = false;
      if (finalUpdates.role) finalUpdates.role = 'superadmin';
    }

    db.users[index] = {
      ...user,
      ...finalUpdates,
    };

    saveDb(db);
    return db.users[index];
  },

  deleteUser(id: string): void {
    const db = initDb();
    db.users = db.users.filter((u) => u.id !== id);
    // Cascade delete tasks
    db.tasks = db.tasks.filter((t) => t.userId !== id);
    saveDb(db);
  },

  getTasks(userId?: string): Task[] {
    const db = initDb();
    const tasks = userId ? db.tasks.filter((t) => t.userId === userId) : db.tasks;
    
    // Auto-resolve "missed" status:
    // Any task with date in the past (before today "2026-07-01") that is "pending" automatically becomes "missed"
    // Let's implement this calculation based on current local date "2026-07-01" as set in additional metadata
    const todayStr = '2026-07-01'; 
    let changed = false;

    const updatedTasks = tasks.map((task) => {
      if (task.status === 'pending' && task.date < todayStr) {
        task.status = 'missed';
        changed = true;
      }
      return task;
    });

    if (changed) {
      // Find updated tasks in original array and save
      db.tasks = db.tasks.map((t) => {
        const updated = updatedTasks.find((ut) => ut.id === t.id);
        return updated ? updated : t;
      });
      saveDb(db);
    }

    return updatedTasks;
  },

  createTask(userId: string, title: string, description: string | undefined, date: string): Task {
    const db = initDb();
    
    const newTask: Task = {
      id: 'tsk_' + crypto.randomBytes(8).toString('hex'),
      userId,
      title,
      description,
      date,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    // Auto-set missed if created for the past directly (though past is typically read-only, let's keep robust)
    const todayStr = '2026-07-01';
    if (newTask.date < todayStr) {
      newTask.status = 'missed';
    }

    db.tasks.push(newTask);
    saveDb(db);
    return newTask;
  },

  updateTask(id: string, userId: string, updates: Partial<Pick<Task, 'title' | 'description' | 'date' | 'status'>>): Task {
    const db = initDb();
    const index = db.tasks.findIndex((t) => t.id === id && t.userId === userId);
    if (index === -1) {
      throw new Error('Task not found or access denied');
    }

    db.tasks[index] = {
      ...db.tasks[index],
      ...updates,
    };

    saveDb(db);
    return db.tasks[index];
  },

  deleteTask(id: string, userId: string): void {
    const db = initDb();
    db.tasks = db.tasks.filter((t) => !(t.id === id && t.userId === userId));
    saveDb(db);
  },

  getChatHistory(userId: string): ChatMessage[] {
    const db = initDb();
    return (db.chatHistory || []).filter((msg) => msg.userId === userId);
  },

  addChatMessage(userId: string, role: 'user' | 'model', text: string): ChatMessage {
    const db = initDb();
    if (!db.chatHistory) {
      db.chatHistory = [];
    }
    const newMsg: ChatMessage = {
      id: 'msg_' + crypto.randomBytes(8).toString('hex'),
      userId,
      role,
      text,
      createdAt: new Date().toISOString(),
    };
    db.chatHistory.push(newMsg);
    saveDb(db);
    return newMsg;
  },

  clearChatHistory(userId: string): void {
    const db = initDb();
    if (db.chatHistory) {
      db.chatHistory = db.chatHistory.filter((msg) => msg.userId !== userId);
      saveDb(db);
    }
  },
};
