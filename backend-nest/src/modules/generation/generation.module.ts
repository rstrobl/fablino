import { Module } from '@nestjs/common';
import { GenerationController } from './generation.controller';
import { StatusController } from './status.controller';
import { GenerationService } from './generation.service';
import { ClaudeService } from '../../services/claude.service';
import { TtsService } from '../../services/tts.service';
import { AudioMixService } from '../../services/audio.service';
import { AudioPipelineService } from '../../services/audio-pipeline.service';
import { ReplicateService } from '../../services/replicate.service';
import { CostTrackingService } from '../../services/cost-tracking.service';
import { VoicesModule } from '../voices/voices.module';

@Module({
  imports: [VoicesModule],
  controllers: [GenerationController, StatusController],
  providers: [
    GenerationService,
    ClaudeService,
    TtsService,
    AudioMixService,
    AudioPipelineService,
    ReplicateService,
    CostTrackingService,
  ],
  exports: [GenerationService],
})
export class GenerationModule {}
