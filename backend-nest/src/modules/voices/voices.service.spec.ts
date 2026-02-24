import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { VoicesService } from './voices.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

describe('VoicesService', () => {
  let service: VoicesService;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoicesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<VoicesService>(VoicesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSettingsForVoice', () => {
    it('should return voice settings when voice exists', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{
        stability: '0.35',
        similarity_boost: '0.75',
        style: '0.6',
        use_speaker_boost: false,
      }]);

      const result = await service.getSettingsForVoice('voice123');

      expect(result).toEqual({
        stability: 0.35,
        similarity_boost: 0.75,
        style: 0.6,
        use_speaker_boost: false,
      });
    });

    it('should convert numeric strings to numbers', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{
        stability: '0.5',
        similarity_boost: '0.9',
        style: '1.0',
        use_speaker_boost: true,
      }]);

      const result = await service.getSettingsForVoice('voice123');

      expect(typeof result.stability).toBe('number');
      expect(typeof result.similarity_boost).toBe('number');
      expect(typeof result.style).toBe('number');
      expect(result.stability).toBe(0.5);
      expect(result.similarity_boost).toBe(0.9);
      expect(result.style).toBe(1.0);
      expect(result.use_speaker_boost).toBe(true);
    });

    it('should return null when voice not found', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getSettingsForVoice('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getAll', () => {
    it('should return all voices with numeric conversions', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        {
          voice_id: 'v1', name: 'Daniel', category: 'narrator',
          description: 'neutral', stability: '0.35', similarity_boost: '0.75',
          style: '0.6', use_speaker_boost: false, traits: ['warm'], active: true,
        },
        {
          voice_id: 'v2', name: 'Max', category: 'child_m',
          description: 'eager', stability: '0.5', similarity_boost: '0.8',
          style: '0.9', use_speaker_boost: true, traits: ['mutig'], active: true,
        },
      ]);

      const result = await service.getAll();

      expect(result).toHaveLength(2);
      expect(result[0].stability).toBe(0.35);
      expect(result[0].similarity_boost).toBe(0.75);
      expect(result[0].style).toBe(0.6);
      expect(result[1].stability).toBe(0.5);
    });

    it('should return empty array when no voices', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      const result = await service.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('getOne', () => {
    it('should return a single voice', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([{
        voice_id: 'v1', name: 'Daniel', stability: '0.35',
        similarity_boost: '0.75', style: '0.6',
      }]);

      const result = await service.getOne('v1');

      expect(result.voice_id).toBe('v1');
      expect(result.stability).toBe(0.35);
    });

    it('should throw NotFoundException when voice not found', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([]);

      await expect(service.getOne('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getCategories', () => {
    it('should return distinct categories', async () => {
      mockPrismaService.$queryRaw.mockResolvedValue([
        { category: 'adult_f' },
        { category: 'child_m' },
        { category: 'narrator' },
      ]);

      const result = await service.getCategories();

      expect(result).toEqual(['adult_f', 'child_m', 'narrator']);
    });
  });
});
