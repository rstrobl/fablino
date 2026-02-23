import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PlaysService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async recordPlay(storyId: string, userAgent?: string, ip?: string) {
    // Record the play
    const play = await this.prisma.play.create({
      data: {
        storyId,
        userAgent: userAgent || null,
        ip: ip || null,
      },
    });

    // Get story info for notification
    const story = await this.prisma.story.findUnique({
      where: { id: storyId },
      select: { title: true, id: true },
    });

    // Get total play count
    const totalPlays = await this.prisma.play.count({
      where: { storyId },
    });

    // Notify via Telegram
    await this.notifyPlay(story?.title || 'Unbekannt', storyId, totalPlays);

    return { ok: true, totalPlays };
  }

  async getPlays(storyId: string) {
    const plays = await this.prisma.play.findMany({
      where: { storyId },
      orderBy: { playedAt: 'desc' },
    });
    const count = plays.length;
    return { storyId, count, plays };
  }

  async getAllPlayStats() {
    const stats = await this.prisma.play.groupBy({
      by: ['storyId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    });
    return stats.map(s => ({ storyId: s.storyId, plays: s._count.id }));
  }

  private async notifyPlay(title: string, storyId: string, totalPlays: number) {
    try {
      const botToken = '7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus';
      const chatId = '5559274578';
      const text = `▶️ *Story abgespielt!*\n📖 ${title}\n🔢 Insgesamt: ${totalPlays}x\n🔗 https://fablino.de/story/${storyId}`;

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      console.error('Play notification error:', err);
    }
  }
}
