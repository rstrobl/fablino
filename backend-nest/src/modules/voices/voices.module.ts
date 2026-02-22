import { Module } from '@nestjs/common';
import { VoicesController } from './voices.controller';
import { VoicesService } from './voices.service';
import { TtsService } from '../../services/tts.service';

@Module({
  controllers: [VoicesController],
  providers: [VoicesService, TtsService],
  exports: [VoicesService],
})
export class VoicesModule {}