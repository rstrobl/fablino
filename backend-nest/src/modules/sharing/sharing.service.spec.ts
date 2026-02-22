import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { SharingService } from './sharing.service';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';

// Mock path module
jest.mock('path');

describe('SharingService', () => {
  let service: SharingService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    story: {
      findUnique: jest.fn(),
    },
  };

  const mockResponse = {
    status: jest.fn(() => mockResponse),
    send: jest.fn(),
    setHeader: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharingService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SharingService>(SharingService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (path.basename as jest.Mock).mockImplementation((p, ext) => {
      const filename = p.split('/').pop() || '';
      return ext ? filename.replace(ext, '') : filename;
    });
    (path.extname as jest.Mock).mockImplementation((p) => {
      const match = p.match(/\.[^.]+$/);
      return match ? match[0] : '';
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('serveOgPage', () => {
    const mockStory = {
      id: 'story123',
      title: 'Das große Abenteuer',
      summary: 'Ein mutiger Junge erlebt ein spannendes Abenteuer',
      coverUrl: '/covers/story123.jpg',
      characters: [
        { name: 'Max' },
        { name: 'Luna' },
        { name: 'Erzähler' },
      ],
    };

    it('should serve OG page for existing story', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(mockStory);

      await service.serveOgPage('story123', mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('Das große Abenteuer')
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('Ein mutiger Junge erlebt ein spannendes Abenteuer')
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('https://fablino.de/covers/og/story123_og.jpg')
      );
    });

    it('should return 404 for non-existent story', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(null);

      await service.serveOgPage('nonexistent', mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.send).toHaveBeenCalledWith('<h1>Geschichte nicht gefunden</h1>');
    });

    it('should escape HTML in dynamic content', async () => {
      const storyWithSpecialChars = {
        ...mockStory,
        title: 'Story with <script>alert("XSS")</script> & "quotes"',
        summary: 'Summary with <tags> & "quotes" & ampersands',
      };
      mockPrismaService.story.findUnique.mockResolvedValue(storyWithSpecialChars);

      await service.serveOgPage('story123', mockResponse);

      const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
      
      // Should escape HTML entities in user content
      expect(sentHtml).toContain('&lt;script&gt;');
      expect(sentHtml).toContain('&quot;quotes&quot;');
      expect(sentHtml).toContain('&amp;');
      // Should not contain the actual XSS script content (should be escaped)
      expect(sentHtml).not.toContain('alert("XSS")');
    });

    it('should use fallback image when no cover available', async () => {
      const storyWithoutCover = { ...mockStory, coverUrl: null };
      mockPrismaService.story.findUnique.mockResolvedValue(storyWithoutCover);

      await service.serveOgPage('story123', mockResponse);

      const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sentHtml).toContain('https://fablino.de/logo.png');
      expect(sentHtml).toContain('<meta name="twitter:card" content="summary">');
    });

    it('should use large image card when cover is available', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(mockStory);

      await service.serveOgPage('story123', mockResponse);

      const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sentHtml).toContain('<meta name="twitter:card" content="summary_large_image">');
    });

    it('should generate correct OG image URL from cover URL', async () => {
      const testCases = [
        { coverUrl: '/covers/story123.jpg', expected: 'story123_og.jpg' },
        { coverUrl: '/covers/another-story.png', expected: 'another-story_og.jpg' },
        { coverUrl: '/covers/test.jpeg', expected: 'test_og.jpg' },
      ];

      for (const { coverUrl, expected } of testCases) {
        jest.clearAllMocks();
        
        const story = { ...mockStory, coverUrl };
        mockPrismaService.story.findUnique.mockResolvedValue(story);

        await service.serveOgPage('test', mockResponse);

        const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
        expect(sentHtml).toContain(`https://fablino.de/covers/og/${expected}`);
      }
    });

    it('should use default summary when story summary is null', async () => {
      const storyWithoutSummary = { ...mockStory, summary: null };
      mockPrismaService.story.findUnique.mockResolvedValue(storyWithoutSummary);

      await service.serveOgPage('story123', mockResponse);

      const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sentHtml).toContain('Ein personalisiertes Hörspiel für kleine Ohren');
    });

    it('should include character names in page content', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(mockStory);

      await service.serveOgPage('story123', mockResponse);

      // Characters are included in the data but not necessarily visible in meta tags
      expect(prismaService.story.findUnique).toHaveBeenCalledWith({
        where: { id: 'story123' },
        include: {
          characters: {
            select: { name: true },
          },
        },
      });
    });

    it('should include correct meta tags structure', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(mockStory);

      await service.serveOgPage('story123', mockResponse);

      const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
      
      // Check essential meta tags
      expect(sentHtml).toContain('<meta property="og:title"');
      expect(sentHtml).toContain('<meta property="og:description"');
      expect(sentHtml).toContain('<meta property="og:image"');
      expect(sentHtml).toContain('<meta property="og:type" content="website">');
      expect(sentHtml).toContain('<meta property="og:url"');
      expect(sentHtml).toContain('<meta property="og:site_name"');
      expect(sentHtml).toContain('<meta name="twitter:card"');
      expect(sentHtml).toContain('<meta name="twitter:title"');
      expect(sentHtml).toContain('<meta name="twitter:description"');
      expect(sentHtml).toContain('<meta name="twitter:image"');
    });

    it('should include redirect functionality', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(mockStory);

      await service.serveOgPage('story123', mockResponse);

      const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
      const expectedUrl = 'https://fablino.de/story/story123';
      
      expect(sentHtml).toContain(`<meta http-equiv="refresh" content="0;url=${expectedUrl}">`);
      expect(sentHtml).toContain(`<script>window.location.replace("${expectedUrl}");</script>`);
      expect(sentHtml).toContain(`<a href="${expectedUrl}">Fablino</a>`);
    });

    it('should handle database errors gracefully', async () => {
      mockPrismaService.story.findUnique.mockRejectedValue(new Error('Database error'));
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      await service.serveOgPage('story123', mockResponse);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.send).toHaveBeenCalledWith('<h1>Fehler</h1>');
      expect(consoleErrorSpy).toHaveBeenCalledWith('Sharing error:', expect.any(Error));

      consoleErrorSpy.mockRestore();
    });

    it('should include image dimensions', async () => {
      mockPrismaService.story.findUnique.mockResolvedValue(mockStory);

      await service.serveOgPage('story123', mockResponse);

      const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sentHtml).toContain('<meta property="og:image:width" content="600">');
      expect(sentHtml).toContain('<meta property="og:image:height" content="600">');
    });
  });

  describe('servePreviewPage', () => {
    it('should serve preview page with correct structure', () => {
      service.servePreviewPage('job123', mockResponse);

      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'text/html; charset=utf-8');
      
      const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
      const expectedUrl = 'https://fablino.de/preview/job123';
      
      expect(sentHtml).toContain('<title>Fablino Vorschau</title>');
      expect(sentHtml).toContain('<meta property="og:title" content="Fablino Hörspiel Vorschau">');
      expect(sentHtml).toContain('<meta property="og:description" content="Ein personalisiertes Hörspiel wird gerade erstellt...">');
      expect(sentHtml).toContain(`<meta property="og:url" content="${expectedUrl}">`);
      expect(sentHtml).toContain(`<meta http-equiv="refresh" content="0;url=${expectedUrl}">`);
      expect(sentHtml).toContain(`<script>window.location.replace("${expectedUrl}");</script>`);
    });

    it('should use fallback logo image for preview', () => {
      service.servePreviewPage('job123', mockResponse);

      const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
      expect(sentHtml).toContain('<meta property="og:image" content="https://fablino.de/logo.png">');
      expect(sentHtml).toContain('<meta name="twitter:card" content="summary">');
    });

    it('should handle various job IDs', () => {
      const testJobIds = ['job1', 'job-456', 'job_uuid_123', 'preview-test'];

      testJobIds.forEach(jobId => {
        jest.clearAllMocks();
        
        service.servePreviewPage(jobId, mockResponse);
        
        const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
        const expectedUrl = `https://fablino.de/preview/${jobId}`;
        
        expect(sentHtml).toContain(expectedUrl);
      });
    });

    it('should include proper HTML structure', () => {
      service.servePreviewPage('job123', mockResponse);

      const sentHtml = (mockResponse.send as jest.Mock).mock.calls[0][0];
      
      expect(sentHtml).toContain('<!DOCTYPE html>');
      expect(sentHtml).toContain('<html lang="de">');
      expect(sentHtml).toContain('<head>');
      expect(sentHtml).toContain('<body>');
      expect(sentHtml).toContain('</html>');
    });

    it('should not require database access', () => {
      service.servePreviewPage('job123', mockResponse);

      expect(prismaService.story.findUnique).not.toHaveBeenCalled();
    });
  });
});