import { Controller, Post, Body } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReserveDto } from '../../dto/reserve.dto';
import { randomUUID } from 'crypto';

@Controller('api/reserve')
export class ReserveController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async reserve(@Body() dto: ReserveDto) {
    const id = randomUUID();
    const title = dto.heroName ? `${dto.heroName}s Hörspiel` : 'Dein Hörspiel';
    const age = dto.heroAge ? parseFloat(dto.heroAge.replace(',', '.')) || null : null;
    await this.prisma.story.create({
      data: {
        id,
        title,
        heroName: dto.heroName || null,
        prompt: dto.prompt || null,
        age,
        interests: dto.prompt || null,
        status: 'requested',
      },
    });

    // Notify Robert via Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus';
    const chatId = process.env.TELEGRAM_CHAT_ID || '5559274578';
    const parts = ['✨ *Neuer Hörspiel-Wunsch!*'];
    if (dto.heroName) parts.push(`🦸 ${dto.heroName}${dto.heroAge ? ` (${dto.heroAge} J.)` : ''}`);
    if (dto.prompt) parts.push(`💬 „${dto.prompt}"`);
    parts.push(`🔗 https://fablino.de/story/${id}`);

    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: parts.join('\n'), parse_mode: 'Markdown' }),
    }).catch(() => {});

    return { ok: true, storyId: id };
  }
}
