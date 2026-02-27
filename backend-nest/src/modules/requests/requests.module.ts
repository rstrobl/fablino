import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [RequestsController],
})
export class RequestsModule {}
