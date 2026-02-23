import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWaitlistDto } from '../../dto/waitlist.dto';

@Injectable()
export class WaitlistService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async createWaitlistEntry(dto: CreateWaitlistDto) {
    const { email, heroName, heroAge, prompt, sideCharacters } = dto;

    if (!email || !email.includes('@')) {
      throw new HttpException('Bitte gib eine gültige Email-Adresse ein.', HttpStatus.BAD_REQUEST);
    }

    const storyId = dto.storyId;
    if (!storyId) {
      throw new HttpException('Story-ID fehlt.', HttpStatus.BAD_REQUEST);
    }

    try {
      const cleanEmail = email.toLowerCase().trim();

      // Check for duplicate email
      const existing = await this.prisma.waitlist.findFirst({
        where: {
          email: cleanEmail,
          storyId: storyId,
        },
      });

      if (existing) {
        return {
          ok: true,
          storyId,
          message: 'Du bist bereits vorgemerkt! Wir melden uns, sobald dein Hörspiel fertig ist.',
        };
      }

      // Insert waitlist entry
      await this.prisma.waitlist.create({
        data: {
          email: cleanEmail,
          heroName: heroName || null,
          heroAge: heroAge || null,
          prompt: prompt || null,
          sideCharacters: sideCharacters ? JSON.stringify(sideCharacters) : null,
          storyId: storyId,
        },
      });

      // Notify Robert via Telegram
      await this.notifyTelegram(cleanEmail, heroName, heroAge, prompt, storyId);

      // Create Trello card
      await this.createTrelloCard(cleanEmail, heroName, heroAge, prompt, storyId);

      return {
        ok: true,
        storyId,
        message: 'Du bist dabei! Wir melden uns per Email, sobald dein Hörspiel fertig gezaubert ist.',
      };
    } catch (err) {
      console.error('Waitlist error:', err);
      throw new HttpException(
        'Etwas ist schiefgelaufen. Bitte versuche es später noch mal.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllWaitlist() {
    return this.prisma.waitlist.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteWaitlistEntry(id: number) {
    await this.prisma.waitlist.delete({ where: { id } });
    return { status: 'ok' };
  }

  async checkWaitlist(storyId: string) {
    try {
      const waitlist = await this.prisma.waitlist.findFirst({
        where: { storyId },
        select: { email: true },
      });

      return { registered: !!waitlist };
    } catch (err) {
      return { registered: false };
    }
  }

  private async notifyTelegram(email: string, heroName?: string, heroAge?: string, prompt?: string, storyId?: string) {
    try {
      const botToken = '7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus';
      const chatId = '5559274578';
      const parts = [`📬 *Email eingetragen!*\n✉️ ${email}`];
      
      if (heroName) parts.push(`🦸 ${heroName}${heroAge ? ` (${heroAge} J.)` : ''}`);
      if (prompt) parts.push(`💬 „${prompt}"`);
      if (storyId) parts.push(`🔗 https://fablino.de/story/${storyId}`);

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: parts.join('\n'),
          parse_mode: 'Markdown',
        }),
      });
    } catch (err) {
      console.error('Telegram notification error:', err);
      // Don't throw - this is non-critical
    }
  }

  private async createTrelloCard(email: string, heroName?: string, heroAge?: string, prompt?: string, storyId?: string) {
    try {
      const trelloKey = this.configService.get<string>('TRELLO_API_KEY');
      const trelloToken = this.configService.get<string>('TRELLO_TOKEN');
      
      if (!trelloKey || !trelloToken) return;

      const trelloListNeu = '6998aebd8a96dd70e0c03438';
      const cardName = `${heroName || 'Unbekannt'}${heroAge ? ` (${heroAge} J.)` : ''} — ${email}`;
      const cardDesc = [
        `**Email:** ${email}`,
        heroName ? `**Held:** ${heroName}${heroAge ? ` (${heroAge} J.)` : ''}` : null,
        prompt ? `**Wunsch:** ${prompt}` : null,
        `\n🔗 **Story:** https://fablino.de/story/${storyId}`,
        `\n### Status`,
        `- [ ] Script generieren`,
        `- [ ] Audio generieren`,
        `- [ ] An Kunde senden`,
      ].filter(Boolean).join('\n');

      await fetch(`https://api.trello.com/1/cards?key=${trelloKey}&token=${trelloToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idList: trelloListNeu,
          name: cardName,
          desc: cardDesc,
        }),
      });
    } catch (err) {
      console.error('Trello card creation error:', err);
      // Don't throw - this is non-critical
    }
  }
}