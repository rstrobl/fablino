import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { SharingController } from './sharing.controller';
import { SharingService } from './sharing.service';

describe('SharingController', () => {
  let controller: SharingController;
  let service: SharingService;

  const mockSharingService = {
    serveOgPage: jest.fn(),
    servePreviewPage: jest.fn(),
  };

  const mockResponse = {
    status: jest.fn(() => mockResponse),
    send: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SharingController],
      providers: [
        {
          provide: SharingService,
          useValue: mockSharingService,
        },
      ],
    }).compile();

    controller = module.get<SharingController>(SharingController);
    service = module.get<SharingService>(SharingService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('shareStory', () => {
    it('should serve OG page for sharing', async () => {
      mockSharingService.serveOgPage.mockResolvedValue(undefined);

      await controller.shareStory('story123', mockResponse);

      expect(service.serveOgPage).toHaveBeenCalledWith('story123', mockResponse);
    });

    it('should handle various story IDs', async () => {
      const testIds = ['story1', 'story-with-dashes', 'story_123', 'very-long-story-id'];

      for (const storyId of testIds) {
        await controller.shareStory(storyId, mockResponse);
        expect(service.serveOgPage).toHaveBeenCalledWith(storyId, mockResponse);
      }
    });
  });

  describe('ogStory', () => {
    it('should serve OG page for story', async () => {
      mockSharingService.serveOgPage.mockResolvedValue(undefined);

      await controller.ogStory('story456', mockResponse);

      expect(service.serveOgPage).toHaveBeenCalledWith('story456', mockResponse);
    });

    it('should use same service method as shareStory', async () => {
      await controller.ogStory('story123', mockResponse);
      await controller.shareStory('story123', mockResponse);

      expect(service.serveOgPage).toHaveBeenCalledTimes(2);
      expect(service.serveOgPage).toHaveBeenNthCalledWith(1, 'story123', mockResponse);
      expect(service.serveOgPage).toHaveBeenNthCalledWith(2, 'story123', mockResponse);
    });
  });

  describe('publicStoryPage', () => {
    it('should serve OG page for public story', async () => {
      mockSharingService.serveOgPage.mockResolvedValue(undefined);

      await controller.publicStoryPage('story789', mockResponse);

      expect(service.serveOgPage).toHaveBeenCalledWith('story789', mockResponse);
    });

    it('should use same service method as other story endpoints', async () => {
      const storyId = 'story123';
      
      await controller.shareStory(storyId, mockResponse);
      await controller.ogStory(storyId, mockResponse);
      await controller.publicStoryPage(storyId, mockResponse);

      expect(service.serveOgPage).toHaveBeenCalledTimes(3);
      // All should use the same service method and parameters
      expect(service.serveOgPage).toHaveBeenNthCalledWith(1, storyId, mockResponse);
      expect(service.serveOgPage).toHaveBeenNthCalledWith(2, storyId, mockResponse);
      expect(service.serveOgPage).toHaveBeenNthCalledWith(3, storyId, mockResponse);
    });
  });

  describe('previewPage', () => {
    it('should serve preview page', async () => {
      mockSharingService.servePreviewPage.mockResolvedValue(undefined);

      await controller.previewPage('job123', mockResponse);

      expect(service.servePreviewPage).toHaveBeenCalledWith('job123', mockResponse);
    });

    it('should handle various job IDs', async () => {
      const testJobIds = ['job1', 'job-456', 'job_uuid_123', 'preview-test'];

      for (const jobId of testJobIds) {
        jest.clearAllMocks();
        await controller.previewPage(jobId, mockResponse);
        expect(service.servePreviewPage).toHaveBeenCalledWith(jobId, mockResponse);
      }
    });

    it('should use different service method than story endpoints', async () => {
      await controller.previewPage('job123', mockResponse);
      await controller.shareStory('story123', mockResponse);

      expect(service.servePreviewPage).toHaveBeenCalledTimes(1);
      expect(service.serveOgPage).toHaveBeenCalledTimes(1);
      expect(service.servePreviewPage).toHaveBeenCalledWith('job123', mockResponse);
      expect(service.serveOgPage).toHaveBeenCalledWith('story123', mockResponse);
    });
  });

  describe('all endpoints', () => {
    it('should pass response object to service methods', async () => {
      await controller.shareStory('story1', mockResponse);
      await controller.ogStory('story2', mockResponse);
      await controller.publicStoryPage('story3', mockResponse);
      await controller.previewPage('job1', mockResponse);

      expect(service.serveOgPage).toHaveBeenCalledTimes(3);
      expect(service.servePreviewPage).toHaveBeenCalledTimes(1);

      // Check that all calls received the response object
      expect(service.serveOgPage).toHaveBeenCalledWith(expect.any(String), mockResponse);
      expect(service.servePreviewPage).toHaveBeenCalledWith(expect.any(String), mockResponse);
    });

    it('should handle service errors', async () => {
      mockSharingService.serveOgPage.mockRejectedValue(new Error('Service error'));

      await expect(controller.shareStory('story123', mockResponse)).rejects.toThrow('Service error');
    });
  });
});