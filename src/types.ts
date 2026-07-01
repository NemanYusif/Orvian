export type Role = 'user' | 'admin' | 'superadmin';

export interface User {
  id: string;
  name: string;
  role: Role;
  profileImage?: string;
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

export type ViewTab = 'calendar' | 'tasks' | 'profile' | 'admin' | 'analytics' | 'coach' | 'timer';

export type Language = 'az' | 'en';

export interface UserStats {
  total: number;
  completed: number;
  missed: number;
  pending: number;
  completionRate: number;
  currentStreak: number;
  longestStreak: number;
}

export interface AdminUserSummary {
  id: string;
  name: string;
  role: Role;
  createdAt: string;
  isBlocked: boolean;
  profileImage?: string;
  stats: {
    total: number;
    completed: number;
    missed: number;
    ratio: number;
  };
}

export interface GlobalAnalytics {
  scope?: 'full' | 'limited';
  totalUsers: number;
  activeUsers: number;
  totalTasks: number;
  completedTasks: number;
  missedTasks: number;
  completionRate: number;
}

export interface AchievementBadge {
  id: string;
  titleAz: string;
  titleEn: string;
  descriptionAz: string;
  descriptionEn: string;
  icon: string; // lucide icon name
  unlocked: boolean;
  color: string; // tailwind classes
}
