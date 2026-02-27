import { Controller, Get, Post, Delete, Patch, Param, Query, Body, HttpCode, HttpStatus, NotFoundException } from '@nestjs/common';
import { StoriesService } from './stories.service';
import { ToggleFeaturedDto } from '../../dto/stories.dto';
import { CostTrackingService } from '../../services/cost-tracking.service';
import { ReplicateService } from '../../services/replicate.service';
import * as path from 'path';

@Controller('api/stories')
export class StoriesController {
  private readonly COVERS_DIR = path.resolve('./covers');

  constructor(
    private readonly storiesService: StoriesService,
    private readonly costTracking: CostTrackingService,
    private readonly replicateService: ReplicateService,
  ) {}

  @Post()
  async createStory(@Body() body: { title?: string; heroName?: string; age?: number; prompt?: string }) {
    return this.storiesService.createStory(body);
  }

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

  @Patch(':id/voice-map')
  async updateVoiceMap(@Param('id') id: string, @Body() body: { voiceMap: Record<string, string> }) {
    return this.storiesService.updateVoiceMap(id, body.voiceMap);
  }

  @Get(':id/costs')
  async getStoryCosts(@Param('id') id: string) {
    return this.costTracking.getStoryCosts(id);
  }

  @Post(':id/generate-cover')
  async generateCover(@Param('id') id: string) {
    const story = await this.storiesService.getStory(id);
    if (!story) throw new NotFoundException('Story not found');
    const scriptData = (story as any).scriptData;
    const script = scriptData?.script;
    if (!script) return { error: 'No script found' };

    const coverUrl = await this.replicateService.generateCover(
      script.title || story.title || 'Story',
      script.summary || story.summary || '',
      script.characters || [],
      id,
      this.COVERS_DIR,
    );

    if (coverUrl) {
      await this.storiesService.updateCoverUrl(id, coverUrl);
      await this.costTracking.trackReplicate(id, 'cover', 1).catch(() => {});
    }

    return { coverUrl };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStory(@Param('id') id: string) {
    return this.storiesService.deleteStory(id);
  }
}