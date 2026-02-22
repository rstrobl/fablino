import { ConfigService } from '@nestjs/config';
export interface Character {
    name: string;
    gender: 'child_m' | 'child_f' | 'adult_m' | 'adult_f' | 'elder_m' | 'elder_f' | 'creature';
    traits: string[];
}
export interface Line {
    speaker: string;
    text: string;
}
export interface Scene {
    lines: Line[];
}
export interface Script {
    title: string;
    summary: string;
    characters: Character[];
    scenes: Scene[];
}
export interface GeneratedScript {
    script: Script;
    systemPrompt: string;
}
export interface CharacterRequest {
    hero?: {
        name: string;
        age?: string;
    };
    sideCharacters?: Array<{
        name: string;
        role: string;
    }>;
}
export declare class ClaudeService {
    private configService;
    constructor(configService: ConfigService);
    generateScript(prompt: string, ageGroup?: string, characters?: CharacterRequest): Promise<GeneratedScript>;
}
