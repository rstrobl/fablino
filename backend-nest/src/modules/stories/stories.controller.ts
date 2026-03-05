import { Controller, Get, Post, Delete, Patch, Param, Query, Body, HttpCode, HttpStatus, NotFoundException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { StoriesService } from './stories.service';
import { ToggleFeaturedDto } from '../../dto/stories.dto';
import { CostTrackingService } from '../../services/cost-tracking.service';
import { ReplicateService } from '../../services/replicate.service';
import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';

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

  @Patch(':id/reset-script')
  async resetScript(@Param('id') id: string) {
    return this.storiesService.resetScript(id);
  }

  @Patch(':id/confirm-script')
  async confirmScript(@Param('id') id: string) {
    return this.storiesService.setScriptConfirmed(id, true);
  }

  @Patch(':id/unconfirm-script')
  async unconfirmScript(@Param('id') id: string) {
    return this.storiesService.setScriptConfirmed(id, false);
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

  @Post(':id/upload-cover')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCover(@Param('id') id: string, @UploadedFile() file: any) {
    const story = await this.storiesService.getStory(id);
    if (!story) throw new NotFoundException('Story not found');
    if (!file) throw new NotFoundException('No file uploaded');

    const ext = file.originalname?.split('.').pop() || 'jpg';
    const coverFilename = `${id}.${ext}`;
    const coverPath = path.join(this.COVERS_DIR, coverFilename);

    // Save original
    fs.mkdirSync(this.COVERS_DIR, { recursive: true });
    fs.writeFileSync(coverPath, file.buffer);

    // Generate OG thumbnail (600x600)
    try {
      const ogDir = path.join(this.COVERS_DIR, 'og');
      fs.mkdirSync(ogDir, { recursive: true });
      execSync(`convert "${coverPath}" -resize 600x600 -quality 80 "${path.join(ogDir, `${id}_og.jpg`)}"`);
    } catch (e) { console.error('OG thumb error:', e.message); }

    // Generate list thumbnail (300x300)
    try {
      const thumbDir = path.join(this.COVERS_DIR, 'thumb');
      fs.mkdirSync(thumbDir, { recursive: true });
      execSync(`convert "${coverPath}" -resize 300x300 -quality 80 "${path.join(thumbDir, coverFilename)}"`);
    } catch (e) { console.error('Thumb error:', e.message); }

    // Copy to public dir
    try {
      const pubDir = path.resolve('./public/covers');
      fs.mkdirSync(pubDir, { recursive: true });
      fs.mkdirSync(path.join(pubDir, 'thumb'), { recursive: true });
      fs.copyFileSync(coverPath, path.join(pubDir, coverFilename));
      const thumbSrc = path.join(this.COVERS_DIR, 'thumb', coverFilename);
      if (fs.existsSync(thumbSrc)) fs.copyFileSync(thumbSrc, path.join(pubDir, 'thumb', coverFilename));
    } catch (e) { console.error('Public copy error:', e.message); }

    const coverUrl = `/covers/${coverFilename}?v=${Date.now()}`;
    await this.storiesService.updateCoverUrl(id, coverUrl);

    return { coverUrl };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteStory(@Param('id') id: string) {
    return this.storiesService.deleteStory(id);
  }
}