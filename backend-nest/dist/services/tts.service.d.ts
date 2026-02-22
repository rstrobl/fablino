import { ConfigService } from '@nestjs/config';
import { Character } from './claude.service';
export interface VoiceSettings {
    stability?: number;
    similarity_boost?: number;
    style?: number;
    use_speaker_boost?: boolean;
}
export interface ContextSettings {
    previous_text?: string;
    next_text?: string;
}
export interface VoiceInfo {
    name: string;
    desc: string;
    category: string;
}
export declare class TtsService {
    private configService;
    private readonly EL_VOICES;
    private readonly TRAIT_VOICE_MAP;
    private readonly VOICE_DIRECTORY;
    readonly DEFAULT_VOICE_SETTINGS: VoiceSettings;
    private readonly FIXED_VOICES;
    private readonly sfxCache;
    constructor(configService: ConfigService);
    getVoiceDirectory(): {
        [key: string]: VoiceInfo;
    };
    private matchVoiceByTraits;
    assignVoices(characters: Character[]): {
        [name: string]: string;
    };
    generateTTS(text: string, voiceId: string, outputPath: string, voiceSettings?: VoiceSettings, context?: ContextSettings): Promise<void>;
    generateSFX(description: string, outputPath: string): Promise<string | null>;
}
