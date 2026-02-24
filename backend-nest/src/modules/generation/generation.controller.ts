import { Controller, Post, Get, Param, Body, Query, Res, HttpException, HttpStatus, UseGuards } from '@nestjs/common';
import { GenerationService, Job } from './generation.service';
import { GenerateStoryDto, PreviewLineDto } from '../../dto/generation.dto';
import { BasicAuthGuard } from '../../guards/basic-auth.guard';
import { ReviewSuggestion } from '../../services/claude.service';
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

  @Post('replace-line')
  async replaceLine(@Body() body: { storyId: string; lineId: number; voiceId: string; text: string; voiceSettings?: any }) {
    return this.generationService.replaceLine(body);
  }

  @Get('status/:id')
  async getJobStatus(@Param('id') id: string): Promise<Job | { status: 'not_found' }> {
    return this.generationService.getJobStatus(id);
  }

  @Post(':id/review')
  @UseGuards(BasicAuthGuard)
  async reviewScript(@Param('id') id: string) {
    return this.generationService.reviewScript(id);
  }

  @Post(':id/apply-review')
  @UseGuards(BasicAuthGuard)
  async applyReview(@Param('id') id: string, @Body() body: { suggestions: ReviewSuggestion[] }) {
    return this.generationService.applyReviewSuggestions(id, body.suggestions);
  }
}