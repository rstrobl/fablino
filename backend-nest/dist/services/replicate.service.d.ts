import { ConfigService } from '@nestjs/config';
import { Character } from './claude.service';
export declare class ReplicateService {
    private configService;
    constructor(configService: ConfigService);
    generateCover(title: string, summary: string, characters: Character[], storyId: string, coversDir: string): Promise<string | null>;
}
