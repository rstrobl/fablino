import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { BasicAuthGuard } from '../../guards/basic-auth.guard';
import * as fs from 'fs';
import * as path from 'path';

const PROMPT_PATH = path.join(__dirname, '../../../data/system-prompt.txt');

@Controller('api/settings')
export class SettingsController {
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
}
