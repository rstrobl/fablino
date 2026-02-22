import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import * as cors from 'cors';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS
  app.use(cors());
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  // Static file serving
  app.useStaticAssets(join(process.cwd(), 'covers'), {
    prefix: '/covers',
    maxAge: '7d'
  });
  
  // Serve OG images with specific path
  app.useStaticAssets(join(process.cwd(), 'covers', 'og'), {
    prefix: '/covers/og',
    maxAge: '7d'
  });

  // Audio serving from parent directory
  app.useStaticAssets(join(process.cwd(), '..', 'audio'), {
    prefix: '/audio-files'
  });

  // Bind to specific IP and port to match original backend
  await app.listen(3001, '127.0.0.1');
  console.log('🎧 Fablino Backend (NestJS) on 127.0.0.1:3001');
}
bootstrap();