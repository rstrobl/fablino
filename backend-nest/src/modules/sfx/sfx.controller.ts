import { Controller, Get, Post, Put, Delete, Param, Res, Body } from '@nestjs/common';
import { Response } from 'express';
import { SfxService } from './sfx.service';

@Controller('api/sfx')
export class SfxController {
  constructor(private sfxService: SfxService) {}

  @Get()
  async getAll() {
    return this.sfxService.getAll();
  }

  @Get(':id/audio')
  async getAudio(@Param('id') id: string, @Res() res: Response) {
    const audioBuffer = await this.sfxService.getAudioFile(id);
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'no-cache',
    });
    res.send(audioBuffer);
  }

  @Post(':id/replace')
  async replace(@Param('id') id: string, @Body() body: { prompt?: string; duration?: number } = {}) {
    return this.sfxService.replaceWithGenerated(id, body.prompt, body.duration);
  }

  @Post(':id/upload')
  async upload(@Param('id') id: string, @Res() res: Response) {
    const chunks: Buffer[] = [];
    const req = res.req;
    for await (const chunk of req) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);
    const entry = await this.sfxService.replaceWithUpload(id, buffer);
    res.json(entry);
  }

  @Post()
  async create(@Body() body: { id: string; name: string; category: string; prompt?: string; duration?: number }) {
    return this.sfxService.create(body.id, body.name, body.category, body.prompt, body.duration);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: Partial<{ name: string; category: string; active: boolean; prompt: string }>) {
    return this.sfxService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.sfxService.remove(id);
  }
}
