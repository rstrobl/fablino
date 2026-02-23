import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/waitlist')
export class WaitlistNotifyController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async registerEmail(@Body() dto: { email: string; storyId?: string; heroName?: string; heroAge?: string; prompt?: string }) {
    // Update story with contact email if storyId provided
    if (dto.storyId) {
      await this.prisma.story.update({
        where: { id: dto.storyId },
        data: { requesterContact: dto.email },
      });
    }

    // Notify Robert via Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus';
    const chatId = process.env.TELEGRAM_CHAT_ID || '5559274578';
    const parts = ['📧 *E-Mail hinterlassen!*'];
    parts.push(`✉️ ${dto.email}`);
    if (dto.heroName) parts.push(`🦸 ${dto.heroName}${dto.heroAge ? ` (${dto.heroAge} J.)` : ''}`);
    if (dto.storyId) parts.push(`🔗 https://fablino.de/story/${dto.storyId}`);

    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: parts.join('\n'), parse_mode: 'Markdown' }),
    }).catch(() => {});

    return { ok: true, message: 'Super! Wir benachrichtigen dich, sobald dein Hörspiel fertig ist.' };
  }

  @Get(':storyId')
  async checkRegistration(@Param('storyId') storyId: string) {
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { requesterContact: true },
    });
    return { registered: !!story?.requesterContact };
  }
}
