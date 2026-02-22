import { Test, TestingModule } from '@nestjs/testing';
import { ReserveController } from './reserve.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ReserveDto } from '../../dto/reserve.dto';

// Mock crypto
jest.mock('crypto', () => ({
  ...jest.requireActual('crypto'),
  randomUUID: jest.fn(() => 'test-uuid-123'),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('ReserveController', () => {
  let controller: ReserveController;
  let prismaService: PrismaService;

  const mockPrismaService = {
    story: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReserveController],
      providers: [
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<ReserveController>(ReserveController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrismaService.story.create.mockResolvedValue({});
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });
    
    // Mock environment variables
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('reserve', () => {
    it('should create story reservation with hero name', async () => {
      const dto: ReserveDto = {
        heroName: 'Max',
        heroAge: '7',
        prompt: 'A magical adventure',
      };

      const result = await controller.reserve(dto);

      expect(result).toEqual({
        ok: true,
        storyId: 'test-uuid-123',
      });

      expect(prismaService.story.create).toHaveBeenCalledWith({
        data: {
          id: 'test-uuid-123',
          title: 'Maxs Hörspiel',
          prompt: 'A magical adventure',
          ageGroup: '6-9',
          summary: JSON.stringify({
            heroName: 'Max',
            heroAge: '7',
            prompt: 'A magical adventure',
          }),
        },
      });
    });

    it('should create story reservation without hero name', async () => {
      const dto: ReserveDto = {
        prompt: 'A simple story',
      };

      const result = await controller.reserve(dto);

      expect(result).toEqual({
        ok: true,
        storyId: 'test-uuid-123',
      });

      expect(prismaService.story.create).toHaveBeenCalledWith({
        data: {
          id: 'test-uuid-123',
          title: 'Dein Hörspiel',
          prompt: 'A simple story',
          ageGroup: '3-5',
          summary: JSON.stringify({
            heroName: undefined,
            heroAge: undefined,
            prompt: 'A simple story',
          }),
        },
      });
    });

    it('should set correct age group based on heroAge', async () => {
      const testCases = [
        { heroAge: '3', expectedAgeGroup: '3-5' },
        { heroAge: '5', expectedAgeGroup: '3-5' },
        { heroAge: '6', expectedAgeGroup: '6-9' },
        { heroAge: '8', expectedAgeGroup: '6-9' },
        { heroAge: '10', expectedAgeGroup: '6-9' },
        { heroAge: undefined, expectedAgeGroup: '3-5' }, // defaults to 5
        { heroAge: '', expectedAgeGroup: '3-5' },
        { heroAge: 'invalid', expectedAgeGroup: '3-5' },
      ];

      for (const { heroAge, expectedAgeGroup } of testCases) {
        jest.clearAllMocks();
        
        const dto: ReserveDto = { heroName: 'Test', heroAge, prompt: 'Test' };
        await controller.reserve(dto);

        expect(prismaService.story.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            ageGroup: expectedAgeGroup,
          }),
        });
      }
    });

    it('should handle empty fields gracefully', async () => {
      const dto: ReserveDto = {};

      await controller.reserve(dto);

      expect(prismaService.story.create).toHaveBeenCalledWith({
        data: {
          id: 'test-uuid-123',
          title: 'Dein Hörspiel',
          prompt: null,
          ageGroup: '3-5',
          summary: JSON.stringify({
            heroName: undefined,
            heroAge: undefined,
            prompt: null,
          }),
        },
      });
    });

    it('should send Telegram notification with default credentials', async () => {
      const dto: ReserveDto = {
        heroName: 'Anna',
        heroAge: '6',
        prompt: 'Princess adventure',
      };

      await controller.reserve(dto);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/bot7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus/sendMessage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: '5559274578',
            text: '✨ *Neuer Hörspiel-Wunsch!*\n🦸 Anna (6 J.)\n💬 „Princess adventure"\n🔗 https://fablino.de/story/test-uuid-123',
            parse_mode: 'Markdown',
          }),
        }
      );
    });

    it('should use environment variables for Telegram credentials', async () => {
      process.env.TELEGRAM_BOT_TOKEN = 'custom-bot-token';
      process.env.TELEGRAM_CHAT_ID = 'custom-chat-id';

      const dto: ReserveDto = { heroName: 'Test' };
      await controller.reserve(dto);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.telegram.org/botcustom-bot-token/sendMessage',
        expect.objectContaining({
          body: expect.stringContaining('custom-chat-id'),
        })
      );
    });

    it('should create notification without optional fields', async () => {
      const dto: ReserveDto = {};

      await controller.reserve(dto);

      const telegramCall = (global.fetch as jest.Mock).mock.calls[0];
      const body = JSON.parse(telegramCall[1].body);
      
      expect(body.text).toContain('✨ *Neuer Hörspiel-Wunsch!*');
      expect(body.text).toContain('🔗 https://fablino.de/story/test-uuid-123');
      expect(body.text).not.toContain('🦸');
      expect(body.text).not.toContain('💬');
    });

    it('should handle Telegram notification errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const dto: ReserveDto = { heroName: 'Test' };
      
      // Should not throw error despite notification failure
      const result = await controller.reserve(dto);
      
      expect(result).toEqual({
        ok: true,
        storyId: 'test-uuid-123',
      });
    });

    it('should generate unique story IDs', async () => {
      const { randomUUID } = require('crypto');
      (randomUUID as jest.Mock)
        .mockReturnValueOnce('uuid-1')
        .mockReturnValueOnce('uuid-2')
        .mockReturnValueOnce('uuid-3');

      const dto: ReserveDto = { heroName: 'Test' };

      for (let i = 1; i <= 3; i++) {
        jest.clearAllMocks();
        const result = await controller.reserve(dto);
        
        expect(result.storyId).toBe(`uuid-${i}`);
        expect(prismaService.story.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            id: `uuid-${i}`,
          }),
        });
      }
    });

    it('should handle database errors', async () => {
      mockPrismaService.story.create.mockRejectedValue(new Error('Database error'));

      const dto: ReserveDto = { heroName: 'Test' };

      await expect(controller.reserve(dto)).rejects.toThrow('Database error');
    });

    it('should create correct story title variations', async () => {
      const testCases = [
        { heroName: 'Max', expectedTitle: 'Maxs Hörspiel' },
        { heroName: 'Anna', expectedTitle: 'Annas Hörspiel' },
        { heroName: '', expectedTitle: 'Dein Hörspiel' },
        { heroName: undefined, expectedTitle: 'Dein Hörspiel' },
      ];

      for (const { heroName, expectedTitle } of testCases) {
        jest.clearAllMocks();
        
        const dto: ReserveDto = { heroName };
        await controller.reserve(dto);

        expect(prismaService.story.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            title: expectedTitle,
          }),
        });
      }
    });

    it('should store metadata as JSON in summary field', async () => {
      const dto: ReserveDto = {
        heroName: 'Hero',
        heroAge: '8',
        prompt: 'Adventure',
      };

      await controller.reserve(dto);

      const expectedMeta = JSON.stringify({
        heroName: 'Hero',
        heroAge: '8',
        prompt: 'Adventure',
      });

      expect(prismaService.story.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          summary: expectedMeta,
        }),
      });
    });
  });
});