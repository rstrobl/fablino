import { GenerationService, Job } from './generation.service';
export declare class StatusController {
    private readonly generationService;
    constructor(generationService: GenerationService);
    getJobStatus(id: string): Promise<Job | {
        status: 'not_found';
    }>;
}
