import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaModule } from './modules/prisma/prisma.module';
import { StoriesModule } from './modules/stories/stories.module';
import { GenerationModule } from './modules/generation/generation.module';
import { VoicesModule } from './modules/voices/voices.module';
import { AudioModule } from './modules/audio/audio.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { SharingModule } from './modules/sharing/sharing.module';
import { AdminModule } from './modules/admin/admin.module';
import { PlaysModule } from './modules/plays/plays.module';
import { SettingsModule } from './modules/settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'covers'),
      serveRoot: '/covers',
    }),
    PrismaModule,
    StoriesModule,
    GenerationModule,
    VoicesModule,
    AudioModule,
    WaitlistModule,
    SharingModule,
    AdminModule,
    PlaysModule,
    SettingsModule,
  ],
})
export class AppModule {}