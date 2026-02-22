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
    checkWaitlist(storyId: string): Promise<{
        registered: boolean;
    }>;
    private notifyTelegram;
    private createTrelloCard;
}
