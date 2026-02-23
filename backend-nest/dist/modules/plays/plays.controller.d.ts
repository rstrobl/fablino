import { PlaysService } from './plays.service';
import { Request } from 'express';
export declare class PlaysController {
    private readonly playsService;
    constructor(playsService: PlaysService);
    recordPlay(storyId: string, req: Request): Promise<{
        ok: boolean;
        totalPlays: number;
    }>;
    getAllStats(): Promise<{
        storyId: string;
        plays: number;
    }[]>;
    getPlays(storyId: string): Promise<{
        storyId: string;
        count: number;
        plays: {
            id: number;
            storyId: string;
            playedAt: Date;
            userAgent: string | null;
            ip: string | null;
        }[];
    }>;
}
