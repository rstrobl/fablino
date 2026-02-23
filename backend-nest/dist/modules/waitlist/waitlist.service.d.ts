import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWaitlistDto } from '../../dto/waitlist.dto';
export declare class WaitlistService {
    private prisma;
    private configService;
    constructor(prisma: PrismaService, configService: ConfigService);
    createWaitlistEntry(dto: CreateWaitlistDto): Promise<{
        ok: boolean;
        storyId: string;
        message: string;
    }>;
    getAllWaitlist(): Promise<{
        id: number;
        prompt: string | null;
        createdAt: Date;
        storyId: string | null;
        sideCharacters: import("@prisma/client/runtime/library").JsonValue | null;
        email: string;
        heroName: string | null;
        heroAge: string | null;
    }[]>;
    deleteWaitlistEntry(id: number): Promise<{
        status: string;
    }>;
    checkWaitlist(storyId: string): Promise<{
        registered: boolean;
    }>;
    private notifyTelegram;
    private createTrelloCard;
}
