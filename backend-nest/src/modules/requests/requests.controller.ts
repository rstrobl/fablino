import { Controller, Get, Post, Delete, Patch, Body, Param } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Controller('api/requests')
export class RequestsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list() {
    return this.prisma.request.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.request.findUniqueOrThrow({ where: { id } });
  }

  @Post()
  async create(@Body() body: {
    heroName?: string;
    age?: number;
    prompt?: string;
    interests?: string;
    requesterName?: string;
    requesterSource?: string;
    requesterContact?: string;
  }) {
    const id = randomUUID();
    const request = await this.prisma.request.create({
      data: {
        id,
        heroName: body.heroName || null,
        age: body.age ? parseFloat(String(body.age)) : null,
        prompt: body.prompt || null,
        interests: body.interests || body.prompt || null,
        requesterName: body.requesterName || null,
        requesterSource: body.requesterSource || null,
        requesterContact: body.requesterContact || null,
      },
    });

    // Notify Robert via Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN || '7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus';
    const chatId = process.env.TELEGRAM_CHAT_ID || '5559274578';
    const parts = ['✨ *Neue Hörspiel-Anfrage!*'];
    if (body.requesterName) parts.push(`👤 ${body.requesterName}`);
    if (body.heroName) parts.push(`🦸 ${body.heroName}${body.age ? ` (${body.age} J.)` : ''}`);
    if (body.prompt) parts.push(`💬 „${body.prompt}"`);

    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: parts.join('\n'), parse_mode: 'Markdown' }),
    }).catch(() => {});

    return { ok: true, id };
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Partial<{
    heroName: string;
    age: number;
    prompt: string;
    interests: string;
    requesterName: string;
    requesterSource: string;
    requesterContact: string;
    status: string;
    storyId: string;
  }>) {
    return this.prisma.request.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date(),
      },
    });
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.prisma.request.delete({ where: { id } });
    return { ok: true };
  }
}
