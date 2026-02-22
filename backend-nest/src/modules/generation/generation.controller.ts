import { Controller, Post, Get, Param, Body, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { GenerationService, Job } from './generation.service';
import { GenerateStoryDto, PreviewLineDto } from '../../dto/generation.dto';
import { Response } from 'express';

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

  @Post('preview-line')
  async previewLine(@Body() dto: PreviewLineDto, @Res() res: Response) {
    return this.generationService.previewLine(dto, res);
  }

  @Get('status/:id')
  async getJobStatus(@Param('id') id: string): Promise<Job | { status: 'not_found' }> {
    return this.generationService.getJobStatus(id);
  }
}