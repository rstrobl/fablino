import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { BasicAuthGuard } from '../../guards/basic-auth.guard';

@Module({
  controllers: [AdminController],
  providers: [AdminService, BasicAuthGuard],
  exports: [AdminService],
})
export class AdminModule {}