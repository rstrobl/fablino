export interface ScriptLine {
  speaker: string;
  text: string;
}

export interface ScriptScene {
  lines: ScriptLine[];
}

export interface ScriptCharacter {
  name: string;
  gender: 'male' | 'female';
  age: number;
  type: string;
  species: string;
  voice_character: string;
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
  activeStep?: string;
  pipelineSteps?: any[];
  currentScript?: any;
}

export interface ReviewResult {
  approved: boolean;
  feedback: string;
  severity?: 'critical' | 'major' | 'minor';
}

export interface ScriptData {
  script: Script;
  voiceMap: Record<string, string>;
  systemPrompt: string;
  generationState?: GenerationState;
  lectorReview?: ReviewResult;
  pipeline?: any;
  userCharacters?: any;
}
