import { Module } from '@nestjs/common';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { CostTrackingService } from '../../services/cost-tracking.service';
import { ReplicateService } from '../../services/replicate.service';

@Module({
  controllers: [StoriesController],
  providers: [StoriesService, CostTrackingService, ReplicateService],
  exports: [StoriesService],
})
export class StoriesModule {}
