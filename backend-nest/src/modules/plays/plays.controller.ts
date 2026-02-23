import { Controller, Post, Get, Param, Req, UseGuards } from '@nestjs/common';
import { PlaysService } from './plays.service';
import { Request } from 'express';
import { BasicAuthGuard } from '../../guards/basic-auth.guard';

@Controller('api/plays')
export class PlaysController {
  constructor(private readonly playsService: PlaysService) {}

  @Post(':storyId')
  async recordPlay(@Param('storyId') storyId: string, @Req() req: Request) {
    const userAgent = req.headers['user-agent'];
    const ip = req.headers['x-forwarded-for'] as string || req.ip;
    return this.playsService.recordPlay(storyId, userAgent, ip);
  }

  @Get('stats')
  @UseGuards(BasicAuthGuard)
  async getAllStats() {
    return this.playsService.getAllPlayStats();
  }

  @Get(':storyId')
  @UseGuards(BasicAuthGuard)
  async getPlays(@Param('storyId') storyId: string) {
    return this.playsService.getPlays(storyId);
  }
}
