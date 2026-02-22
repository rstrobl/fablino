import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import { SharingService } from './sharing.service';
import { Response } from 'express';

@Controller()
export class SharingController {
  constructor(private readonly sharingService: SharingService) {}

  @Get('share/:id')
  async shareStory(@Param('id') id: string, @Res() res: Response) {
    return this.sharingService.serveOgPage(id, res);
  }

  @Get('og/story/:id')
  async ogStory(@Param('id') id: string, @Res() res: Response) {
    return this.sharingService.serveOgPage(id, res);
  }

  @Get('story/:id')
  async publicStoryPage(@Param('id') id: string, @Res() res: Response) {
    return this.sharingService.serveOgPage(id, res);
  }

  @Get('preview/:jobId')
  async previewPage(@Param('jobId') jobId: string, @Res() res: Response) {
    return this.sharingService.servePreviewPage(jobId, res);
  }
}