import { Controller, Post, Get, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistDto } from '../../dto/waitlist.dto';
import { BasicAuthGuard } from '../../guards/basic-auth.guard';

@Controller('api/waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  async createWaitlistEntry(@Body() dto: CreateWaitlistDto) {
    return this.waitlistService.createWaitlistEntry(dto);
  }

  @Get()
  @UseGuards(BasicAuthGuard)
  async getAllWaitlist() {
    return this.waitlistService.getAllWaitlist();
  }

  @Get(':storyId/check')
  async checkWaitlist(@Param('storyId') storyId: string) {
    return this.waitlistService.checkWaitlist(storyId);
  }

  @Delete(':id')
  @UseGuards(BasicAuthGuard)
  async deleteWaitlistEntry(@Param('id') id: string) {
    return this.waitlistService.deleteWaitlistEntry(parseInt(id));
  }
}