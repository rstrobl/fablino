import { Test, TestingModule } from '@nestjs/testing';
import { StoriesController } from './stories.controller';
import { StoriesService } from './stories.service';
import { ToggleFeaturedDto, VoiceSwapDto } from '../../dto/stories.dto';
import { NotFoundException } from '@nestjs/common';

describe('StoriesController', () => {
  let controller: StoriesController;
  let service: StoriesService;

  const mockStoriesService = {
    getStories: jest.fn(),
    getStory: jest.fn(),
    toggleFeatured: jest.fn(),
    voiceSwap: jest.fn(),
    deleteStory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StoriesController],
      providers: [
        {
          provide: StoriesService,
          useValue: mockStoriesService,
        },
      ],
    }).compile();

    controller = module.get<StoriesController>(StoriesController);
    service = module.get<StoriesService>(StoriesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getStories', () => {
    it('should return all stories when all=true', async () => {
      const expectedStories = [
        { id: '1', title: 'Story 1', featured: true },
        { id: '2', title: 'Story 2', featured: false },
      ];
      mockStoriesService.getStories.mockResolvedValue(expectedStories);

      const result = await controller.getStories('true');
      
      expect(result).toEqual(expectedStories);
      expect(service.getStories).toHaveBeenCalledWith(true);
    });

    it('should return only featured stories by default', async () => {
      const expectedStories = [
        { id: '1', title: 'Story 1', featured: true },
      ];
      mockStoriesService.getStories.mockResolvedValue(expectedStories);

      const result = await controller.getStories();
      
      expect(result).toEqual(expectedStories);
      expect(service.getStories).toHaveBeenCalledWith(false);
    });

    it('should return only featured stories when all=false', async () => {
      const expectedStories = [
        { id: '1', title: 'Story 1', featured: true },
      ];
      mockStoriesService.getStories.mockResolvedValue(expectedStories);

      const result = await controller.getStories('false');
      
      expect(result).toEqual(expectedStories);
      expect(service.getStories).toHaveBeenCalledWith(false);
    });

    it('should handle service errors', async () => {
      mockStoriesService.getStories.mockRejectedValue(new Error('Database error'));

      await expect(controller.getStories()).rejects.toThrow('Database error');
    });
  });

  describe('getStory', () => {
    it('should return a story by id', async () => {
      const expectedStory = {
        id: 'story1',
        title: 'Test Story',
        characters: [],
        lines: [],
      };
      mockStoriesService.getStory.mockResolvedValue(expectedStory);

      const result = await controller.getStory('story1');
      
      expect(result).toEqual(expectedStory);
      expect(service.getStory).toHaveBeenCalledWith('story1');
    });

    it('should handle story not found', async () => {
      mockStoriesService.getStory.mockRejectedValue(new NotFoundException('Story nicht gefunden'));

      await expect(controller.getStory('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('toggleFeatured', () => {
    it('should toggle featured status to true', async () => {
      const dto: ToggleFeaturedDto = { featured: true };
      const expectedResult = { status: 'ok', featured: true };
      mockStoriesService.toggleFeatured.mockResolvedValue(expectedResult);

      const result = await controller.toggleFeatured('story1', dto);
      
      expect(result).toEqual(expectedResult);
      expect(service.toggleFeatured).toHaveBeenCalledWith('story1', true);
    });

    it('should toggle featured status to false', async () => {
      const dto: ToggleFeaturedDto = { featured: false };
      const expectedResult = { status: 'ok', featured: false };
      mockStoriesService.toggleFeatured.mockResolvedValue(expectedResult);

      const result = await controller.toggleFeatured('story1', dto);
      
      expect(result).toEqual(expectedResult);
      expect(service.toggleFeatured).toHaveBeenCalledWith('story1', false);
    });
  });

  describe('voiceSwap', () => {
    it('should perform voice swap successfully', async () => {
      const dto: VoiceSwapDto = { character: 'Hero', voiceId: 'voice_123' };
      const expectedResult = { 
        status: 'ok', 
        character: 'Hero', 
        voiceId: 'voice_123',
        linesRegenerated: 5 
      };
      mockStoriesService.voiceSwap.mockResolvedValue(expectedResult);

      const result = await controller.voiceSwap('story1', dto);
      
      expect(result).toEqual(expectedResult);
      expect(service.voiceSwap).toHaveBeenCalledWith('story1', 'Hero', 'voice_123');
    });

    it('should handle voice swap errors', async () => {
      const dto: VoiceSwapDto = { character: 'Hero', voiceId: 'voice_123' };
      mockStoriesService.voiceSwap.mockRejectedValue(new Error('Voice swap failed'));

      await expect(controller.voiceSwap('story1', dto)).rejects.toThrow('Voice swap failed');
    });
  });

  describe('deleteStory', () => {
    it('should delete story successfully', async () => {
      const expectedResult = { status: 'ok' };
      mockStoriesService.deleteStory.mockResolvedValue(expectedResult);

      const result = await controller.deleteStory('story1');
      
      expect(result).toEqual(expectedResult);
      expect(service.deleteStory).toHaveBeenCalledWith('story1');
    });

    it('should handle delete errors', async () => {
      mockStoriesService.deleteStory.mockRejectedValue(new Error('Delete failed'));

      await expect(controller.deleteStory('story1')).rejects.toThrow('Delete failed');
    });
  });
});