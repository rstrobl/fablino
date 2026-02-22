import { Module } from '@nestjs/common';
import { WaitlistController } from './waitlist.controller';
import { ReserveController } from './reserve.controller';
import { WaitlistService } from './waitlist.service';

@Module({
  controllers: [WaitlistController, ReserveController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}