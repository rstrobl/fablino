import type { Story, WaitlistEntry, Voice } from './types';

function getAuth(): string {
  return sessionStorage.getItem('fablino_auth') || '';
}

const authHeaders = (): HeadersInit => ({
  Authorization: getAuth(),
});

export async function fetchStories(): Promise<Story[]> {
  const res = await fetch('/stories?all=true');
  if (!res.ok) throw new Error('Failed to fetch stories');
  return res.json();
}

export async function fetchStory(id: string): Promise<Story> {
  const res = await fetch(`/stories/${id}`);
  if (!res.ok) throw new Error('Failed to fetch story');
  return res.json();
}

export async function deleteStory(id: string): Promise<void> {
  const res = await fetch(`/admin/stories/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete story');
}

export async function toggleFeatured(id: string): Promise<void> {
  const res = await fetch(`/admin/stories/${id}/toggle-featured`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to toggle featured');
}

export async function fetchWaitlist(): Promise<WaitlistEntry[]> {
  const res = await fetch('/waitlist', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch waitlist');
  return res.json();
}

export async function deleteWaitlistEntry(id: string): Promise<void> {
  const res = await fetch(`/waitlist/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error('Failed to delete waitlist entry');
}

export async function fetchVoices(): Promise<Voice[]> {
  const res = await fetch('/voices');
  if (!res.ok) throw new Error('Failed to fetch voices');
  const data = await res.json();
  // API returns {id: {name, desc, category, ...}} — convert to array
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
  const res = await fetch('/voices/categories');
  if (!res.ok) throw new Error('Failed to fetch voice categories');
  return res.json();
}

export async function generateScript(data: {
  heroName: string;
  heroAge: string;
  prompt: string;
  sideCharacters?: string[];
}): Promise<any> {
  const res = await fetch('/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to generate script');
  return res.json();
}

export async function generateAudio(data: any): Promise<any> {
  const res = await fetch('/generate/audio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to generate audio');
  return res.json();
}

export async function updateStoryStatus(id: string, status: string): Promise<void> {
  const res = await fetch(`/stories/${id}/status`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
}

export async function fetchPlayStats(): Promise<{ storyId: string; plays: number }[]> {
  const res = await fetch('/plays/stats', { headers: authHeaders() });
  if (!res.ok) throw new Error('Failed to fetch play stats');
  return res.json();
}

export async function checkHealth(): Promise<{ status: string }> {
  try {
    const res = await fetch('/stories?all=true');
    return { status: res.ok ? 'healthy' : 'unhealthy' };
  } catch {
    return { status: 'unreachable' };
  }
}
