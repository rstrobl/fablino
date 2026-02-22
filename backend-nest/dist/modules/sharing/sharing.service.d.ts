import { PrismaService } from '../prisma/prisma.service';
import { Response } from 'express';
export declare class SharingService {
    private prisma;
    constructor(prisma: PrismaService);
    serveOgPage(storyId: string, res: Response): Promise<void>;
    servePreviewPage(jobId: string, res: Response): void;
}
