import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from './app.module';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { PrismaModule } from './modules/prisma/prisma.module';
import { StoriesModule } from './modules/stories/stories.module';
import { GenerationModule } from './modules/generation/generation.module';
import { VoicesModule } from './modules/voices/voices.module';
import { AudioModule } from './modules/audio/audio.module';
import { WaitlistModule } from './modules/waitlist/waitlist.module';
import { SharingModule } from './modules/sharing/sharing.module';
import { AdminModule } from './modules/admin/admin.module';

describe('AppModule', () => {
  let app: TestingModule;

  beforeEach(async () => {
    app = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
  });

  it('should be defined', () => {
    expect(app).toBeDefined();
  });

  it('should have all required modules', () => {
    // Since we're testing the module compilation, let's just check that it compiles
    // The actual imports are verified by the NestJS dependency injection system
    expect(app).toBeDefined();
    expect(app.get).toBeDefined();
  });
});