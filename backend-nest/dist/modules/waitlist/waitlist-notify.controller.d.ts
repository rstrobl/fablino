import { PrismaService } from '../prisma/prisma.service';
export declare class WaitlistNotifyController {
    private readonly prisma;
    constructor(prisma: PrismaService);
    registerEmail(dto: {
        email: string;
        storyId?: string;
        heroName?: string;
        heroAge?: string;
        prompt?: string;
    }): Promise<{
        ok: boolean;
        message: string;
    }>;
    checkRegistration(storyId: string): Promise<{
        registered: boolean;
    }>;
}
