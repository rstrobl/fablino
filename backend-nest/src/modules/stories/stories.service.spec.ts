import { Test, TestingModule } from '@nestjs/testing';
import { StoriesService } from './stories.service';
import { PrismaService } from '../prisma/prisma.service';
import { TtsService } from '../../services/tts.service';
import { AudioService } from '../../services/audio.service';
import { NotFoundException, HttpException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

// Mock fs module
jest.mock('fs');
jest.mock('path');

describe('StoriesService', () => {
  let service: StoriesService;
  let prismaService: PrismaService;
  let ttsService: TtsService;
  let audioService: AudioService;

  const mockPrismaService = {
    story: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    character: {
      updateMany: jest.fn(),
    },
    line: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTtsService = {
    DEFAULT_VOICE_SETTINGS: {
      stability: 0.5,
      similarity_boost: 0.8,
      style: 0.3,
      use_speaker_boost: true,
    },
    generateTTS: jest.fn(),
  };

  const mockAudioService = {
    combineAudio: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TtsService,
          useValue: mockTtsService,
        },
        {
          provide: AudioService,
          useValue: mockAudioService,
        },
      ],
    }).compile();

    service = module.get<StoriesService>(StoriesService);
    prismaService = module.get<PrismaService>(PrismaService);
    ttsService = module.get<TtsService>(TtsService);
    audioService = module.get<AudioService>(AudioService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.mkdirSync as jest.Mock).mockImplementation();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    (path.resolve as jest.Mock).mockImplementation((p) => p);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStories', () => {
    const mockStories = [
      {
        id: 'story1',
        title: 'Test Story 1',
        prompt: 'A test prompt',
        summary: 'A test summary',
        ageGroup: '5-7',
        featured: true,
        createdAt: new Date(),
        audioPath: '/path/to/audio1.mp3',
        coverUrl: '/covers/story1.jpg',
        characters: [
          { name: 'Hero', gender: 'child_m', voiceId: 'voice1' },
          { name: 'Friend', gender: 'child_f', voiceId: 'voice2' },
        ],
      },
      {
        id: 'story2',
        title: 'Test Story 2',
        prompt: 'Another test prompt',
        summary: 'Another summary',
        ageGroup: '6-9',
        featured: false,
        createdAt: new Date(),
        audioPath: null,
        coverUrl: null,
        characters: [],
      },
    ];

    it('should return all stories when showAll is true', async () => {
      mockPrismaService.story.findMany.mockResolvedValue(mockStories);

      const result = await service.getStories(true);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('story1');
      expect(result[0].audioUrl).toBe('/api/audio/story1');
      expect(result[0].voiceMap).toEqual({ Hero: 'voice1', Friend: 'voice2' });
      expect(result[1].id).toBe('story2');
      expect(result[1].audioUrl).toBeNull();
    });

    it('should return only featured stories when showAll is false', async () => {
      mockPrismaService.story.findMany.mockResolvedValue(mockStories);

      const result = await service.getStories(false);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('story1');
      expect(result[0].featured).toBe(true);
    });

    it('should handle empty stories array', async () => {
      mockPrismaService.story.findMany.mockResolvedValue([]);

      const result = await service.getStories();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      mockPrismaService.story.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getStories()).rejects.toThrow('Database error');
    });
  });

  describe('getStory', () => {
    const mockStory = {
      id: 'story1',
      title: 'Test Story',
      prompt: 'A test prompt',
      summary: 'A test summary',
      ageGroup: '5-7',
      createdAt: new Date(),
      audioPath: '/path/to/audio1.mp3',
      coverUrl: '/covers/story1.jpg',
      characters: [
        { name: 'Hero', gender: 'child_m', voiceId: 'voice1' },
      ],
      lines: [
        { id: 'line1', speaker: 'Erzähler', text: 'Es war einmal...', sceneIdx: 0, lineIdx: 0 },
        { id: 'line2', speaker: 'Hero', text: 'Hallo Welt!', sceneIdx: 0, lineIdx: 1 },
      ],
    };

    it('should return story with details', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(mockStory);

      const result = await service.getStory('story1');

      expect(result.id).toBe('story1');
      expect(result.lines).toHaveLength(2);
      expect(result.audioUrl).toBe('/api/audio/story1');
      expect(result.voiceMap).toEqual({ Hero: 'voice1' });
    });

    it('should throw NotFoundException when story does not exist', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(null);

      await expect(service.getStory('nonexistent')).rejects.toThrow(NotFoundException);
      expect(mockPrismaService.story.findUnique).toHaveBeenCalledWith({
        where: { id: 'nonexistent' },
        include: {
          characters: {
            select: {
              name: true,
              gender: true,
              voiceId: true,
            },
          },
          lines: {
            orderBy: [
              { sceneIdx: 'asc' },
              { lineIdx: 'asc' },
            ],
          },
        },
      });
    });
  });

  describe('toggleFeatured', () => {
    it('should update featured status to true', async () => {
      mockPrismaService.story.update.mockResolvedValue({ id: 'story1', featured: true });

      const result = await service.toggleFeatured('story1', true);

      expect(result).toEqual({ status: 'ok', featured: true });
      expect(mockPrismaService.story.update).toHaveBeenCalledWith({
        where: { id: 'story1' },
        data: { featured: true },
      });
    });

    it('should update featured status to false', async () => {
      mockPrismaService.story.update.mockResolvedValue({ id: 'story1', featured: false });

      const result = await service.toggleFeatured('story1', false);

      expect(result).toEqual({ status: 'ok', featured: false });
    });

    it('should throw HttpException on database error', async () => {
      mockPrismaService.story.update.mockRejectedValue(new Error('DB error'));

      await expect(service.toggleFeatured('story1', true)).rejects.toThrow(HttpException);
    });
  });

  describe('voiceSwap', () => {
    const mockStory = { id: 'story1', title: 'Test Story' };
    const mockLines = [
      { id: 'line1', speaker: 'Erzähler', text: 'Es war einmal...', sceneIdx: 0, lineIdx: 0 },
      { id: 'line2', speaker: 'Hero', text: 'Hallo!', sceneIdx: 0, lineIdx: 1 },
      { id: 'line3', speaker: 'Hero', text: 'Wie geht es dir?', sceneIdx: 0, lineIdx: 2 },
      { id: 'line4', speaker: 'Friend', text: 'Gut, danke!', sceneIdx: 0, lineIdx: 3 },
    ];

    it('should throw HttpException with missing parameters', async () => {
      await expect(service.voiceSwap('story1', '', 'voice123')).rejects.toThrow(HttpException);
      await expect(service.voiceSwap('story1', 'Hero', '')).rejects.toThrow(HttpException);
    });

    it('should throw NotFoundException when story does not exist', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(null);

      await expect(service.voiceSwap('nonexistent', 'Hero', 'voice123')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when character does not exist', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(mockStory);
      mockPrismaService.character.updateMany.mockResolvedValue({ count: 0 });

      await expect(service.voiceSwap('story1', 'NonExistentCharacter', 'voice123')).rejects.toThrow(NotFoundException);
    });

    it('should return no_lines when story has no lines', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(mockStory);
      mockPrismaService.character.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.line.findMany.mockResolvedValue([]);

      const result = await service.voiceSwap('story1', 'Hero', 'voice123');

      expect(result).toEqual({
        status: 'no_lines',
        message: 'No lines in DB to regenerate',
      });
    });

    it('should successfully perform voice swap with TTS regeneration', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(mockStory);
      mockPrismaService.character.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.line.findMany.mockResolvedValue(mockLines);
      mockPrismaService.line.update.mockResolvedValue({});
      mockTtsService.generateTTS.mockResolvedValue(undefined);
      mockAudioService.combineAudio.mockResolvedValue(undefined);

      const result = await service.voiceSwap('story1', 'Hero', 'voice123');

      expect(result).toEqual({
        status: 'ok',
        character: 'Hero',
        voiceId: 'voice123',
        linesRegenerated: 2, // Two lines for Hero
      });

      // Should call TTS generation for Hero's lines only
      expect(mockTtsService.generateTTS).toHaveBeenCalledTimes(2);
      expect(mockTtsService.generateTTS).toHaveBeenCalledWith(
        'Hallo!',
        'voice123',
        expect.any(String),
        mockTtsService.DEFAULT_VOICE_SETTINGS,
        { previous_text: 'Es war einmal...', next_text: 'Wie geht es dir?' }
      );

      // Should update line audio paths
      expect(mockPrismaService.line.update).toHaveBeenCalledTimes(2);

      // Should combine audio
      expect(mockAudioService.combineAudio).toHaveBeenCalledWith(
        expect.any(Array),
        expect.stringContaining('story1.mp3'),
        expect.any(String)
      );
    });

    it('should handle TTS generation errors', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(mockStory);
      mockPrismaService.character.updateMany.mockResolvedValue({ count: 1 });
      mockPrismaService.line.findMany.mockResolvedValue(mockLines);
      mockTtsService.generateTTS.mockRejectedValue(new Error('TTS failed'));

      await expect(service.voiceSwap('story1', 'Hero', 'voice123')).rejects.toThrow(HttpException);
    });
  });

  describe('deleteStory', () => {
    it('should successfully delete story', async () => {
      mockPrismaService.story.delete.mockResolvedValue({ id: 'story1' });

      const result = await service.deleteStory('story1');

      expect(result).toEqual({ status: 'ok' });
      expect(mockPrismaService.story.delete).toHaveBeenCalledWith({
        where: { id: 'story1' },
      });
    });

    it('should throw HttpException on database error', async () => {
      mockPrismaService.story.delete.mockRejectedValue(new Error('DB error'));

      await expect(service.deleteStory('story1')).rejects.toThrow(HttpException);
    });
  });
});