export interface ScriptLine {
  speaker: string;
  text: string;
}

export interface ScriptScene {
  lines: ScriptLine[];
}

export interface ScriptCharacter {
  name: string;
  gender: 'child_m' | 'child_f' | 'adult_m' | 'adult_f' | 'elder_m' | 'elder_f' | 'creature';
  traits: string[];
  emoji?: string;
  description?: string;
}

export interface Script {
  title: string;
  summary: string;
  characters: ScriptCharacter[];
  scenes: ScriptScene[];
}

export interface GenerationState {
  status: 'waiting_for_script' | 'preview' | 'generating_audio' | 'done' | 'error';
  progress?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface ScriptData {
  script: Script;
  voiceMap: Record<string, string>;
  systemPrompt: string;
  generationState?: GenerationState;
}
