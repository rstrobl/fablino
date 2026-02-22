import { AdminService } from './admin.service';
import { Response } from 'express';
export declare class AdminController {
    private readonly adminService;
    constructor(adminService: AdminService);
    redirect(res: Response): void;
    storiesPage(res: Response): Promise<void>;
    toggleFeatured(id: string): Promise<{
        success: boolean;
    }>;
    deleteStory(id: string): Promise<{
        success: boolean;
    }>;
    waitlistPage(res: Response): Promise<void>;
    deleteWaitlist(id: string): Promise<{
        success: boolean;
    }>;
}
