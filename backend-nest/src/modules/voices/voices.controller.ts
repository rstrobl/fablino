import { Controller, Get } from '@nestjs/common';
import { VoicesService } from './voices.service';

@Controller('api/voices')
export class VoicesController {
  constructor(private readonly voicesService: VoicesService) {}

  @Get()
  getVoices() {
    return this.voicesService.getVoices();
  }
}