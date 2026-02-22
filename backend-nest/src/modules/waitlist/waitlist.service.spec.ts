import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpException } from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWaitlistDto } from '../../dto/waitlist.dto';

// Mock global fetch
global.fetch = jest.fn();

describe('WaitlistService', () => {
  let service: WaitlistService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    waitlist: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WaitlistService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<WaitlistService>(WaitlistService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === 'TRELLO_API_KEY') return 'test-trello-key';
      if (key === 'TRELLO_TOKEN') return 'test-trello-token';
      return undefined;
    });
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: () => ({}) });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWaitlistEntry', () => {
    const validDto: CreateWaitlistDto = {
      email: 'test@example.com',
      heroName: 'Max',
      heroAge: '7',
      prompt: 'Adventure story',
      storyId: 'story123',
    };

    it('should create waitlist entry successfully', async () => {
      mockPrismaService.waitlist.findFirst.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue({});

      const result = await service.createWaitlistEntry(validDto);

      expect(result).toEqual({
        ok: true,
        storyId: 'story123',
        message: 'Du bist dabei! Wir melden uns per Email, sobald dein Hörspiel fertig gezaubert ist.',
      });

      expect(prismaService.waitlist.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          heroName: 'Max',
          heroAge: '7',
          prompt: 'Adventure story',
          sideCharacters: null,
          storyId: 'story123',
        },
      });
    });

    it('should throw error for invalid email', async () => {
      const invalidDto = { ...validDto, email: 'invalid-email' };

      await expect(service.createWaitlistEntry(invalidDto)).rejects.toThrow(HttpException);
      await expect(service.createWaitlistEntry(invalidDto)).rejects.toThrow('Bitte gib eine gültige Email-Adresse ein.');
    });

    it('should throw error for missing storyId', async () => {
      const invalidDto = { ...validDto, storyId: undefined };

      await expect(service.createWaitlistEntry(invalidDto as any)).rejects.toThrow(HttpException);
      await expect(service.createWaitlistEntry(invalidDto as any)).rejects.toThrow('Story-ID fehlt.');
    });

    it('should handle duplicate email', async () => {
      mockPrismaService.waitlist.findFirst.mockResolvedValue({ id: '1', email: 'test@example.com' });

      const result = await service.createWaitlistEntry(validDto);

      expect(result).toEqual({
        ok: true,
        storyId: 'story123',
        message: 'Du bist bereits vorgemerkt! Wir melden uns, sobald dein Hörspiel fertig ist.',
      });

      expect(prismaService.waitlist.create).not.toHaveBeenCalled();
    });

    it('should normalize email to lowercase and trim', async () => {
      const dtoWithMessyEmail = { ...validDto, email: '  TEST@EXAMPLE.COM  ' };
      mockPrismaService.waitlist.findFirst.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue({});

      await service.createWaitlistEntry(dtoWithMessyEmail);

      expect(prismaService.waitlist.findFirst).toHaveBeenCalledWith({
        where: {
          email: 'test@example.com',
          storyId: 'story123',
        },
      });

      expect(prismaService.waitlist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: 'test@example.com',
        }),
      });
    });

    it('should handle side characters JSON serialization', async () => {
      const dtoWithSideCharacters = {
        ...validDto,
        sideCharacters: [{ name: 'Dragon', role: 'friend' }],
      };
      mockPrismaService.waitlist.findFirst.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue({});

      await service.createWaitlistEntry(dtoWithSideCharacters);

      expect(prismaService.waitlist.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sideCharacters: JSON.stringify([{ name: 'Dragon', role: 'friend' }]),
        }),
      });
    });

    it('should notify Telegram successfully', async () => {
      mockPrismaService.waitlist.findFirst.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue({});

      await service.createWaitlistEntry(validDto);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bot7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus/sendMessage',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('test@example.com'),
        })
      );
    });

    it('should create Trello card when configured', async () => {
      mockPrismaService.waitlist.findFirst.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue({});

      await service.createWaitlistEntry(validDto);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.trello.com/1/cards?key=test-trello-key&token=test-trello-token',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('Max (7 J.) — test@example.com'),
        })
      );
    });

    it('should skip Trello card creation when not configured', async () => {
      mockConfigService.get.mockReturnValue(null);
      mockPrismaService.waitlist.findFirst.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue({});

      await service.createWaitlistEntry(validDto);

      // Should only have Telegram call, not Trello call
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toContain('telegram');
    });

    it('should handle Telegram notification errors gracefully', async () => {
      mockPrismaService.waitlist.findFirst.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue({});
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Telegram error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.createWaitlistEntry(validDto);

      expect(result.ok).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Telegram notification error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should handle Trello card creation errors gracefully', async () => {
      mockPrismaService.waitlist.findFirst.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue({});
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // Telegram success
        .mockRejectedValueOnce(new Error('Trello error')); // Trello error

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.createWaitlistEntry(validDto);

      expect(result.ok).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Trello card creation error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should handle database errors', async () => {
      mockPrismaService.waitlist.findFirst.mockRejectedValue(new Error('DB error'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await expect(service.createWaitlistEntry(validDto)).rejects.toThrow(HttpException);
      expect(consoleErrorSpy).toHaveBeenCalledWith('Waitlist error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should handle missing optional fields', async () => {
      const minimalDto: CreateWaitlistDto = {
        email: 'test@example.com',
        storyId: 'story123',
      };
      mockPrismaService.waitlist.findFirst.mockResolvedValue(null);
      mockPrismaService.waitlist.create.mockResolvedValue({});

      const result = await service.createWaitlistEntry(minimalDto);

      expect(result.ok).toBe(true);
      expect(prismaService.waitlist.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          heroName: null,
          heroAge: null,
          prompt: null,
          sideCharacters: null,
          storyId: 'story123',
        },
      });
    });
  });

  describe('checkWaitlist', () => {
    it('should return true when story is registered', async () => {
      mockPrismaService.waitlist.findFirst.mockResolvedValue({ email: 'test@example.com' });

      const result = await service.checkWaitlist('story123');

      expect(result).toEqual({ registered: true });
      expect(prismaService.waitlist.findFirst).toHaveBeenCalledWith({
        where: { storyId: 'story123' },
        select: { email: true },
      });
    });

    it('should return false when story is not registered', async () => {
      mockPrismaService.waitlist.findFirst.mockResolvedValue(null);

      const result = await service.checkWaitlist('story123');

      expect(result).toEqual({ registered: false });
    });

    it('should return false on database errors', async () => {
      mockPrismaService.waitlist.findFirst.mockRejectedValue(new Error('DB error'));

      const result = await service.checkWaitlist('story123');

      expect(result).toEqual({ registered: false });
    });

    it('should handle various story IDs', async () => {
      const testIds = ['story1', 'story-123', 'very-long-id', ''];

      for (const storyId of testIds) {
        mockPrismaService.waitlist.findFirst.mockResolvedValue(null);
        
        const result = await service.checkWaitlist(storyId);
        
        expect(result).toEqual({ registered: false });
        expect(prismaService.waitlist.findFirst).toHaveBeenCalledWith({
          where: { storyId },
          select: { email: true },
        });
      }
    });
  });
});