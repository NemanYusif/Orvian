import { create } from 'zustand';
import { Language, Task, User, ViewTab } from '../types';
import { api } from '../services/api';

interface AppState {
  token: string | null;
  user: User | null;
  tasks: Task[];
  lang: Language;
  isDark: boolean;
  currentTab: ViewTab;
  isAppLoading: boolean;

  // Actions
  setLang: (lang: Language) => void;
  setIsDark: (isDark: boolean) => void;
  setCurrentTab: (tab: ViewTab) => void;
  initializeSession: () => Promise<void>;
  login: (name: string, passwordPlain: string) => Promise<void>;
  register: (name: string, passwordPlain: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchTasks: () => Promise<void>;
  addTask: (title: string, description: string, date: string) => Promise<void>;
  updateTaskStatus: (taskId: string, status: Task['status']) => Promise<void>;
  updateTask: (taskId: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  updateProfile: (name: string, password?: string, profileImage?: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  token: localStorage.getItem('token'),
  user: (() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  })(),
  tasks: [],
  lang: (localStorage.getItem('lang') as Language) || 'az',
  isDark: localStorage.getItem('theme') === 'dark',
  currentTab: 'calendar',
  isAppLoading: true,

  setLang: (lang: Language) => {
    localStorage.setItem('lang', lang);
    set({ lang });
  },

  setIsDark: (isDark: boolean) => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    set({ isDark });
  },

  setCurrentTab: (currentTab: ViewTab) => {
    set({ currentTab });
  },

  initializeSession: async () => {
    const { token } = get();
    if (!token) {
      set({ isAppLoading: false });
      return;
    }

    try {
      const data = await api.getMe(token);
      set({ user: data.user });
      localStorage.setItem('user', JSON.stringify(data.user));
      await get().fetchTasks();
    } catch (err) {
      console.error('Session validation failed, logging out:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ token: null, user: null, tasks: [] });
    } finally {
      set({ isAppLoading: false });
    }
  },

  login: async (name: string, passwordPlain: string) => {
    const data = await api.login(name, passwordPlain);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, currentTab: 'calendar' });
    await get().fetchTasks();
  },

  register: async (name: string, passwordPlain: string) => {
    const data = await api.register(name, passwordPlain);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ token: data.token, user: data.user, currentTab: 'calendar' });
    await get().fetchTasks();
  },

  logout: async () => {
    const { token } = get();
    if (token) {
      try {
        await api.logout(token);
      } catch (err) {
        console.error('API logout failed', err);
      }
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, tasks: [], currentTab: 'calendar' });
  },

  fetchTasks: async () => {
    const { token } = get();
    if (!token) return;
    try {
      const tasks = await api.getTasks(token);
      set({ tasks });
    } catch (err) {
      console.error('Fetch tasks failed', err);
    }
  },

  addTask: async (title: string, description: string, date: string) => {
    const { token } = get();
    if (!token) return;
    await api.createTask(token, title, description, date);
    await get().fetchTasks();
  },

  updateTaskStatus: async (taskId: string, status: Task['status']) => {
    const { token } = get();
    if (!token) return;
    await api.updateTask(token, taskId, { status });
    await get().fetchTasks();
  },

  updateTask: async (taskId: string, updates: Partial<Task>) => {
    const { token } = get();
    if (!token) return;
    await api.updateTask(token, taskId, updates);
    await get().fetchTasks();
  },

  deleteTask: async (taskId: string) => {
    const { token } = get();
    if (!token) return;
    await api.deleteTask(token, taskId);
    await get().fetchTasks();
  },

  updateProfile: async (name: string, password?: string, profileImage?: string) => {
    const { token } = get();
    if (!token) return;
    const data = await api.updateProfile(token, name, password, profileImage);
    localStorage.setItem('user', JSON.stringify(data.user));
    set({ user: data.user });
  },

  deleteAccount: async () => {
    const { token } = get();
    if (!token) return;
    await api.deleteAccount(token);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ token: null, user: null, tasks: [], currentTab: 'calendar' });
  },
}));
