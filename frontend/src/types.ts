export interface Story {
  id: string
  title: string
  characters: { name: string; gender: string }[]
  voiceMap: Record<string, string>
  prompt: string
  summary?: string
  ageGroup: string
  createdAt: string
  audioUrl: string
  coverUrl?: string
  lines?: { speaker: string; text: string }[]
}

export interface ScriptLine {
  speaker: string
  text: string
}

export interface ScriptScene {
  lines: ScriptLine[]
}

export interface ScriptPreview {
  title: string
  characters: { name: string; gender: string }[]
  scenes: ScriptScene[]
}

export interface SideCharacter {
  role: string
  name: string
}

export type View = 'home' | 'loading' | 'preview' | 'player' | 'waitlist' | 'script' | 'impressum' | 'datenschutz'