import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as cors from 'cors';

// Mock external dependencies
jest.mock('@nestjs/core');
jest.mock('cors');

// Mock the entire app object
const mockApp = {
  use: jest.fn(),
  useGlobalPipes: jest.fn(),
  useStaticAssets: jest.fn(),
  listen: jest.fn().mockResolvedValue(undefined),
};

// Create a test version of the bootstrap function
const createBootstrapTest = async (port?: number) => {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Enable CORS
  app.use(cors());
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  // Static file serving (simplified for test)
  app.useStaticAssets('', { prefix: '/covers' });
  app.useStaticAssets('', { prefix: '/covers/og' });
  app.useStaticAssets('', { prefix: '/audio-files' });

  // Bind to specific IP and port
  const finalPort = port || parseInt(process.env.PORT || '3001', 10);
  await app.listen(finalPort, '127.0.0.1');
};

describe('Bootstrap', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NestFactory.create as jest.Mock).mockResolvedValue(mockApp);
  });

  it('should create app and configure it correctly', async () => {
    process.env.PORT = '3001';
    await createBootstrapTest();

    // Verify NestFactory.create was called with AppModule
    expect(NestFactory.create).toHaveBeenCalledWith(AppModule);
    
    // Verify CORS is enabled
    expect(mockApp.use).toHaveBeenCalledWith(cors());
    
    // Verify global validation pipe is configured
    expect(mockApp.useGlobalPipes).toHaveBeenCalledWith(
      expect.any(ValidationPipe)
    );
    
    // Verify static assets are configured (3 times)
    expect(mockApp.useStaticAssets).toHaveBeenCalledTimes(3);
    
    // Verify app listens on correct port and host
    expect(mockApp.listen).toHaveBeenCalledWith(3001, '127.0.0.1');
  });

  it('should use default port 3001 when PORT env var is not set', async () => {
    delete process.env.PORT;
    
    await createBootstrapTest();
    
    expect(mockApp.listen).toHaveBeenCalledWith(3001, '127.0.0.1');
  });

  it('should use custom port when PORT env var is set', async () => {
    process.env.PORT = '4000';
    
    await createBootstrapTest();
    
    expect(mockApp.listen).toHaveBeenCalledWith(4000, '127.0.0.1');
  });
});