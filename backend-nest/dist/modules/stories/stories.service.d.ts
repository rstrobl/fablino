import { PrismaService } from '../prisma/prisma.service';
import { TtsService } from '../../services/tts.service';
import { AudioService } from '../../services/audio.service';
export declare class StoriesService {
    private prisma;
    private ttsService;
    private audioService;
    private readonly AUDIO_DIR;
    constructor(prisma: PrismaService, ttsService: TtsService, audioService: AudioService);
    getStories(showAll?: boolean): Promise<{
        id: string;
        title: string;
        characters: {
            name: string;
            gender: string;
        }[];
        voiceMap: {};
        prompt: string;
        summary: string;
        ageGroup: string;
        featured: boolean;
        createdAt: Date;
        audioUrl: string;
        coverUrl: string;
    }[]>;
    getStory(id: string): Promise<{
        id: string;
        title: string;
        characters: {
            name: string;
            gender: string;
        }[];
        voiceMap: {};
        prompt: string;
        summary: string;
        ageGroup: string;
        createdAt: Date;
        audioUrl: string;
        coverUrl: string;
        lines: {
            id: number;
            audioPath: string | null;
            storyId: string;
            lineIdx: number | null;
            sceneIdx: number | null;
            speaker: string | null;
            text: string | null;
            sfx: string | null;
        }[];
    }>;
    toggleFeatured(id: string, featured: boolean): Promise<{
        status: string;
        featured: boolean;
    }>;
    voiceSwap(storyId: string, character: string, voiceId: string): Promise<{
        status: string;
        message: string;
        character?: undefined;
        voiceId?: undefined;
        linesRegenerated?: undefined;
    } | {
        status: string;
        character: string;
        voiceId: string;
        linesRegenerated: number;
        message?: undefined;
    }>;
    deleteStory(id: string): Promise<{
        status: string;
    }>;
}
