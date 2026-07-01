import { Task, User } from '../types';

const API_BASE_URL = 'https://orvian-tau.vercel.app';

// SAFE RESPONSE HANDLER
const handleResponse = async (res: Response) => {
  const text = await res.text();

  let data: any = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch (err) {
      throw new Error(
        `Invalid JSON response. Status: ${res.status}, Response: ${text}`
      );
    }
  }

  if (!res.ok) {
    throw new Error(data?.error || `API request failed (${res.status})`);
  }

  return data;
};

export const api = {
  // LOGIN
  async login(name: string, passwordPlain: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: passwordPlain }),
    });

    return handleResponse(res);
  },

  // REGISTER
  async register(name: string, passwordPlain: string): Promise<{ token: string; user: User }> {
    const res = await fetch(`${API_BASE_URL}/api/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password: passwordPlain }),
    });

    return handleResponse(res);
  },

  // LOGOUT (usually 204 -> no JSON)
  async logout(token: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/logout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Logout failed');
    }
  },

  // ME
  async getMe(token: string): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE_URL}/api/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse(res);
  },

  // TASKS
  async getTasks(token: string): Promise<Task[]> {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return handleResponse(res);
  },

  // CREATE TASK
  async createTask(
    token: string,
    title: string,
    description: string,
    date: string
  ): Promise<Task> {
    const res = await fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title, description, date }),
    });

    return handleResponse(res);
  },

  // UPDATE TASK
  async updateTask(
    token: string,
    taskId: string,
    updates: Partial<Task>
  ): Promise<Task> {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    return handleResponse(res);
  },

  // DELETE TASK (no JSON expected)
  async deleteTask(token: string, taskId: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to delete task');
    }
  },

  // UPDATE PROFILE
  async updateProfile(
    token: string,
    name: string,
    password?: string,
    profileImage?: string
  ): Promise<{ user: User }> {
    const res = await fetch(`${API_BASE_URL}/api/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, password, profileImage }),
    });

    return handleResponse(res);
  },

  // DELETE ACCOUNT (no JSON expected)
  async deleteAccount(token: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/profile/delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || 'Failed to delete account');
    }
  },
};