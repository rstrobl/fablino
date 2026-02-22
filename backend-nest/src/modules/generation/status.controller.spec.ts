import { Test, TestingModule } from '@nestjs/testing';
import { StatusController } from './status.controller';
import { GenerationService, Job } from './generation.service';

describe('StatusController', () => {
  let controller: StatusController;
  let service: GenerationService;

  const mockGenerationService = {
    getJobStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StatusController],
      providers: [
        {
          provide: GenerationService,
          useValue: mockGenerationService,
        },
      ],
    }).compile();

    controller = module.get<StatusController>(StatusController);
    service = module.get<GenerationService>(GenerationService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getJobStatus', () => {
    it('should return job status when job exists', async () => {
      const expectedJob: Job = {
        status: 'generating_audio',
        progress: 'Stimmen: 3/8',
        title: 'Das große Abenteuer',
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
      expect(service.getJobStatus).toHaveBeenCalledWith('nonexistent');
    });

    it('should handle various job statuses', async () => {
      const testCases: (Job | { status: 'not_found' })[] = [
        { status: 'waiting_for_script', progress: 'Skript wird geschrieben...' },
        { 
          status: 'preview', 
          script: { title: 'Test', summary: 'Test', characters: [], scenes: [] },
          voiceMap: { 'Hero': 'voice123' }
        },
        { status: 'generating_audio', progress: 'Audio wird zusammengemischt...' },
        { 
          status: 'done', 
          story: { id: 'story123', title: 'Complete Story' }, 
          completedAt: Date.now() 
        },
        { status: 'error', error: 'Generation failed', completedAt: Date.now() },
        { status: 'not_found' },
      ];

      for (const testCase of testCases) {
        mockGenerationService.getJobStatus.mockReturnValue(testCase);
        
        const result = await controller.getJobStatus('test-job');
        expect(result).toEqual(testCase);
      }
    });

    it('should pass job ID correctly to service', async () => {
      const jobIds = ['job1', 'job2', 'very-long-job-id-123', 'special-chars-!@#'];

      for (const jobId of jobIds) {
        mockGenerationService.getJobStatus.mockReturnValue({ status: 'not_found' });
        
        await controller.getJobStatus(jobId);
        expect(service.getJobStatus).toHaveBeenCalledWith(jobId);
      }
    });

    it('should return job with all possible fields', async () => {
      const completeJob: Job = {
        status: 'done',
        progress: 'Complete',
        title: 'Story Title',
        script: {
          title: 'Script Title',
          summary: 'Summary',
          characters: [{ name: 'Hero', gender: 'child_m', traits: ['mutig'] }],
          scenes: [{ lines: [{ speaker: 'Hero', text: 'Hello!' }] }],
        },
        voiceMap: { 'Hero': 'voice123' },
        prompt: 'Original prompt',
        ageGroup: '5-7',
        systemPrompt: 'System prompt used',
        error: undefined,
        completedAt: Date.now(),
        startedAt: Date.now() - 60000,
        story: { id: 'story123', title: 'Final Story' },
      };

      mockGenerationService.getJobStatus.mockReturnValue(completeJob);

      const result = await controller.getJobStatus('complete-job');

      expect(result).toEqual(completeJob);
    });
  });
});