import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
export declare class AdminService {
    private prisma;
    constructor(prisma: PrismaService);
    renderStoriesPage(res: Response): Promise<void>;
    renderWaitlistPage(res: Response): Promise<void>;
    toggleFeatured(id: string): Promise<{
        success: boolean;
    }>;
    deleteStory(id: string): Promise<{
        success: boolean;
    }>;
    deleteWaitlist(id: string): Promise<{
        success: boolean;
    }>;
    private escapeHtml;
}
