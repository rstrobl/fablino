import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { BasicAuthGuard } from '../../guards/basic-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const PROMPT_PATH = path.join(__dirname, '../../../data/system-prompt.txt');
const CLAUDE_SETTINGS_PATH = path.join(__dirname, '../../../data/claude-settings.json');

const DEFAULT_CLAUDE_SETTINGS = {
  model: 'claude-opus-4-20250514',
  max_tokens: 16000,
  temperature: 1.0,
  thinking_budget: 10000,
};

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

  @Get('claude')
  @UseGuards(BasicAuthGuard)
  getClaudeSettings() {
    try {
      const raw = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8');
      return { ...DEFAULT_CLAUDE_SETTINGS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_CLAUDE_SETTINGS };
    }
  }

  @Put('claude')
  @UseGuards(BasicAuthGuard)
  updateClaudeSettings(@Body() body: Record<string, any>) {
    const current = this.getClaudeSettings();
    const updated = { ...current, ...body };
    fs.mkdirSync(path.dirname(CLAUDE_SETTINGS_PATH), { recursive: true });
    fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(updated, null, 2));
    return { ok: true, settings: updated };
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
