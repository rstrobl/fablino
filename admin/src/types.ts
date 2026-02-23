export interface Character {
  id: string;
  storyId: string;
  name: string;
  gender: string;
  voiceId: string;
}

export interface Line {
  id: string;
  storyId: string;
  sceneIdx: number;
  lineIdx: number;
  speaker: string;
  text: string;
  sfx: string | null;
  audioPath: string | null;
}

export interface Story {
  id: string;
  title: string;
  prompt: string;
  mood: string;
  ageGroup: string;
  createdAt: string;
  audioPath: string | null;
  featured: boolean;
  summary: string | null;
  coverUrl: string | null;
  voiceSettings: any;
  systemPrompt: string | null;
  status: string;
  requesterName: string | null;
  requesterSource: string | null;
  requesterContact: string | null;
  interests: string | null;
  characters: Character[];
  lines: Line[];
}

export interface WaitlistEntry {
  id: string;
  email: string;
  heroName: string;
  heroAge: number;
  prompt: string;
  sideCharacters: any;
  createdAt: string;
  storyId: string | null;
}

export interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels?: Record<string, string>;
  preview_url?: string;
  [key: string]: any;
}

export interface AudioPlayerState {
  storyId: string | null;
  title: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}
