import { Test, TestingModule } from '@nestjs/testing';
import { VoicesService } from './voices.service';
import { TtsService } from '../../services/tts.service';

describe('VoicesService', () => {
  let service: VoicesService;
  let ttsService: TtsService;

  const mockTtsService = {
    getVoiceDirectory: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoicesService,
        {
          provide: TtsService,
          useValue: mockTtsService,
        },
      ],
    }).compile();

    service = module.get<VoicesService>(VoicesService);
    ttsService = module.get<TtsService>(TtsService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVoices', () => {
    it('should return voice directory from TTS service', () => {
      const expectedVoices = {
        'GoXyzBapJk3AoCJoMQl9': { name: 'Daniel', desc: 'neutral, professionell', category: 'narrator' },
        'Ewvy14akxdhONg4fmNry': { name: 'Finnegan', desc: 'neugierig, aufgeweckt, mutig', category: 'child_m' },
        '9sjP3TfMlzEjAa6uXh3A': { name: 'Kelly', desc: 'fröhlich, lebhaft', category: 'child_f' },
      };
      mockTtsService.getVoiceDirectory.mockReturnValue(expectedVoices);

      const result = service.getVoices();

      expect(result).toEqual(expectedVoices);
      expect(ttsService.getVoiceDirectory).toHaveBeenCalled();
    });

    it('should return empty object when TTS service returns empty', () => {
      mockTtsService.getVoiceDirectory.mockReturnValue({});

      const result = service.getVoices();

      expect(result).toEqual({});
      expect(ttsService.getVoiceDirectory).toHaveBeenCalled();
    });

    it('should propagate TTS service errors', () => {
      mockTtsService.getVoiceDirectory.mockImplementation(() => {
        throw new Error('TTS service error');
      });

      expect(() => service.getVoices()).toThrow('TTS service error');
    });

    it('should call TTS service exactly once', () => {
      mockTtsService.getVoiceDirectory.mockReturnValue({});

      service.getVoices();

      expect(ttsService.getVoiceDirectory).toHaveBeenCalledTimes(1);
      expect(ttsService.getVoiceDirectory).toHaveBeenCalledWith();
    });

    it('should return all voice categories', () => {
      const comprehensiveVoices = {
        'narrator_id': { name: 'Daniel', desc: 'neutral, professionell', category: 'narrator' },
        'child_m_id': { name: 'Finnegan', desc: 'mutig, neugierig', category: 'child_m' },
        'child_f_id': { name: 'Kelly', desc: 'fröhlich, lebhaft', category: 'child_f' },
        'adult_m_id': { name: 'Ben', desc: 'warmherzig', category: 'adult_m' },
        'adult_f_id': { name: 'Raya', desc: 'warm, mütterlich', category: 'adult_f' },
        'elder_f_id': { name: 'Hilde', desc: 'liebevolle Oma', category: 'elder_f' },
      };
      mockTtsService.getVoiceDirectory.mockReturnValue(comprehensiveVoices);

      const result = service.getVoices();

      expect(result).toEqual(comprehensiveVoices);
      
      const categories = Object.values(result).map(voice => voice.category);
      expect(categories).toContain('narrator');
      expect(categories).toContain('child_m');
      expect(categories).toContain('child_f');
      expect(categories).toContain('adult_m');
      expect(categories).toContain('adult_f');
      expect(categories).toContain('elder_f');
    });

    it('should handle null/undefined return from TTS service', () => {
      mockTtsService.getVoiceDirectory.mockReturnValue(null);

      const result = service.getVoices();

      expect(result).toBeNull();
    });

    it('should return exact same object reference from TTS service', () => {
      const voiceObject = { 'voice1': { name: 'Test', desc: 'test', category: 'test' } };
      mockTtsService.getVoiceDirectory.mockReturnValue(voiceObject);

      const result = service.getVoices();

      expect(result).toBe(voiceObject); // Same reference, not a copy
    });
  });
});