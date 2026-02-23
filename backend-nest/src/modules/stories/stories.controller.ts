import { Controller, Get, Delete, Patch, Param, Query, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { ToggleFeaturedDto, VoiceSwapDto } from '../../dto/stories.dto';

@Controller('api/stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Get()
  async getStories(@Query('all') all?: string) {
    const showAll = all === 'true';
    return this.storiesService.getStories(showAll);
  }

  @Get(':id')
  async getStory(@Param('id') id: string) {
    return this.storiesService.getStory(id);
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.storiesService.updateStatus(id, body.status);
  }

  @Patch(':id/featured')
  async toggleFeatured(@Param('id') id: string, @Body() dto: ToggleFeaturedDto) {
    return this.storiesService.toggleFeatured(id, dto.featured);
  }

  @Patch(':id/voice')
  async voiceSwap(@Param('id') id: string, @Body() dto: VoiceSwapDto) {
    return this.storiesService.voiceSwap(id, dto.character, dto.voiceId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStory(@Param('id') id: string) {
    return this.storiesService.deleteStory(id);
  }
}