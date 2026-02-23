import { Module } from '@nestjs/common';
import { PlaysController } from './plays.controller';
import { PlaysService } from './plays.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PlaysController],
  providers: [PlaysService],
})
export class PlaysModule {}
