import { Test, TestingModule } from '@nestjs/testing';
import { AudioService } from './audio.service';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

// Mock fs, path, and child_process
jest.mock('fs');
jest.mock('path');
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

describe('AudioService', () => {
  let service: AudioService;
  let mockExec: jest.Mock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioService],
    }).compile();

    service = module.get<AudioService>(AudioService);
    mockExec = require('child_process').exec as jest.Mock;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.writeFileSync as jest.Mock).mockImplementation();
    (fs.unlinkSync as jest.Mock).mockImplementation();
    (path.join as jest.Mock).mockImplementation((...args) => args.join('/'));
    // Mock exec to work with promisify - it should call the callback with (null, { stdout: '', stderr: '' })
    mockExec.mockImplementation((cmd, callback) => {
      callback(null, { stdout: '', stderr: '' });
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('combineAudio', () => {
    const mockSegments = [
      '/audio/segment1.mp3',
      '/audio/segment2.mp3',
      '/audio/segment3.mp3'
    ];
    const outputPath = '/audio/final.mp3';
    const audioDir = '/audio';

    it('should combine audio segments successfully', async () => {
      await service.combineAudio(mockSegments, outputPath, audioDir);

      // Should create silence file
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t 0.5 -q:a 9'),
        expect.any(Function)
      );

      // Should create concatenation list
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringContaining('list_'),
        expect.stringContaining('file \'/audio/segment1.mp3\'')
      );

      // Should concatenate files
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringMatching(/ffmpeg -y -f concat -safe 0 -i.*-q:a 2/),
        expect.any(Function)
      );

      // Should add fade-in effect
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringMatching(/ffmpeg -y -i.*afade=t=in:d=0\.5.*-q:a 2.*final\.mp3/),
        expect.any(Function)
      );

      // Should cleanup temporary files
      expect(fs.unlinkSync).toHaveBeenCalledTimes(3);
    });

    it('should create correct concatenation list with silence between segments', async () => {
      await service.combineAudio(mockSegments, outputPath, audioDir);

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls.find(call => 
        call[0].includes('list_')
      );
      expect(writeCall).toBeDefined();
      
      const listContent = writeCall[1];
      expect(listContent).toContain('file \'/audio/segment1.mp3\'');
      expect(listContent).toContain('file \'/audio/segment2.mp3\'');
      expect(listContent).toContain('file \'/audio/segment3.mp3\'');
      
      // Should have silence between segments but not after last segment
      const lines = listContent.split('\n').filter(line => line.length > 0);
      expect(lines).toHaveLength(5); // 3 segments + 2 silence files
      expect(lines[1]).toContain('silence_');
      expect(lines[3]).toContain('silence_');
    });

    it('should handle single audio segment', async () => {
      const singleSegment = ['/audio/single.mp3'];
      
      await service.combineAudio(singleSegment, outputPath, audioDir);

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls.find(call => 
        call[0].includes('list_')
      );
      const listContent = writeCall[1];
      
      // Should only have the single file, no silence
      expect(listContent).toBe('file \'/audio/single.mp3\'\n');
    });

    it('should handle empty segments array', async () => {
      await service.combineAudio([], outputPath, audioDir);

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls.find(call => 
        call[0].includes('list_')
      );
      const listContent = writeCall[1];
      
      expect(listContent).toBe('');
    });

    it('should use unique temporary file names', async () => {
      const originalDateNow = Date.now;
      let counter = 1000;
      Date.now = jest.fn(() => counter++);

      await service.combineAudio(mockSegments, outputPath, audioDir);

      // Check that unique timestamps are used for temp files
      expect(path.join).toHaveBeenCalledWith(audioDir, 'silence_1000.mp3');
      expect(path.join).toHaveBeenCalledWith(audioDir, 'list_1001.txt');
      expect(path.join).toHaveBeenCalledWith(audioDir, 'tmp_1002.mp3');

      Date.now = originalDateNow;
    });

    it('should handle ffmpeg execution errors', async () => {
      mockExec.mockImplementationOnce((cmd, callback) => {
        callback(new Error('ffmpeg not found'));
      });

      await expect(
        service.combineAudio(mockSegments, outputPath, audioDir)
      ).rejects.toThrow('ffmpeg not found');
    });

    it('should ignore cleanup errors', async () => {
      (fs.unlinkSync as jest.Mock).mockImplementation((path) => {
        if (path.includes('tmp_')) {
          throw new Error('File not found');
        }
      });

      // Should not throw error despite cleanup failure
      await expect(
        service.combineAudio(mockSegments, outputPath, audioDir)
      ).resolves.not.toThrow();
    });

    it('should use correct ffmpeg parameters', async () => {
      await service.combineAudio(mockSegments, outputPath, audioDir);

      const execCalls = mockExec.mock.calls;

      // Silence generation
      expect(execCalls[0][0]).toContain('-f lavfi');
      expect(execCalls[0][0]).toContain('anullsrc=r=44100:cl=mono');
      expect(execCalls[0][0]).toContain('-t 0.5');
      expect(execCalls[0][0]).toContain('-q:a 9');

      // Concatenation
      expect(execCalls[1][0]).toContain('-f concat');
      expect(execCalls[1][0]).toContain('-safe 0');
      expect(execCalls[1][0]).toContain('-q:a 2');

      // Fade-in
      expect(execCalls[2][0]).toContain('afade=t=in:d=0.5');
      expect(execCalls[2][0]).toContain('-q:a 2');
    });

    it('should suppress ffmpeg stderr output', async () => {
      await service.combineAudio(mockSegments, outputPath, audioDir);

      const execCalls = mockExec.mock.calls;
      
      // First call (silence generation) should suppress stderr
      expect(execCalls[0][0]).toContain('2>/dev/null');
    });

    it('should handle paths with spaces correctly', async () => {
      const segmentsWithSpaces = [
        '/audio/segment with spaces.mp3',
        '/audio/another file.mp3'
      ];
      const outputWithSpaces = '/audio/final output.mp3';

      await service.combineAudio(segmentsWithSpaces, outputWithSpaces, audioDir);

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls.find(call => 
        call[0].includes('list_')
      );
      const listContent = writeCall[1];
      
      expect(listContent).toContain('file \'/audio/segment with spaces.mp3\'');
      expect(listContent).toContain('file \'/audio/another file.mp3\'');
    });

    it('should preserve file order in concatenation', async () => {
      const orderedSegments = [
        '/audio/intro.mp3',
        '/audio/middle.mp3',
        '/audio/outro.mp3'
      ];

      await service.combineAudio(orderedSegments, outputPath, audioDir);

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls.find(call => 
        call[0].includes('list_')
      );
      const listContent = writeCall[1];
      const lines = listContent.split('\n').filter(line => line.includes('file') && !line.includes('silence'));
      
      expect(lines[0]).toContain('intro.mp3');
      expect(lines[1]).toContain('middle.mp3');
      expect(lines[2]).toContain('outro.mp3');
    });
  });
});