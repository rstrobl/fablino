import { Test, TestingModule } from '@nestjs/testing';
import { VoicesController } from './voices.controller';
import { VoicesService } from './voices.service';

describe('VoicesController', () => {
  let controller: VoicesController;
  let service: VoicesService;

  const mockVoicesService = {
    getVoices: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VoicesController],
      providers: [
        {
          provide: VoicesService,
          useValue: mockVoicesService,
        },
      ],
    }).compile();

    controller = module.get<VoicesController>(VoicesController);
    service = module.get<VoicesService>(VoicesService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getVoices', () => {
    it('should return voice directory', () => {
      const expectedVoices = {
        'voice1': { name: 'Daniel', desc: 'neutral, professionell', category: 'narrator' },
        'voice2': { name: 'Max', desc: 'mutig, neugierig', category: 'child_m' },
        'voice3': { name: 'Anna', desc: 'fröhlich, lebhaft', category: 'child_f' },
      };
      mockVoicesService.getVoices.mockReturnValue(expectedVoices);

      const result = controller.getVoices();

      expect(result).toEqual(expectedVoices);
      expect(service.getVoices).toHaveBeenCalled();
    });

    it('should return empty object when no voices available', () => {
      mockVoicesService.getVoices.mockReturnValue({});

      const result = controller.getVoices();

      expect(result).toEqual({});
      expect(service.getVoices).toHaveBeenCalled();
    });

    it('should handle service errors', () => {
      mockVoicesService.getVoices.mockImplementation(() => {
        throw new Error('Voice service error');
      });

      expect(() => controller.getVoices()).toThrow('Voice service error');
    });

    it('should return comprehensive voice data structure', () => {
      const comprehensiveVoices = {
        'GoXyzBapJk3AoCJoMQl9': { name: 'Daniel', desc: 'neutral, professionell', category: 'narrator' },
        'Ewvy14akxdhONg4fmNry': { name: 'Finnegan', desc: 'neugierig, aufgeweckt, mutig', category: 'child_m' },
        '9sjP3TfMlzEjAa6uXh3A': { name: 'Kelly', desc: 'fröhlich, lebhaft', category: 'child_f' },
        'tqsaTjde7edL1GHtFchL': { name: 'Ben Smile', desc: 'warmherzig, vertrauenswürdig', category: 'adult_m' },
        '3t6439mGAsHvQFPpoPdf': { name: 'Raya', desc: 'warm, natürlich, Mama-Typ', category: 'adult_f' },
        'VNHNa6nN6yJdVF3YRyuF': { name: 'Hilde', desc: 'liebevolle Oma', category: 'elder_f' },
      };
      mockVoicesService.getVoices.mockReturnValue(comprehensiveVoices);

      const result = controller.getVoices();

      expect(result).toEqual(comprehensiveVoices);
      expect(Object.keys(result)).toHaveLength(6);
      
      // Verify structure of each voice entry
      Object.values(result).forEach(voice => {
        expect(voice).toHaveProperty('name');
        expect(voice).toHaveProperty('desc');
        expect(voice).toHaveProperty('category');
        expect(typeof voice.name).toBe('string');
        expect(typeof voice.desc).toBe('string');
        expect(typeof voice.category).toBe('string');
      });
    });

    it('should not modify the returned data', () => {
      const originalVoices = {
        'voice1': { name: 'Test', desc: 'test desc', category: 'test' },
      };
      mockVoicesService.getVoices.mockReturnValue(originalVoices);

      const result = controller.getVoices();

      // Should be the same reference (no modification)
      expect(result).toBe(originalVoices);
    });
  });
});