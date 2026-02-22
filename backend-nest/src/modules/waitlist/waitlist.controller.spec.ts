import { Test, TestingModule } from '@nestjs/testing';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistDto } from '../../dto/waitlist.dto';

describe('WaitlistController', () => {
  let controller: WaitlistController;
  let service: WaitlistService;

  const mockWaitlistService = {
    createWaitlistEntry: jest.fn(),
    checkWaitlist: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WaitlistController],
      providers: [
        {
          provide: WaitlistService,
          useValue: mockWaitlistService,
        },
      ],
    }).compile();

    controller = module.get<WaitlistController>(WaitlistController);
    service = module.get<WaitlistService>(WaitlistService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createWaitlistEntry', () => {
    it('should create waitlist entry successfully', async () => {
      const dto: CreateWaitlistDto = {
        email: 'test@example.com',
        heroName: 'Max',
        heroAge: '7',
        prompt: 'A magical adventure',
        storyId: 'story123',
      };
      const expectedResult = {
        ok: true,
        storyId: 'story123',
        message: 'Du bist dabei! Wir melden uns per Email, sobald dein Hörspiel fertig gezaubert ist.',
      };
      mockWaitlistService.createWaitlistEntry.mockResolvedValue(expectedResult);

      const result = await controller.createWaitlistEntry(dto);

      expect(result).toEqual(expectedResult);
      expect(service.createWaitlistEntry).toHaveBeenCalledWith(dto);
    });

    it('should handle waitlist creation errors', async () => {
      const dto: CreateWaitlistDto = {
        email: 'invalid-email',
        storyId: 'story123',
      };
      mockWaitlistService.createWaitlistEntry.mockRejectedValue(new Error('Invalid email'));

      await expect(controller.createWaitlistEntry(dto)).rejects.toThrow('Invalid email');
    });

    it('should pass through all DTO fields', async () => {
      const dto: CreateWaitlistDto = {
        email: 'user@example.com',
        heroName: 'Anna',
        heroAge: '5',
        prompt: 'Dragon adventure',
        sideCharacters: [{ name: 'Dragon', role: 'friend' }],
        storyId: 'story456',
      };
      mockWaitlistService.createWaitlistEntry.mockResolvedValue({ ok: true });

      await controller.createWaitlistEntry(dto);

      expect(service.createWaitlistEntry).toHaveBeenCalledWith(dto);
    });
  });

  describe('checkWaitlist', () => {
    it('should check if story is in waitlist', async () => {
      const expectedResult = { registered: true };
      mockWaitlistService.checkWaitlist.mockResolvedValue(expectedResult);

      const result = await controller.checkWaitlist('story123');

      expect(result).toEqual(expectedResult);
      expect(service.checkWaitlist).toHaveBeenCalledWith('story123');
    });

    it('should return false when not registered', async () => {
      const expectedResult = { registered: false };
      mockWaitlistService.checkWaitlist.mockResolvedValue(expectedResult);

      const result = await controller.checkWaitlist('nonexistent');

      expect(result).toEqual(expectedResult);
    });

    it('should handle various story IDs', async () => {
      const testIds = ['story1', 'story-with-dashes', 'story_123', 'very-long-story-id'];

      for (const storyId of testIds) {
        mockWaitlistService.checkWaitlist.mockResolvedValue({ registered: false });
        
        await controller.checkWaitlist(storyId);
        expect(service.checkWaitlist).toHaveBeenCalledWith(storyId);
      }
    });
  });
});