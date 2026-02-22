import { Injectable } from '@nestjs/common';
import { TtsService } from '../../services/tts.service';

@Injectable()
export class VoicesService {
  constructor(private ttsService: TtsService) {}

  getVoices() {
    return this.ttsService.getVoiceDirectory();
  }
}