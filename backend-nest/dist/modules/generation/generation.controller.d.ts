import { GenerationService, Job } from './generation.service';
import { GenerateStoryDto, PreviewLineDto } from '../../dto/generation.dto';
import { Response } from 'express';
export declare class GenerationController {
    private readonly generationService;
    constructor(generationService: GenerationService);
    generateStory(dto: GenerateStoryDto): Promise<{
        id: string;
        status: string;
    }>;
    confirmScript(id: string): Promise<{
        status: string;
    }>;
    previewLine(dto: PreviewLineDto, res: Response): Promise<void>;
    getJobStatus(id: string): Promise<Job | {
        status: 'not_found';
    }>;
}
