export declare class SideCharacterDto {
    name: string;
    role: string;
}
export declare class HeroDto {
    name: string;
    age?: string;
}
export declare class CharacterRequestDto {
    hero?: HeroDto;
    sideCharacters?: SideCharacterDto[];
}
export declare class GenerateStoryDto {
    prompt: string;
    ageGroup?: string;
    characters?: CharacterRequestDto;
}
export declare class PreviewLineDto {
    text: string;
    voiceId: string;
    voiceSettings?: {
        stability?: number;
        similarity_boost?: number;
        style?: number;
        use_speaker_boost?: boolean;
    };
    previous_text?: string;
    next_text?: string;
}
