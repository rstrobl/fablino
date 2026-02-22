import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ClaudeService } from './claude.service';

// Mock global fetch
global.fetch = jest.fn();

describe('ClaudeService', () => {
  let service: ClaudeService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClaudeService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<ClaudeService>(ClaudeService);
    configService = module.get<ConfigService>(ConfigService);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue('test-api-key');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateScript', () => {
    const mockClaudeResponse = {
      ok: true,
      json: jest.fn().mockResolvedValue({
        content: [{
          text: JSON.stringify({
            title: 'Das große Abenteuer',
            summary: 'Ein Junge erlebt ein spannendes Abenteuer. Wird er es schaffen?',
            characters: [
              { name: 'Erzähler', gender: 'adult_m', traits: ['warm', 'märchenhaft'] },
              { name: 'Max', gender: 'child_m', traits: ['mutig', 'neugierig'] }
            ],
            scenes: [{
              lines: [
                { speaker: 'Erzähler', text: 'Es war einmal ein mutiger Junge namens Max.' },
                { speaker: 'Max', text: 'Heute will ich ein großes Abenteuer erleben!' }
              ]
            }]
          })
        }]
      }),
    };

    it('should generate script with basic prompt', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockClaudeResponse);

      const result = await service.generateScript('Ein Abenteuer im Wald');

      expect(result).toHaveProperty('script');
      expect(result).toHaveProperty('systemPrompt');
      expect(result.script.title).toBe('Das große Abenteuer');
      expect(result.script.characters).toHaveLength(2);
      expect(result.script.scenes).toHaveLength(1);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: expect.stringContaining('Ein Abenteuer im Wald'),
        })
      );
    });

    it('should generate script with custom age group', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockClaudeResponse);

      await service.generateScript('Eine Weltraumreise', '6-9');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      expect(body.system).toContain('GROSSE OHREN (6–9 Jahre)');
      expect(body.system).toContain('MINDESTENS 60 Zeilen');
    });

    it('should generate script with hero character', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockClaudeResponse);

      const characters = {
        hero: { name: 'Anna', age: '7' }
      };

      await service.generateScript('Eine Piratengeschichte', '5-7', characters);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      expect(body.system).toContain('Der HELD der Geschichte heißt "Anna"');
      expect(body.system).toContain('und ist 7 Jahre alt');
    });

    it('should generate script with side characters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockClaudeResponse);

      const characters = {
        sideCharacters: [
          { name: 'Captain Hook', role: 'Pirat' },
          { name: 'Polly', role: 'Papagei' }
        ]
      };

      await service.generateScript('Piratengeschichte', '5-7', characters);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      expect(body.system).toContain('Pirat: "Captain Hook"');
      expect(body.system).toContain('Papagei: "Polly"');
    });

    it('should generate script with both hero and side characters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockClaudeResponse);

      const characters = {
        hero: { name: 'Tom' },
        sideCharacters: [{ name: 'Rex', role: 'Dinosaurier' }]
      };

      await service.generateScript('Dinosaurierabenteuer', '3-5', characters);

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      expect(body.system).toContain('Der HELD der Geschichte heißt "Tom"');
      expect(body.system).toContain('Dinosaurier: "Rex"');
      expect(body.system).toContain('KLEINE OHREN (3–5 Jahre)');
    });

    it('should throw error when API key is missing', async () => {
      mockConfigService.get.mockReturnValue(null);

      await expect(service.generateScript('Test prompt')).rejects.toThrow('ANTHROPIC_API_KEY nicht konfiguriert');
    });

    it('should handle API error response', async () => {
      const errorResponse = {
        ok: false,
        status: 400,
        text: jest.fn().mockResolvedValue('Bad request error'),
      };
      (global.fetch as jest.Mock).mockResolvedValue(errorResponse);

      await expect(service.generateScript('Test prompt')).rejects.toThrow('Claude API 400: Bad request error');
    });

    it('should handle malformed JSON response', async () => {
      const malformedResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{ text: 'invalid json content' }]
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(malformedResponse);

      await expect(service.generateScript('Test prompt')).rejects.toThrow();
    });

    it('should handle JSON response wrapped in markdown', async () => {
      const markdownWrappedResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          content: [{
            text: '```json\n' + JSON.stringify({
              title: 'Test Story',
              summary: 'A test story',
              characters: [],
              scenes: []
            }) + '\n```'
          }]
        }),
      };
      (global.fetch as jest.Mock).mockResolvedValue(markdownWrappedResponse);

      const result = await service.generateScript('Test prompt');

      expect(result.script.title).toBe('Test Story');
      expect(result.script.summary).toBe('A test story');
    });

    it('should use correct model and parameters', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockClaudeResponse);

      await service.generateScript('Test prompt');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      expect(body.model).toBe('claude-sonnet-4-20250514');
      expect(body.max_tokens).toBe(4096);
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe('user');
      expect(body.messages[0].content).toContain('Test prompt');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      await expect(service.generateScript('Test prompt')).rejects.toThrow('Network error');
    });

    it('should handle empty characters object', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockClaudeResponse);

      await service.generateScript('Test prompt', '5-7', {});

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      expect(body.system).toContain('Erfinde einen passenden Helden');
    });

    it('should default to 5-7 age group when not specified', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockClaudeResponse);

      await service.generateScript('Test prompt');

      const fetchCall = (global.fetch as jest.Mock).mock.calls[0][1];
      const body = JSON.parse(fetchCall.body);
      
      // Default age group is '5-7' which uses the "GROSSE OHREN" rules  
      expect(body.system).toContain('GROSSE OHREN');
    });

    it('should include system prompt in return value', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockClaudeResponse);

      const result = await service.generateScript('Test prompt');

      expect(result.systemPrompt).toBeDefined();
      expect(typeof result.systemPrompt).toBe('string');
      expect(result.systemPrompt.length).toBeGreaterThan(0);
    });
  });
});