import { Controller, Get, Param } from '@nestjs/common';
import { GenerationService, Job } from './generation.service';

@Controller('api/status')
export class StatusController {
  constructor(private readonly generationService: GenerationService) {}

  @Get(':id')
  async getJobStatus(@Param('id') id: string): Promise<Job | { status: 'not_found' }> {
    return this.generationService.getJobStatus(id);
  }
}
