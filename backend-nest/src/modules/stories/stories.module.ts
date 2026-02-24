import { Module } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { TtsService } from '../../services/tts.service';
import { AudioService } from '../../services/audio.service';
import { CostTrackingService } from '../../services/cost-tracking.service';
import { VoicesModule } from '../voices/voices.module';

@Module({
  imports: [VoicesModule],
  controllers: [StoriesController],
  providers: [StoriesService, TtsService, AudioService, CostTrackingService],
  exports: [StoriesService],
})
export class StoriesModule {}