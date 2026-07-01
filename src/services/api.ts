import { Task, User } from '../types';

const handleResponse = async (res: Response) => {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'API request failed');
  }
  return data;
};

export const api = {
  async login(name: string, passwordPlain: string): Promise<{ token: string; user: User }> {
    const res = await fetch("https://orvian-tau.vercel.app/", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: passwordPlain }),
    });
    return handleResponse(res);
  },

  async register(name: string, passwordPlain: string): Promise<{ token: string; user: User }> {
    const res = await fetch('https://orvian-tau.vercel.app/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: passwordPlain }),
    });
    return handleResponse(res);
  },

  async logout(token: string): Promise<void> {
    await fetch('https://orvian-tau.vercel.app/', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
  },

  async getMe(token: string): Promise<{ user: User }> {
    const res = await fetch('https://orvian-tau.vercel.app/', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  async getTasks(token: string): Promise<Task[]> {
    const res = await fetch('https://orvian-tau.vercel.app/', {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    return handleResponse(res);
  },

  async createTask(token: string, title: string, description: string, date: string): Promise<Task> {
    const res = await fetch('https://orvian-tau.vercel.app/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, date }),
    });
    return handleResponse(res);
  },

  async updateTask(token: string, taskId: string, updates: Partial<Task>): Promise<Task> {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    return handleResponse(res);
  },

  async deleteTask(token: string, taskId: string): Promise<void> {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete task');
    }
  },

  async updateProfile(token: string, name: string, password?: string, profileImage?: string): Promise<{ user: User }> {
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ name, password, profileImage }),
    });
    return handleResponse(res);
  },

  async deleteAccount(token: string): Promise<void> {
    const res = await fetch('/api/profile/delete', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || 'Failed to delete account');
    }
  },
};
