import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistDto } from '../../dto/waitlist.dto';

@Controller(['api/waitlist', 'api/reserve'])
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  async createWaitlistEntry(@Body() dto: CreateWaitlistDto) {
    return this.waitlistService.createWaitlistEntry(dto);
  }

  @Get(':storyId/check')
  async checkWaitlist(@Param('storyId') storyId: string) {
    return this.waitlistService.checkWaitlist(storyId);
  }
}