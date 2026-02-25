import type { Story, WaitlistEntry, Voice } from './types';

const API = '/api';

function getAuth(): string {
  return sessionStorage.getItem('fablino_auth') || '';
}

const authHeaders = (): HeadersInit => ({
  Authorization: getAuth(),
});

export async function fetchStories(): Promise<Story[]> {
  const res = await fetch(`${API}/stories?all=true`);
  if (!res.ok) throw new Error('Failed to fetch stories');
  return res.json();
}

export async function fetchStory(id: string): Promise<Story> {
  const res = await fetch(`${API}/stories/${id}`);
  if (!res.ok) throw new Error('Failed to fetch story');
  return res.json();
}

export async function deleteStory(id: string): Promise<void> {
  const res = await fetch(`${API}/stories/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete story');
}

export async function toggleFeatured(id: string): Promise<void> {
  // First get current state, then toggle
  const story = await fetchStory(id);
  const res = await fetch(`${API}/stories/${id}/featured`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ featured: !story.featured }),
  });
  if (!res.ok) throw new Error('Failed to toggle featured');
}

export async function updateStoryStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`${API}/stories/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
}

export async function fetchWaitlist(): Promise<WaitlistEntry[]> {
  const res = await fetch(`${API}/waitlist`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch waitlist');
  return res.json();
}

export async function deleteWaitlistEntry(id: string): Promise<void> {
  const res = await fetch(`${API}/waitlist/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete waitlist entry');
}

export async function fetchVoices(): Promise<Voice[]> {
  const res = await fetch(`${API}/voices`);
  if (!res.ok) throw new Error('Failed to fetch voices');
  const data = await res.json();
  if (!Array.isArray(data)) {
    return Object.entries(data).map(([id, v]: [string, any]) => ({
      voice_id: id,
      name: v.name,
      category: v.category || v.desc || 'unknown',
      labels: v.labels || {},
      preview_url: v.preview_url,
      ...v,
    }));
  }
  return data;
}

export async function fetchVoiceCategories(): Promise<string[]> {
  const res = await fetch(`${API}/voices/categories`);
  if (!res.ok) throw new Error('Failed to fetch voice categories');
  return res.json();
}

export async function fetchPlayStats(): Promise<{ storyId: string; plays: number }[]> {
  const res = await fetch(`${API}/plays/stats`, { headers: authHeaders() });
  if (!res.ok) return []; // graceful fallback if not authed
  return res.json();
}

export async function getSystemPrompt(): Promise<string> {
  const res = await fetch(`${API}/settings/system-prompt`, { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch system prompt');
  const data = await res.json();
  return data.prompt;
}

export async function updateSystemPrompt(prompt: string): Promise<void> {
  const res = await fetch(`${API}/settings/system-prompt`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error('Failed to update system prompt');
}

export async function checkHealth(): Promise<{ status: string }> {
  try {
    const res = await fetch(`${API}/stories?all=true`);
    return { status: res.ok ? 'healthy' : 'unhealthy' };
  } catch {
    return { status: 'unreachable' };
  }
}
