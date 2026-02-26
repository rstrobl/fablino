import { Controller, Post, Get, Param, Body, Query, Res, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { GenerationService, Job } from './generation.service';
import { GenerateStoryDto } from '../../dto/generation.dto';
import { BasicAuthGuard } from '../../guards/basic-auth.guard';

@Controller('api/generate')
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post()
  async generateStory(@Body() dto: GenerateStoryDto) {
    return this.generationService.generateStory(dto);
  }

  @Post(':id/confirm')
  async confirmScript(@Param('id') id: string) {
    return this.generationService.confirmScript(id);
  }

  @Get('status/:id')
  async getJobStatus(@Param('id') id: string): Promise<Job | { status: 'not_found' }> {
    return this.generationService.getJobStatus(id);
  }

  @Post(':id/regenerate')
  @UseGuards(BasicAuthGuard)
  async regenerateScript(@Param('id') id: string, @Body() body?: { prompt?: string; characters?: any }) {
    return this.generationService.regenerateScript(id, body?.prompt, body?.characters);
  }
}
