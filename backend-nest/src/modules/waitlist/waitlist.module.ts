import { Module } from '@nestjs/common';
import { ReserveController } from './reserve.controller';
import { WaitlistNotifyController } from './waitlist-notify.controller';

@Module({
  controllers: [ReserveController, WaitlistNotifyController],
})
export class WaitlistModule {}
