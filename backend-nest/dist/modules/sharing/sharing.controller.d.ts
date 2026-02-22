import { SharingService } from './sharing.service';
import { Response } from 'express';
export declare class SharingController {
    private readonly sharingService;
    constructor(sharingService: SharingService);
    shareStory(id: string, res: Response): Promise<void>;
    ogStory(id: string, res: Response): Promise<void>;
    publicStoryPage(id: string, res: Response): Promise<void>;
    previewPage(jobId: string, res: Response): Promise<void>;
}
