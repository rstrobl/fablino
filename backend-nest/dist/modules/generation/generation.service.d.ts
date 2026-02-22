import { PrismaService } from '../prisma/prisma.service';
import { ClaudeService, Script } from '../../services/claude.service';
import { TtsService } from '../../services/tts.service';
import { AudioService } from '../../services/audio.service';
import { ReplicateService } from '../../services/replicate.service';
import { GenerateStoryDto, PreviewLineDto } from '../../dto/generation.dto';
import { Response } from 'express';
export interface Job {
    status: 'waiting_for_script' | 'preview' | 'generating_audio' | 'done' | 'error';
    progress?: string;
    title?: string;
    script?: Script;
    voiceMap?: {
        [name: string]: string;
    };
    prompt?: string;
    ageGroup?: string;
    systemPrompt?: string;
    error?: string;
    completedAt?: number;
    startedAt?: number;
    story?: any;
}
export declare class GenerationService {
    private prisma;
    private claudeService;
    private ttsService;
    private audioService;
    private replicateService;
    private readonly AUDIO_DIR;
    private readonly COVERS_DIR;
    private readonly jobs;
    constructor(prisma: PrismaService, claudeService: ClaudeService, ttsService: TtsService, audioService: AudioService, replicateService: ReplicateService);
    generateStory(dto: GenerateStoryDto): Promise<{
        id: string;
        status: string;
    }>;
    private generateScriptAsync;
    confirmScript(id: string): Promise<{
        status: string;
    }>;
    private generateAudioAsync;
    private insertStory;
    previewLine(dto: PreviewLineDto, res: Response): Promise<void>;
    getJobStatus(id: string): Job | {
        status: 'not_found';
    };
}
