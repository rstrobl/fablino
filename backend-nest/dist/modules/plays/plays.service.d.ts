import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class PlaysService {
    private prisma;
    private configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    recordPlay(storyId: string, userAgent?: string, ip?: string): Promise<{
        ok: boolean;
        totalPlays: number;
    }>;
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
    getAllPlayStats(): Promise<{
        storyId: string;
        plays: number;
    }[]>;
    private notifyPlay;
}
