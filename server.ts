import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { ServerDB, hashPassword, createSession, getUserIdFromSession, deleteSession, User, Task, ChatMessage } from './src/server-db.js';
import { aiMentorService } from './src/services/aiMentorService.js';

// Define custom property on Express Request
interface AuthenticatedRequest extends Request {
  user?: User;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON body parser with comfortable size limit for base64 profile image uploads
  app.use(express.json({ limit: '10mb' }));

  // Helper auth middlewares
  const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header is missing or malformed' });
    }
    const token = authHeader.split(' ')[1];
    const userId = getUserIdFromSession(token);
    if (!userId) {
      return res.status(401).json({ error: 'Session has expired or token is invalid' });
    }
    const user = ServerDB.getUserById(userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.isBlocked && user.role !== 'superadmin' && user.name !== 'superadmin') {
      return res.status(403).json({ error: 'Account blocked' });
    }
    req.user = user;
    next();
  };

  const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
      return res.status(403).json({ error: 'Admin or Superadmin role is required' });
    }
    next();
  };

  // 1. Auth APIs
  app.post('/api/auth/register', (req: Request, res: Response) => {
    try {
      const { name, password } = req.body;
      if (!name || !password || name.trim().length < 2 || password.length < 4) {
        return res.status(400).json({ error: 'Name must be at least 2 chars, password at least 4 chars' });
      }

      // Check duplicate
      const existing = ServerDB.getUserByName(name);
      if (existing) {
        return res.status(400).json({ error: 'İstifadəçi adı artıq mövcuddur' });
      }

      const user = ServerDB.createUser(name.trim(), password);
      const token = createSession(user.id);

      res.status(201).json({
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Server error during registration' });
    }
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    try {
      const { name, password } = req.body;
      if (!name || !password) {
        return res.status(400).json({ error: 'Name and password are required' });
      }

      const user = ServerDB.getUserByName(name);
      if (!user) {
        return res.status(400).json({ error: 'İstifadəçi adı və ya şifrə yanlışdır' });
      }

      if (user.isBlocked) {
        return res.status(403).json({ error: 'Hesabınız admin tərəfindən dondurulub' });
      }

      const hash = hashPassword(password);
      if (user.passwordHash !== hash) {
        return res.status(400).json({ error: 'İstifadəçi adı və ya şifrə yanlışdır' });
      }

      const token = createSession(user.id);
      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          profileImage: user.profileImage,
          createdAt: user.createdAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Server error during login' });
    }
  });

  app.post('/api/auth/logout', authenticate, (req: AuthenticatedRequest, res: Response) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      deleteSession(token);
    }
    res.json({ success: true });
  });

  app.get('/api/auth/me', authenticate, (req: AuthenticatedRequest, res: Response) => {
    res.json({
      user: {
        id: req.user?.id,
        name: req.user?.name,
        role: req.user?.role,
        profileImage: req.user?.profileImage,
        createdAt: req.user?.createdAt,
      },
    });
  });

  // 2. Profile APIs
  app.put('/api/profile', authenticate, (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id!;
      const { name, password, profileImage } = req.body;

      const updates: any = {};
      if (name && name.trim().length >= 2) {
        // Check uniqueness of username if it changes
        const currentName = req.user?.name;
        if (name.trim().toLowerCase() !== currentName?.toLowerCase()) {
          const duplicate = ServerDB.getUserByName(name.trim());
          if (duplicate) {
            return res.status(400).json({ error: 'Bu istifadəçi adı artıq tutulub' });
          }
        }
        updates.name = name.trim();
      }

      if (password && password.length >= 4) {
        updates.passwordHash = hashPassword(password);
      }

      if (profileImage !== undefined) {
        updates.profileImage = profileImage; // Expected base64 string
      }

      const updatedUser = ServerDB.updateUser(userId, updates);
      res.json({
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          role: updatedUser.role,
          profileImage: updatedUser.profileImage,
          createdAt: updatedUser.createdAt,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/profile/delete', authenticate, (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id!;
      ServerDB.deleteUser(userId);
      res.json({ success: true, message: 'Hesabınız tamamilə silindi' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 3. Task Management APIs (CRUD)
  app.get('/api/tasks', authenticate, (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id!;
      const tasks = ServerDB.getTasks(userId);
      res.json(tasks);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/tasks', authenticate, (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id!;
      const { title, description, date } = req.body;

      if (!title || !date) {
        return res.status(400).json({ error: 'Title and date are required' });
      }

      // Check if trying to add task to the past
      const todayStr = '2026-07-01';
      if (date < todayStr) {
        return res.status(400).json({ error: 'Keçmiş günlərə yeni task əlavə etmək olmaz!' });
      }

      const task = ServerDB.createTask(userId, title.trim(), description || '', date);
      res.status(201).json(task);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/tasks/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id!;
      const taskId = req.params.id;
      const { title, description, status, date } = req.body;

      const currentTasks = ServerDB.getTasks(userId);
      const currentTask = currentTasks.find((t) => t.id === taskId);
      if (!currentTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Past tasks rule: Past task is read-only
      const todayStr = '2026-07-01';
      if (currentTask.date < todayStr) {
        return res.status(400).json({ error: 'Keçmiş tapşırıqlar dəyişdirilə bilməz!' });
      }

      const updates: any = {};
      if (title !== undefined) updates.title = title.trim();
      if (description !== undefined) updates.description = description;
      if (status !== undefined) {
        if (!['pending', 'completed', 'missed'].includes(status)) {
          return res.status(400).json({ error: 'Invalid status' });
        }
        updates.status = status;
      }
      if (date !== undefined) {
        if (date < todayStr) {
          return res.status(400).json({ error: 'Tapşırığı keçmiş tarixə köçürmək olmaz!' });
        }
        updates.date = date;
      }

      const updatedTask = ServerDB.updateTask(taskId, userId, updates);
      res.json(updatedTask);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/tasks/:id', authenticate, (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id!;
      const taskId = req.params.id;

      const currentTasks = ServerDB.getTasks(userId);
      const currentTask = currentTasks.find((t) => t.id === taskId);
      if (!currentTask) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const todayStr = '2026-07-01';
      if (currentTask.date < todayStr) {
        return res.status(400).json({ error: 'Keçmiş günlərin tapşırıqlarını silmək olmaz!' });
      }

      ServerDB.deleteTask(taskId, userId);
      res.json({ success: true, message: 'Tapşırıq silindi' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Admin Management APIs (Protected)
  app.get('/api/admin/users', authenticate, requireAdmin, (req: Request, res: Response) => {
    try {
      const users = ServerDB.getUsers();
      const summaryList = users.map((u) => {
        const uTasks = ServerDB.getTasks(u.id);
        const total = uTasks.length;
        const completed = uTasks.filter((t) => t.status === 'completed').length;
        const missed = uTasks.filter((t) => t.status === 'missed').length;

        return {
          id: u.id,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt,
          isBlocked: !!u.isBlocked,
          profileImage: u.profileImage,
          stats: {
            total,
            completed,
            missed,
            ratio: total > 0 ? Math.round((completed / total) * 100) : 0,
          },
        };
      });
      res.json(summaryList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/users/:userId', authenticate, requireAdmin, (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const targetUser = ServerDB.getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const requesterRole = (req as AuthenticatedRequest).user?.role;
      const requesterId = (req as AuthenticatedRequest).user?.id;

      // Restrict task data: ONLY superadmins or the user themselves can view target tasks
      const canViewTasks = (requesterRole === 'superadmin' || userId === requesterId);
      const uTasks = canViewTasks ? ServerDB.getTasks(userId) : [];

      const total = uTasks.length;
      const completed = uTasks.filter((t) => t.status === 'completed').length;
      const missed = uTasks.filter((t) => t.status === 'missed').length;

      res.json({
        user: {
          id: targetUser.id,
          name: targetUser.name,
          role: targetUser.role,
          createdAt: targetUser.createdAt,
          isBlocked: !!targetUser.isBlocked,
          profileImage: targetUser.profileImage,
        },
        tasks: uTasks,
        stats: {
          total,
          completed,
          missed,
          ratio: total > 0 ? Math.round((completed / total) * 100) : 0,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/users/:userId/status', authenticate, requireAdmin, (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { isBlocked } = req.body;
      const requesterRole = (req as AuthenticatedRequest).user?.role;

      if (isBlocked === undefined) {
        return res.status(400).json({ error: 'isBlocked is required' });
      }

      if (userId === 'admin-id-123' || userId === 'superadmin-id-789') {
        return res.status(400).json({ error: 'Siz ana idarəçi hesablarını blok edə bilməzsiniz!' });
      }

      const targetUser = ServerDB.getUserById(userId);
      if (targetUser?.role === 'superadmin' && requesterRole !== 'superadmin') {
        return res.status(403).json({ error: 'Yalnız Superadmin digər superadmin hesablarını blok edə bilər!' });
      }

      const updated = ServerDB.updateUser(userId, { isBlocked: !!isBlocked });
      res.json({ success: true, user: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/users/:userId/role', authenticate, requireAdmin, (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;
      const requesterRole = (req as AuthenticatedRequest).user?.role;

      if (!role || (role !== 'user' && role !== 'admin' && role !== 'superadmin')) {
        return res.status(400).json({ error: 'Valid role is required (user, admin, superadmin)' });
      }

      // Security Check: standard admin cannot elevate someone to superadmin, nor modify superadmin roles
      if (role === 'superadmin' && requesterRole !== 'superadmin') {
        return res.status(403).json({ error: 'Yalnız Superadmin başqasına Superadmin rolu təyin edə bilər!' });
      }

      const targetUser = ServerDB.getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      if (targetUser.role === 'superadmin' && requesterRole !== 'superadmin') {
        return res.status(403).json({ error: 'Adminlər Superadmin rollarını dəyişdirə bilməzlər!' });
      }

      // Prevent lockout
      const requesterId = (req as AuthenticatedRequest).user?.id;
      if (userId === requesterId) {
        return res.status(400).json({ error: 'Öz rolunuzu dəyişdirə bilməzsiniz!' });
      }

      const updated = ServerDB.updateUser(userId, { role });
      res.json({ success: true, user: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/users/:userId', authenticate, requireAdmin, (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const requesterRole = (req as AuthenticatedRequest).user?.role;

      if (userId === 'admin-id-123' || userId === 'superadmin-id-789') {
        return res.status(400).json({ error: 'Siz ana idarəçi hesablarını silə bilməzsiniz!' });
      }

      const targetUser = ServerDB.getUserById(userId);
      if (targetUser?.role === 'superadmin' && requesterRole !== 'superadmin') {
        return res.status(403).json({ error: 'Adminlər Superadmin hesablarını silə bilməzlər!' });
      }

      ServerDB.deleteUser(userId);
      res.json({ success: true, message: 'İstifadəçi uğurla silindi' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/admin/analytics', authenticate, requireAdmin, (req: Request, res: Response) => {
    try {
      const users = ServerDB.getUsers();
      const requesterRole = (req as AuthenticatedRequest).user?.role;

      if (requesterRole === 'superadmin') {
        // Full System Analytics for Superadmin
        const allTasks = ServerDB.getTasks();
        const totalTasks = allTasks.length;
        const completedTasks = allTasks.filter((t) => t.status === 'completed').length;
        const missedTasks = allTasks.filter((t) => t.status === 'missed').length;
        const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        res.json({
          scope: 'full',
          totalUsers: users.length,
          activeUsers: users.filter((u) => !u.isBlocked).length,
          totalTasks,
          completedTasks,
          missedTasks,
          completionRate,
        });
      } else {
        // Limited Analytics for Admin: total/completed/missed tasks are hidden
        res.json({
          scope: 'limited',
          totalUsers: users.length,
          activeUsers: users.filter((u) => !u.isBlocked).length,
          totalTasks: 0,
          completedTasks: 0,
          missedTasks: 0,
          completionRate: 0,
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5. AI Coach API using Gemini 3.5-flash
  app.post('/api/ai-coach', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id!;
      const userName = req.user?.name || 'İstifadəçi';
      const { language } = req.body; // 'az' or 'en'
      const isAz = language === 'az';

      const tasks = ServerDB.getTasks(userId);
      const todayStr = '2026-07-01';

      // Statistics calculations
      const total = tasks.length;
      const completed = tasks.filter((t) => t.status === 'completed').length;
      const missed = tasks.filter((t) => t.status === 'missed').length;
      const pending = tasks.filter((t) => t.status === 'pending').length;

      const completedRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      // Filter tasks related to yesterday & today
      const todayTasks = tasks.filter((t) => t.date === todayStr);
      const yesterdayTasks = tasks.filter((t) => t.date === '2026-06-30');

      const completedToday = todayTasks.filter((t) => t.status === 'completed').length;
      const pendingToday = todayTasks.filter((t) => t.status === 'pending').length;

      const completedYesterday = yesterdayTasks.filter((t) => t.status === 'completed').length;
      const missedYesterday = yesterdayTasks.filter((t) => t.status === 'missed').length;

      // Build structured request to Gemini API
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        const defaultResponse = isAz
          ? `### 🤖 AI Coach Məsləhəti\n\nSalam **${userName}**! Layihədə server tərəfində işləyən Gemini API quraşdırılıb, lakin hal-hazırda etibarlı API açarı yoxdur. Sizin qısa hesabatınız:\n\n- **Ümumi tapşırıqlar**: ${total}\n- **Tamamlanma nisbəti**: %${completedRate}\n- **Bugünkü tapşırıqlar**: ${todayTasks.length} tapşırıq (${pendingToday} gözləmədə, ${completedToday} tamamlanıb).\n- **Dünən qaçırılanlar**: ${missedYesterday} tapşırıq.\n\n*Açarlarınızı sol paneldəki "Settings > Secrets" panelinə əlavə edərək daha ətraflı koç məsləhətləri ala bilərsiniz.*`
          : `### 🤖 AI Coach Advice\n\nHello **${userName}**! The server-side Gemini API is correctly integrated, but a valid API key was not detected in environment secrets. Here is your summary:\n\n- **Total Tasks**: ${total}\n- **Completion Rate**: ${completedRate}%\n- **Today's Tasks**: ${todayTasks.length} tasks (${pendingToday} pending, ${completedToday} completed).\n- **Yesterday's Missed**: ${missedYesterday} tasks.\n\n*Configure your GEMINI_API_KEY via the Settings > Secrets panel for personalized coaching reports.*`;
        return res.json({ text: defaultResponse });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const languageInstruction = isAz
        ? "Cavabı tam olaraq Azərbaycan dilində yaz. Çox səmimi, motivasiyaedici, peşəkar bir məhsuldarlıq koçu kimi çıxış et. Markdown formatından və abzaslardan istifadə et."
        : "Write the response fully in English. Act as a friendly, highly motivational, professional productivity coach. Use markdown formatting and spacing.";

      const prompt = `
        User: ${userName}
        Current Date: ${todayStr} (Wednesday)
        
        Task Statistics:
        - Total tasks created: ${total}
        - Total completed tasks: ${completed} (${completedRate}% completion rate)
        - Total missed tasks: ${missed}
        - Total pending tasks: ${pending}
        
        Yesterday's Performance (${yesterdayTasks.length} total tasks):
        - Completed yesterday: ${completedYesterday}
        - Missed yesterday: ${missedYesterday}
        
        Today's Schedule (${todayTasks.length} total tasks):
        - Completed today: ${completedToday}
        - Pending today: ${pendingToday}
        
        Please generate:
        1. Daily productivity feedback (review yesterday's missed tasks and today's status).
        2. Actionable suggestions for completing current pending tasks.
        3. A beautiful motivational message or quote tailored to their rate (${completedRate}%).
        4. Clear warnings if they have missed tasks or if their today is completely empty.
      `;

      // Try multiple models and retry on failure
      const modelsToTry = ['gemini-3.5-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest'];
      let lastError: any = null;
      let responseText = '';

      for (const modelName of modelsToTry) {
        let attempts = 2;
        while (attempts > 0) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: prompt,
              config: {
                systemInstruction: `You are an elite productivity AI Coach called "Mentor AI" embedded inside the Personal Year Tracker Application. ${languageInstruction}`,
              }
            });
            if (response && response.text) {
              responseText = response.text;
              break;
            }
          } catch (err: any) {
            lastError = err;
            console.warn(`Attempt failed with model ${modelName}. Remaining attempts: ${attempts - 1}. Error:`, err.message || err);
            attempts--;
            if (attempts > 0) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }
          }
        }
        if (responseText) {
          break;
        }
      }

      if (responseText) {
        return res.json({ text: responseText });
      }

      // If all API calls fail, fallback to a beautiful localized mock report explaining high demand
      const serviceBackupResponse = isAz
        ? `### 🤖 AI Coach Müvəqqəti Məsləhəti\n\nSalam **${userName}**! Süni İntellekt (Gemini) xidmətlərində hal-hazırda yüksək tələb və ya müvəqqəti yüklənmə mövcuddur (Sistem Xətası: 503 Unavailable). Buna görə də sizə bu avtomatik hesabatı təqdim edirik:\n\n- **Ümumi tapşırıqlar**: ${total}\n- **Tamamlanma nisbəti**: %${completedRate}\n- **Bugünkü tapşırıqlar**: ${todayTasks.length} tapşırıq (${pendingToday} gözləmədə, ${completedToday} tamamlanıb).\n- **Dünən qaçırılanlar**: ${missedYesterday} tapşırıq.\n\n*Müvəqqəti yüklənmə keçdikdən sonra "Yenilə" düyməsini sıxaraq ətraflı koç rəyini yenidən əldə edə bilərsiniz. Məhsuldar qalın!*`
        : `### 🤖 AI Coach Temporary Advice\n\nHello **${userName}**! The AI (Gemini) service is currently experiencing very high demand or is temporarily unavailable (System Error: 503 Unavailable). To keep you on track, here is your automatic summary:\n\n- **Total Tasks**: ${total}\n- **Completion Rate**: ${completedRate}%\n- **Today's Tasks**: ${todayTasks.length} tasks (${pendingToday} pending, ${completedToday} completed).\n- **Yesterday's Missed**: ${missedYesterday} tasks.\n\n*Please try clicking 'Refresh' again in a few moments once high demand subsides. Keep up the great work!*`;

      res.json({ text: serviceBackupResponse });
    } catch (err: any) {
      console.error('Error in AI Coach endpoint:', err);
      res.status(500).json({ error: 'AI Coach response generation failed: ' + err.message });
    }
  });

  // 5.1 AI Mentor Chat History API
  app.get('/api/ai-mentor/history', authenticate, (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id!;
      const history = ServerDB.getChatHistory(userId);
      res.json({ history });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5.2 AI Mentor Clear Chat History API
  app.post('/api/ai-mentor/clear', authenticate, (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id!;
      ServerDB.clearChatHistory(userId);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 5.3 AI Mentor Send Chat Message API
  app.post('/api/ai-mentor/chat', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id!;
      const userName = req.user?.name || 'User';
      const { message, language } = req.body; // 'az' or 'en'
      const isAz = language === 'az';

      if (!message || !message.trim()) {
        return res.status(400).json({ error: 'Message is required' });
      }

      // Add user message to history
      ServerDB.addChatMessage(userId, 'user', message.trim());

      // Generate coaching response using the separate service layer
      const result = await aiMentorService.generateCoachingResponse(userId, userName, message, isAz);
      res.json(result);
    } catch (err: any) {
      console.error('Error in AI Mentor Chat endpoint:', err);
      res.status(500).json({ error: 'AI Mentor Chat failed: ' + err.message });
    }
  });

  // 5.4 AI Mentor Quick Suggest API
  app.post('/api/ai-mentor/quick-suggest', authenticate, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user?.id!;
      const { language } = req.body;
      const isAz = language === 'az';

      const tasks = ServerDB.getTasks(userId);
      const unfinished = tasks.filter((t) => t.status === 'pending' || t.status === 'missed');

      if (unfinished.length === 0) {
        return res.json({
          hasSuggestion: false,
          taskTitle: '',
          reason: isAz 
            ? 'Təbrik edirəm! Hazırda gözləmədə olan və ya qaçırılmış heç bir tapşırığınız yoxdur. Gözəl və məhsuldar bir gün keçirin!'
            : 'Congratulations! You have no pending or missed tasks. Have a wonderful and productive day!'
        });
      }

      // Check if GEMINI_API_KEY is configured
      if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
        const sorted = [...unfinished].sort((a, b) => a.date.localeCompare(b.date));
        const priorityTask = sorted[0];
        const isOverdue = priorityTask.date < '2026-07-01';
        const reasonStr = isAz
          ? `- Gündəlik inkişafınız üçün mühüm addımdır\n${isOverdue ? '- Ötən günlərdən gecikmiş tapşırıqdır' : '- Bu gün yerinə yetirilməsi tövsiyə olunur'}`
          : `- High impact on learning progress\n${isOverdue ? '- Overdue task from previous day' : '- Recommended to complete today'}`;

        return res.json({
          hasSuggestion: true,
          taskTitle: priorityTask.title,
          reason: reasonStr
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemInstruction = `You are an elite productivity and task prioritization engine.
Analyze the user's tasks (which include pending, completed, and missed tasks) and identify EXACTLY ONE single top-priority task for today ("2026-07-01").

Rules for selection:
1. Choose only one task. It must be from the unfinished tasks (status: 'pending' or 'missed').
2. Prioritize based on:
   - Urgency: Overdue/missed tasks from previous days should be prioritized first.
   - Relevance to the user's productivity history.
3. If there are absolutely no pending or missed tasks, return hasSuggestion: false.

Response Format:
You MUST respond in Azerbaijani if language requested is Azerbaijani, or English if English.
You MUST respond with a JSON object matching this schema:
{
  "hasSuggestion": boolean,
  "taskTitle": "the title of the selected task",
  "reason": "bullet points explaining why (keep it to 2 bullets maximum, each bullet on a new line starting with '- ')"
}
`;

      const prompt = `Here are the user's tasks:
${JSON.stringify(tasks, null, 2)}

Provide the priority suggestion in ${isAz ? 'Azerbaijani' : 'English'}.`;

      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.5-flash',
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                hasSuggestion: { type: Type.BOOLEAN },
                taskTitle: { type: Type.STRING },
                reason: { type: Type.STRING },
              },
              required: ['hasSuggestion', 'taskTitle', 'reason'],
            }
          }
        });

        if (response && response.text) {
          const parsed = JSON.parse(response.text.trim());
          return res.json(parsed);
        }
      } catch (err) {
        console.error('Error calling Gemini for Quick Suggest:', err);
      }

      // If anything fails, fallback to local logic
      const sorted = [...unfinished].sort((a, b) => a.date.localeCompare(b.date));
      const priorityTask = sorted[0];
      const isOverdue = priorityTask.date < '2026-07-01';
      const reasonStr = isAz
        ? `- Gündəlik inkişafınız üçün mühüm addımdır\n${isOverdue ? '- Ötən günlərdən gecikmiş tapşırıqdır' : '- Bu gün yerinə yetirilməsi tövsiyə olunur'}`
        : `- High impact on learning progress\n${isOverdue ? '- Overdue task from previous day' : '- Recommended to complete today'}`;

      return res.json({
        hasSuggestion: true,
        taskTitle: priorityTask.title,
        reason: reasonStr
      });
    } catch (err: any) {
      console.error('Error in Quick Suggest endpoint:', err);
      res.status(500).json({ error: 'Quick Suggest failed: ' + err.message });
    }
  });

  // Serve static files and fallback logic for SPA
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
