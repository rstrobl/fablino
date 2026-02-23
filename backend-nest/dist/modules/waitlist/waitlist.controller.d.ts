import { WaitlistService } from './waitlist.service';
import { CreateWaitlistDto } from '../../dto/waitlist.dto';
export declare class WaitlistController {
    private readonly waitlistService;
    constructor(waitlistService: WaitlistService);
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
    checkWaitlist(storyId: string): Promise<{
        registered: boolean;
    }>;
    deleteWaitlistEntry(id: string): Promise<{
        status: string;
    }>;
}
