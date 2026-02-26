import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TtsService, VoiceSettings, ContextSettings } from './tts.service';
import { Character } from './claude.service';
import * as fs from 'fs';
import { promisify } from 'util';

// Mock fs and child_process
jest.mock('fs');
jest.mock('child_process');
jest.mock('util', () => ({
  ...jest.requireActual('util'),
  promisify: jest.fn(() => jest.fn().mockResolvedValue({ stdout: '', stderr: '' })),
}));

// Mock global fetch
global.fetch = jest.fn();

describe('TtsService', () => {
  let service: TtsService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TtsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TtsService>(TtsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('test-api-key');
    (fs.writeFileSync as jest.Mock).mockImplementation();
    (fs.unlinkSync as jest.Mock).mockImplementation();
    (fs.renameSync as jest.Mock).mockImplementation();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.copyFileSync as jest.Mock).mockImplementation();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getVoiceDirectory', () => {
    it('should return voice directory', () => {
      const directory = service.getVoiceDirectory();
      
      expect(directory).toBeDefined();
      expect(directory).toHaveProperty('GoXyzBapJk3AoCJoMQl9');
      expect(directory['GoXyzBapJk3AoCJoMQl9']).toEqual({
        name: 'Daniel',
        desc: 'neutral, professionell',
        category: 'narrator'
      });
    });

    it('should contain all expected voice categories', () => {
      const directory = service.getVoiceDirectory();
      const categories = Object.values(directory).map(v => v.category);
      
      expect(categories).toContain('narrator');
      expect(categories).toContain('child_m');
      expect(categories).toContain('child_f');
      expect(categories).toContain('adult_m');
      expect(categories).toContain('adult_f');
      expect(categories).toContain('elder_f');
    });
  });

  describe('assignVoices', () => {
    it('should assign narrator voice to Erzähler', () => {
      const characters: Character[] = [
        { name: 'Erzähler', gender: 'adult_m', traits: ['warm'] }
      ];

      const voiceMap = service.assignVoices(characters);

      expect(voiceMap['Erzähler']).toBe('GoXyzBapJk3AoCJoMQl9');
    });

    it('should assign voices based on gender and traits', () => {
      const characters: Character[] = [
        { name: 'Max', gender: 'child_m', traits: ['mutig', 'neugierig'] },
        { name: 'Anna', gender: 'child_f', traits: ['fröhlich', 'lebhaft'] },
        { name: 'Papa', gender: 'adult_m', traits: ['warm', 'liebevoll'] }
      ];

      const voiceMap = service.assignVoices(characters);

      expect(voiceMap['Max']).toBeDefined();
      expect(voiceMap['Anna']).toBeDefined();
      expect(voiceMap['Papa']).toBeDefined();
      
      // Should not duplicate voices
      const voices = Object.values(voiceMap);
      expect(new Set(voices).size).toBe(voices.length);
    });

    it('should handle characters without traits', () => {
      const characters: Character[] = [
        { name: 'Hero', gender: 'child_m', traits: [] }
      ];

      const voiceMap = service.assignVoices(characters);

      expect(voiceMap['Hero']).toBeDefined();
    });

    it('should fallback to adult voices for elder_m when pool is empty', () => {
      const characters: Character[] = [
        { name: 'Opa', gender: 'elder_m', traits: ['warm'] }
      ];

      const voiceMap = service.assignVoices(characters);

      expect(voiceMap['Opa']).toBeDefined();
    });

    it('should handle large number of characters with voice rotation', () => {
      const characters: Character[] = Array.from({ length: 10 }, (_, i) => ({
        name: `Character${i}`,
        gender: 'adult_m',
        traits: ['neutral']
      }));

      const voiceMap = service.assignVoices(characters);

      expect(Object.keys(voiceMap)).toHaveLength(10);
      Object.values(voiceMap).forEach(voice => {
        expect(typeof voice).toBe('string');
        expect(voice.length).toBeGreaterThan(0);
      });
    });

    it('should assign creature voices correctly', () => {
      const characters: Character[] = [
        { name: 'Dragon', gender: 'creature', traits: ['lustig', 'freundlich'] },
        { name: 'Troll', gender: 'creature', traits: ['durchtrieben', 'böse'] }
      ];

      const voiceMap = service.assignVoices(characters);

      expect(voiceMap['Dragon']).toBeDefined();
      expect(voiceMap['Troll']).toBeDefined();
      expect(voiceMap['Dragon']).not.toBe(voiceMap['Troll']);
    });
  });

  describe('generateTTS', () => {
    const mockResponse = {
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    });

    it('should generate TTS successfully', async () => {
      await service.generateTTS(
        'Hello world',
        'voice_123',
        '/path/to/output.mp3'
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/text-to-speech/voice_123',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'xi-api-key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Hello world'),
        })
      );

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should use custom voice settings', async () => {
      const customSettings: VoiceSettings = {
        stability: 0.8,
        similarity_boost: 0.6,
        style: 0.4,
        use_speaker_boost: true,
      };

      await service.generateTTS(
        'Test text',
        'voice_123',
        '/path/to/output.mp3',
        customSettings
      );

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      expect(body.voice_settings).toEqual(customSettings);
    });

    it('should include context when provided', async () => {
      const context: ContextSettings = {
        previous_text: 'Previous line',
        next_text: 'Next line',
      };

      await service.generateTTS(
        'Current text',
        'voice_123',
        '/path/to/output.mp3',
        service.DEFAULT_VOICE_SETTINGS,
        context
      );

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      expect(body.previous_text).toBe('Previous line');
      expect(body.next_text).toBe('Next line');
    });

    it('should use default voice settings when not provided', async () => {
      await service.generateTTS('Test', 'voice_123', '/path/output.mp3');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      expect(body.voice_settings).toEqual(service.DEFAULT_VOICE_SETTINGS);
    });

    it('should throw error when API key is missing', async () => {
      mockConfigService.get.mockReturnValue(null);

      await expect(
        service.generateTTS('Test', 'voice_123', '/path/output.mp3')
      ).rejects.toThrow('ELEVENLABS_API_KEY not configured');
    });

    it('should handle API error responses', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad request'),
      };
      (global.fetch as jest.Mock).mockResolvedValue(errorResponse);

      await expect(
        service.generateTTS('Test', 'invalid_voice', '/path/output.mp3')
      ).rejects.toThrow('ElevenLabs 400: Bad request');
    });

    it('should handle ffmpeg processing failure gracefully', async () => {
      const execMock = promisify(require('child_process').exec);
      (execMock as jest.Mock).mockRejectedValue(new Error('ffmpeg failed'));

      // Should not throw error, should fallback to raw file
      await expect(
        service.generateTTS('Test', 'voice_123', '/path/output.mp3')
      ).resolves.not.toThrow();
    });

    it('should use multilingual model', async () => {
      await service.generateTTS('Test', 'voice_123', '/path/output.mp3');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      expect(body.model_id).toBe('eleven_v3');
    });
  });

  describe('generateSFX', () => {
    const mockSfxResponse = {
      ok: true,
      arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(2048)),
    };

    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue(mockSfxResponse);
    });

    it('should generate SFX successfully', async () => {
      const result = await service.generateSFX('footsteps', '/path/to/sfx.mp3');

      expect(result).toBe('/path/to/sfx.mp3');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.elevenlabs.io/v1/sound-generation',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'xi-api-key': 'test-api-key',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('footsteps'),
        })
      );
    });

    it('should use cached SFX for duplicate requests', async () => {
      // First call
      await service.generateSFX('door knock', '/path/to/sfx1.mp3');
      
      // Second call with same description
      const result = await service.generateSFX('door knock', '/path/to/sfx2.mp3');

      expect(result).toBe('/path/to/sfx2.mp3');
      expect(fs.copyFileSync).toHaveBeenCalledWith('/path/to/sfx1.mp3', '/path/to/sfx2.mp3');
      expect(global.fetch).toHaveBeenCalledTimes(1); // Only called once due to caching
    });

    it('should return null when API key is missing', async () => {
      mockConfigService.get.mockReturnValue(null);
      
      const result = await service.generateSFX('test sfx', '/path/output.mp3');
      
      expect(result).toBeNull();
    });

    it('should return null and log warning on API error', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorResponse = {
        ok: false,
        status: 429,
        text: jest.fn().mockResolvedValue('Rate limit exceeded'),
      };
      (global.fetch as jest.Mock).mockResolvedValue(errorResponse);

      const result = await service.generateSFX('test sfx', '/path/output.mp3');

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('SFX generation failed (429): Rate limit exceeded')
      );

      consoleWarnSpy.mockRestore();
    });

    it('should use correct SFX generation parameters', async () => {
      await service.generateSFX('wind blowing', '/path/output.mp3');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      expect(body.text).toBe('wind blowing');
      expect(body.duration_seconds).toBe(2.0);
      expect(body.prompt_influence).toBe(0.4);
    });

    it('should handle network errors gracefully', async () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(service.generateSFX('test sfx', '/path/output.mp3')).rejects.toThrow('Network error');
      
      consoleWarnSpy.mockRestore();
    });

    it('should cache with normalized keys', async () => {
      // Test that caching works with case and whitespace variations
      await service.generateSFX('  DOOR KNOCK  ', '/path/to/sfx1.mp3');
      await service.generateSFX('door knock', '/path/to/sfx2.mp3');

      expect(fs.copyFileSync).toHaveBeenCalled();
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('default voice settings', () => {
    it('should have correct default voice settings', () => {
      expect(service.DEFAULT_VOICE_SETTINGS).toEqual({
        stability: 0.35,
        similarity_boost: 0.75,
        style: 0.6,
        use_speaker_boost: false,
      });
    });
  });
});