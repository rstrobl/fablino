import { Controller, Get, Put, Param, Body, Post, Delete, Res } from '@nestjs/common';
import { Response } from 'express';
import { VoicesService } from './voices.service';

@Controller('api/voices')
export class VoicesController {
  constructor(private voicesService: VoicesService) {}

  @Get()
  async getAll() {
    return this.voicesService.getAll();
  }

  @Get(':voiceId')
  async getOne(@Param('voiceId') voiceId: string) {
    return this.voicesService.getOne(voiceId);
  }

  @Put(':voiceId')
  async update(@Param('voiceId') voiceId: string, @Body() body: any) {
    return this.voicesService.update(voiceId, body);
  }

  @Post()
  async create(@Body() body: any) {
    return this.voicesService.create(body);
  }

  @Delete(':voiceId')
  async remove(@Param('voiceId') voiceId: string) {
    return this.voicesService.remove(voiceId);
  }

  @Post(':voiceId/preview')
  async preview(
    @Param('voiceId') voiceId: string,
    @Body() body: { text: string },
    @Res() res: Response,
  ) {
    const audioBuffer = await this.voicesService.preview(voiceId, body.text);
    res.set({ 'Content-Type': 'audio/mpeg', 'Content-Length': audioBuffer.length });
    res.send(audioBuffer);
  }
}
