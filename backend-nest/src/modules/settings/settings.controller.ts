import { Controller, Get, Put, Body, Param, UseGuards } from '@nestjs/common';
import { BasicAuthGuard } from '../../guards/basic-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../../../data');
const PROMPT_PATH = path.join(DATA_DIR, 'system-prompt.txt');
const SFX_PROMPT_PATH = path.join(DATA_DIR, 'sfx-prompt.txt');
const CLAUDE_SETTINGS_PATH = path.join(DATA_DIR, 'claude-settings.json');

const AGENT_FILES: Record<string, string> = {
  author: path.join(DATA_DIR, 'agent-author.txt'),
  reviewer: path.join(DATA_DIR, 'agent-reviewer.txt'),
  tts: path.join(DATA_DIR, 'agent-tts.txt'),
};

const DEFAULT_CLAUDE_SETTINGS = {
  model: 'claude-opus-4-20250514',
  reviewerModel: 'claude-sonnet-4-20250514',
  ttsModel: 'claude-sonnet-4-20250514',
  max_tokens: 16000,
  temperature: 1.0,
  thinking_budget: 10000,
  sfxEnabled: false,
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

  @Get('sfx-prompt')
  @UseGuards(BasicAuthGuard)
  getSfxPrompt() {
    try { return { prompt: fs.readFileSync(SFX_PROMPT_PATH, 'utf-8') }; }
    catch { return { prompt: '' }; }
  }

  @Put('sfx-prompt')
  @UseGuards(BasicAuthGuard)
  updateSfxPrompt(@Body() body: { prompt: string }) {
    fs.writeFileSync(SFX_PROMPT_PATH, body.prompt, 'utf-8');
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

  @Get('agent/:name')
  @UseGuards(BasicAuthGuard)
  getAgentPrompt(@Param('name') name: string) {
    const filePath = AGENT_FILES[name];
    if (!filePath) return { error: 'Unknown agent' };
    try { return { prompt: fs.readFileSync(filePath, 'utf-8') }; }
    catch { return { prompt: '' }; }
  }

  @Put('agent/:name')
  @UseGuards(BasicAuthGuard)
  updateAgentPrompt(@Body() body: { prompt: string }, @Param('name') name: string) {
    const filePath = AGENT_FILES[name];
    if (!filePath) return { error: 'Unknown agent' };
    fs.writeFileSync(filePath, body.prompt, 'utf-8');
    return { ok: true };
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
