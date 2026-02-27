import { Module } from '@nestjs/common';
import { WaitlistNotifyController } from './waitlist-notify.controller';

@Module({
  controllers: [WaitlistNotifyController],
})
export class WaitlistModule {}
