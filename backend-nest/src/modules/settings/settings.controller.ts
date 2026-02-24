import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { BasicAuthGuard } from '../../guards/basic-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const PROMPT_PATH = path.join(__dirname, '../../../data/system-prompt.txt');

@Controller('api/settings')
export class SettingsController {
  constructor(private prisma: PrismaService) {}

  @Get('system-prompt')
  @UseGuards(BasicAuthGuard)
  getSystemPrompt() {
    const prompt = fs.readFileSync(PROMPT_PATH, 'utf-8');
    return { prompt };
  }

  @Put('system-prompt')
  @UseGuards(BasicAuthGuard)
  updateSystemPrompt(@Body() body: { prompt: string }) {
    fs.writeFileSync(PROMPT_PATH, body.prompt, 'utf-8');
    return { ok: true };
  }

  @Get('audio')
  @UseGuards(BasicAuthGuard)
  async getAudioSettings() {
    const rows = await this.prisma.$queryRaw`SELECT key, value FROM audio_settings` as any[];
    const settings: Record<string, number> = {};
    rows.forEach(r => { settings[r.key] = Number(r.value); });
    return settings;
  }

  @Put('audio')
  @UseGuards(BasicAuthGuard)
  async updateAudioSettings(@Body() body: Record<string, number>) {
    for (const [key, value] of Object.entries(body)) {
      await this.prisma.$executeRaw`
        INSERT INTO audio_settings (key, value) VALUES (${key}, ${value})
        ON CONFLICT (key) DO UPDATE SET value = ${value}
      `;
    }
    return { ok: true };
  }
}
