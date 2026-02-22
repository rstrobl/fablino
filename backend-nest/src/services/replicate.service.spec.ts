import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ReplicateService } from './replicate.service';
import { Character } from './claude.service';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Mock fs, path, and child_process
jest.mock('fs');
jest.mock('path');
jest.mock('child_process');

// Mock global fetch
global.fetch = jest.fn();

describe('ReplicateService', () => {
  let service: ReplicateService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReplicateService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ReplicateService>(ReplicateService);
    configService = module.get<ConfigService>(ConfigService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('test-api-token');
    (fs.mkdirSync as jest.Mock).mockImplementation();
    (fs.writeFileSync as jest.Mock).mockImplementation();
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (execSync as jest.Mock).mockImplementation();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateCover', () => {
    const mockCharacters: Character[] = [
      { name: 'Erzähler', gender: 'adult_m', traits: ['warm'] },
      { name: 'Max', gender: 'child_m', traits: ['mutig'] },
      { name: 'Luna', gender: 'child_f', traits: ['fröhlich'] },
      { name: 'Dragon', gender: 'creature', traits: ['freundlich'] },
    ];

    const mockSuccessfulPrediction = {
      status: 'succeeded',
      output: 'https://replicate.example.com/image.jpg',
      urls: {
        get: 'https://api.replicate.com/v1/predictions/123'
      }
    };

    const mockImageBuffer = Buffer.from('fake-image-data');

    beforeEach(() => {
      // Mock successful create response
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            ...mockSuccessfulPrediction,
            status: 'processing',
            urls: { get: 'https://api.replicate.com/v1/predictions/123' }
          }),
        })
        // Mock successful poll response
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSuccessfulPrediction),
        })
        // Mock successful image download
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: jest.fn().mockResolvedValue(mockImageBuffer.buffer),
        });
    });

    it('should return null when API token is missing', async () => {
      mockConfigService.get.mockReturnValue(null);
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const result = await service.generateCover(
        'Test Story',
        'A test summary',
        mockCharacters,
        'story123',
        '/covers'
      );

      expect(result).toBeNull();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'No REPLICATE_API_TOKEN — skipping cover generation'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should generate cover successfully', async () => {
      const result = await service.generateCover(
        'Das große Abenteuer',
        'Ein mutiger Junge erlebt ein Abenteuer',
        mockCharacters,
        'story123',
        '/covers'
      );

      expect(result).toBe('/covers/story123.jpg');

      // Should create prediction
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.replicate.com/v1/predictions',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Authorization': 'Bearer test-api-token',
            'Content-Type': 'application/json',
          },
          body: expect.stringContaining('Das große Abenteuer'),
        })
      );

      // Should poll for completion
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.replicate.com/v1/predictions/123',
        expect.objectContaining({
          headers: { 'Authorization': 'Bearer test-api-token' },
        })
      );

      // Should download and save image
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/covers/story123.jpg',
        expect.any(Buffer)
      );
    });

    it('should create correct prompt with characters', async () => {
      await service.generateCover(
        'Test Story',
        'A summary',
        mockCharacters,
        'story123',
        '/covers'
      );

      const createCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(createCall.body);
      
      expect(body.input.prompt).toContain('Test Story');
      expect(body.input.prompt).toContain('Characters: Max, Luna, Dragon');
      expect(body.input.prompt).toContain('A summary');
      expect(body.input.prompt).toContain('Watercolor children\'s storybook illustration');
      expect(body.input.prompt).toContain('no text, no words, no letters');
    });

    it('should exclude narrator from character description', async () => {
      await service.generateCover(
        'Test Story',
        'Summary',
        mockCharacters,
        'story123',
        '/covers'
      );

      const createCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(createCall.body);
      
      expect(body.input.prompt).not.toContain('Erzähler');
      expect(body.input.prompt).toContain('Max, Luna, Dragon');
    });

    it('should limit characters to 4', async () => {
      const manyCharacters: Character[] = [
        { name: 'Erzähler', gender: 'adult_m', traits: [] },
        { name: 'Hero1', gender: 'child_m', traits: [] },
        { name: 'Hero2', gender: 'child_f', traits: [] },
        { name: 'Hero3', gender: 'adult_m', traits: [] },
        { name: 'Hero4', gender: 'adult_f', traits: [] },
        { name: 'Hero5', gender: 'creature', traits: [] },
        { name: 'Hero6', gender: 'child_m', traits: [] },
      ];

      await service.generateCover(
        'Test Story',
        'Summary',
        manyCharacters,
        'story123',
        '/covers'
      );

      const createCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(createCall.body);
      
      // Should only include first 4 non-narrator characters
      expect(body.input.prompt).toContain('Hero1, Hero2, Hero3, Hero4');
      expect(body.input.prompt).not.toContain('Hero5');
      expect(body.input.prompt).not.toContain('Hero6');
    });

    it('should use correct Flux model and parameters', async () => {
      await service.generateCover(
        'Test',
        'Summary',
        mockCharacters,
        'story123',
        '/covers'
      );

      const createCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(createCall.body);
      
      expect(body.version).toBe('black-forest-labs/flux-1.1-pro');
      expect(body.input.aspect_ratio).toBe('1:1');
      expect(body.input.output_format).toBe('jpg');
      expect(body.input.output_quality).toBe(90);
    });

    it('should poll until prediction completes', async () => {
      // Mock multiple polling attempts
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'starting',
            urls: { get: 'https://api.replicate.com/v1/predictions/123' }
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'processing',
            urls: { get: 'https://api.replicate.com/v1/predictions/123' }
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'processing',
            urls: { get: 'https://api.replicate.com/v1/predictions/123' }
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue(mockSuccessfulPrediction),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: jest.fn().mockResolvedValue(mockImageBuffer.buffer),
        });

      await service.generateCover('Test', 'Summary', mockCharacters, 'story123', '/covers');

      // Should have called fetch 5 times: create + 3 polls + download
      expect(global.fetch).toHaveBeenCalledTimes(5);
    });

    it('should return null on create API error', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad request'),
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await service.generateCover(
        'Test',
        'Summary',
        mockCharacters,
        'story123',
        '/covers'
      );

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Replicate create error:', 'Bad request');
      
      consoleErrorSpy.mockRestore();
    });

    it('should return null on prediction failure', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'processing',
            urls: { get: 'https://api.replicate.com/v1/predictions/123' }
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'failed',
            error: 'Model error',
          }),
        });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const result = await service.generateCover(
        'Test',
        'Summary',
        mockCharacters,
        'story123',
        '/covers'
      );

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith('Replicate prediction failed:', 'Model error');
      
      consoleErrorSpy.mockRestore();
    });

    it('should return null when no output URL is provided', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'processing',
            urls: { get: 'https://api.replicate.com/v1/predictions/123' }
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'succeeded',
            output: null,
          }),
        });

      const result = await service.generateCover(
        'Test',
        'Summary',
        mockCharacters,
        'story123',
        '/covers'
      );

      expect(result).toBeNull();
    });

    it('should handle array output format', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'processing',
            urls: { get: 'https://api.replicate.com/v1/predictions/123' }
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: jest.fn().mockResolvedValue({
            status: 'succeeded',
            output: ['https://replicate.example.com/image.jpg'],
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: jest.fn().mockResolvedValue(mockImageBuffer.buffer),
        });

      const result = await service.generateCover(
        'Test',
        'Summary',
        mockCharacters,
        'story123',
        '/covers'
      );

      expect(result).toBe('/covers/story123.jpg');
    });

    it('should create directories recursively', async () => {
      await service.generateCover(
        'Test',
        'Summary',
        mockCharacters,
        'story123',
        '/path/to/covers'
      );

      expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to/covers', { recursive: true });
      expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to/covers/og', { recursive: true });
    });

    it('should generate OG thumbnail successfully', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.generateCover(
        'Test',
        'Summary',
        mockCharacters,
        'story123',
        '/covers'
      );

      expect(execSync).toHaveBeenCalledWith(
        'convert "/covers/story123.jpg" -resize 600x600 -quality 80 "/covers/og/story123_og.jpg"'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('OG thumbnail generated:')
      );

      consoleLogSpy.mockRestore();
    });

    it('should handle OG thumbnail generation errors gracefully', async () => {
      (execSync as jest.Mock).mockImplementation(() => {
        throw new Error('ImageMagick not found');
      });

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.generateCover(
        'Test',
        'Summary',
        mockCharacters,
        'story123',
        '/covers'
      );

      // Should still return the cover URL despite OG error
      expect(result).toBe('/covers/story123.jpg');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'OG thumbnail generation error:',
        'ImageMagick not found'
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await service.generateCover(
        'Test',
        'Summary',
        mockCharacters,
        'story123',
        '/covers'
      );

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Cover generation error:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });
});