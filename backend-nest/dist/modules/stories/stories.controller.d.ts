import { StoriesService } from './stories.service';
import { ToggleFeaturedDto, VoiceSwapDto } from '../../dto/stories.dto';
export declare class StoriesController {
    private readonly storiesService;
    constructor(storiesService: StoriesService);
    getStories(all?: string): Promise<{
        id: string;
        title: string;
        characters: {
            name: string;
            gender: string;
        }[];
        voiceMap: {};
        prompt: string;
        summary: string;
        age: import("@prisma/client/runtime/library").Decimal;
        featured: boolean;
        createdAt: Date;
        audioUrl: string;
        coverUrl: string;
        status: string;
        requesterName: string;
        requesterSource: string;
        requesterContact: string;
        interests: string;
        heroName: string;
        testGroup: string;
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
        age: import("@prisma/client/runtime/library").Decimal;
        createdAt: Date;
        audioUrl: string;
        coverUrl: string;
        status: string;
        requesterName: string;
        requesterSource: string;
        requesterContact: string;
        interests: string;
        heroName: string;
        featured: boolean;
        testGroup: string;
        scriptData: string | number | true | import("@prisma/client/runtime/library").JsonObject | import("@prisma/client/runtime/library").JsonArray;
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
    updateStatus(id: string, body: {
        status: string;
    }): Promise<{
        status: string;
        newStatus: string;
    }>;
    toggleFeatured(id: string, dto: ToggleFeaturedDto): Promise<{
        status: string;
        featured: boolean;
    }>;
    voiceSwap(id: string, dto: VoiceSwapDto): Promise<{
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
