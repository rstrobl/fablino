import { Test, TestingModule } from '@nestjs/testing';
import { Response } from 'express';
import { GenerationController } from './generation.controller';
import { GenerationService, Job } from './generation.service';
import { GenerateStoryDto, PreviewLineDto } from '../../dto/generation.dto';
import { HttpException, NotFoundException } from '@nestjs/common';

describe('GenerationController', () => {
  let controller: GenerationController;
  let service: GenerationService;

  const mockGenerationService = {
    generateStory: jest.fn(),
    confirmScript: jest.fn(),
    previewLine: jest.fn(),
    getJobStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GenerationController],
      providers: [
        {
          provide: GenerationService,
          useValue: mockGenerationService,
        },
      ],
    }).compile();

    controller = module.get<GenerationController>(GenerationController);
    service = module.get<GenerationService>(GenerationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('generateStory', () => {
    it('should generate story successfully', async () => {
      const dto: GenerateStoryDto = {
        prompt: 'Ein Abenteuer im Wald',
        ageGroup: '5-7',
      };
      const expectedResult = { id: 'job123', status: 'accepted' };
      mockGenerationService.generateStory.mockResolvedValue(expectedResult);

      const result = await controller.generateStory(dto);

      expect(result).toEqual(expectedResult);
      expect(service.generateStory).toHaveBeenCalledWith(dto);
    });

    it('should handle generation errors', async () => {
      const dto: GenerateStoryDto = {
        prompt: '',
      };
      mockGenerationService.generateStory.mockRejectedValue(new HttpException('Prompt ist erforderlich', 400));

      await expect(controller.generateStory(dto)).rejects.toThrow(HttpException);
    });

    it('should pass through all DTO fields', async () => {
      const dto: GenerateStoryDto = {
        prompt: 'Test story',
        ageGroup: '6-9',
        characters: {
          hero: { name: 'Max', age: '8' },
          sideCharacters: [{ name: 'Luna', role: 'friend' }]
        }
      };
      mockGenerationService.generateStory.mockResolvedValue({ id: 'job123', status: 'accepted' });

      await controller.generateStory(dto);

      expect(service.generateStory).toHaveBeenCalledWith(dto);
    });
  });

  describe('confirmScript', () => {
    it('should confirm script successfully', async () => {
      const expectedResult = { status: 'confirmed' };
      mockGenerationService.confirmScript.mockResolvedValue(expectedResult);

      const result = await controller.confirmScript('job123');

      expect(result).toEqual(expectedResult);
      expect(service.confirmScript).toHaveBeenCalledWith('job123');
    });

    it('should handle script not found', async () => {
      mockGenerationService.confirmScript.mockRejectedValue(
        new NotFoundException('Kein Skript zur Bestätigung gefunden')
      );

      await expect(controller.confirmScript('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('previewLine', () => {
    it('should preview line successfully', async () => {
      const dto: PreviewLineDto = {
        text: 'Hello world!',
        voiceId: 'voice123',
      };
      const mockResponse = {
        sendFile: jest.fn(),
      } as unknown as Response;

      mockGenerationService.previewLine.mockResolvedValue(undefined);

      await controller.previewLine(dto, mockResponse);

      expect(service.previewLine).toHaveBeenCalledWith(dto, mockResponse);
    });

    it('should handle preview errors', async () => {
      const dto: PreviewLineDto = {
        text: '',
        voiceId: 'voice123',
      };
      const mockResponse = {} as Response;

      mockGenerationService.previewLine.mockRejectedValue(
        new HttpException('text and voiceId required', 400)
      );

      await expect(controller.previewLine(dto, mockResponse)).rejects.toThrow(HttpException);
    });

    it('should pass response object to service', async () => {
      const dto: PreviewLineDto = {
        text: 'Test text',
        voiceId: 'voice123',
        voiceSettings: {
          stability: 0.5,
          similarity_boost: 0.8
        }
      };
      const mockResponse = {
        sendFile: jest.fn(),
        json: jest.fn(),
      } as unknown as Response;

      mockGenerationService.previewLine.mockResolvedValue(undefined);

      await controller.previewLine(dto, mockResponse);

      expect(service.previewLine).toHaveBeenCalledWith(dto, mockResponse);
    });
  });

  describe('getJobStatus', () => {
    it('should return job status when job exists', async () => {
      const expectedJob: Job = {
        status: 'generating_audio',
        progress: 'Stimmen: 5/10',
        title: 'Test Story',
      };
      mockGenerationService.getJobStatus.mockReturnValue(expectedJob);

      const result = await controller.getJobStatus('job123');

      expect(result).toEqual(expectedJob);
      expect(service.getJobStatus).toHaveBeenCalledWith('job123');
    });

    it('should return not_found when job does not exist', async () => {
      const expectedResult = { status: 'not_found' };
      mockGenerationService.getJobStatus.mockReturnValue(expectedResult);

      const result = await controller.getJobStatus('nonexistent');

      expect(result).toEqual(expectedResult);
    });

    it('should handle various job statuses', async () => {
      const jobStatuses: Job[] = [
        { status: 'waiting_for_script', progress: 'Skript wird geschrieben...' },
        { status: 'preview', script: {} as any, voiceMap: {} },
        { status: 'generating_audio', progress: 'Audio wird zusammengemischt...' },
        { status: 'done', story: {}, completedAt: Date.now() },
        { status: 'error', error: 'Something went wrong', completedAt: Date.now() },
      ];

      for (const jobStatus of jobStatuses) {
        mockGenerationService.getJobStatus.mockReturnValue(jobStatus);
        
        const result = await controller.getJobStatus('job123');
        expect(result).toEqual(jobStatus);
      }
    });
  });
});