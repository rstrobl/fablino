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
    const title = dto.heroName ? `${dto.heroName}s Hörspiel` : 'Neues Hörspiel';
    const age = dto.heroAge ? parseFloat(dto.heroAge.replace(',', '.')) || null : null;
    await this.prisma.story.create({
      data: {
        id,
        title,
        heroName: dto.heroName || null,
        prompt: dto.prompt || null,
        age,
        interests: dto.prompt || null,
        status: 'draft',
      },
    });

    return { ok: true, storyId: id };
  }
}
