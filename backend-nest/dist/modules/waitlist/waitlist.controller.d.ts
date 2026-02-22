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
    checkWaitlist(storyId: string): Promise<{
        registered: boolean;
    }>;
}
