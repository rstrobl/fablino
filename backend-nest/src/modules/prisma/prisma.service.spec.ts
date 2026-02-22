import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

// Mock PrismaClient with a function
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
  })),
}));

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should extend PrismaClient', () => {
    expect(service).toBeDefined();
    expect(service.$connect).toBeDefined();
    expect(service.onModuleInit).toBeDefined();
  });

  it('should call $connect on module init', async () => {
    const connectSpy = jest.spyOn(service, '$connect');
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalled();
  });

  it('should handle connection errors gracefully', async () => {
    jest.spyOn(service, '$connect').mockRejectedValueOnce(new Error('Connection failed'));
    
    await expect(service.onModuleInit()).rejects.toThrow('Connection failed');
  });
});