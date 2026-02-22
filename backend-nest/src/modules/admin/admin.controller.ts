import { Controller, Get, Post, Delete, Param, UseGuards, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
import { BasicAuthGuard } from '../../guards/basic-auth.guard';
import { Response } from 'express';

@Controller('admin')
@UseGuards(BasicAuthGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get()
  redirect(@Res() res: Response) {
    res.redirect('/admin/stories');
  }

  @Get('stories')
  async storiesPage(@Res() res: Response) {
    return this.adminService.renderStoriesPage(res);
  }

  @Post('stories/:id/toggle-featured')
  async toggleFeatured(@Param('id') id: string) {
    return this.adminService.toggleFeatured(id);
  }

  @Delete('stories/:id')
  @HttpCode(HttpStatus.OK)
  async deleteStory(@Param('id') id: string) {
    return this.adminService.deleteStory(id);
  }

  @Get('waitlist')
  async waitlistPage(@Res() res: Response) {
    return this.adminService.renderWaitlistPage(res);
  }

  @Delete('waitlist/:id')
  @HttpCode(HttpStatus.OK)
  async deleteWaitlist(@Param('id') id: string) {
    return this.adminService.deleteWaitlist(id);
  }
}