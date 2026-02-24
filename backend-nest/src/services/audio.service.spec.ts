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
    (fs.copyFileSync as jest.Mock).mockImplementation();
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.renameSync as jest.Mock).mockImplementation();
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

      // Should cleanup temporary files (line silence, scene silence, list file, tmp file attempted)
      expect(fs.unlinkSync).toHaveBeenCalled();
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
      expect(lines[1]).toContain('silence_line_');
      expect(lines[3]).toContain('silence_line_');
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
      expect(path.join).toHaveBeenCalledWith(audioDir, 'silence_line_1000.mp3');
      expect(path.join).toHaveBeenCalledWith(audioDir, 'silence_scene_1000.mp3');
      expect(path.join).toHaveBeenCalledWith(audioDir, 'list_1000.txt');
      expect(path.join).toHaveBeenCalledWith(audioDir, 'tmp_1000.mp3');

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

      // Line silence generation
      expect(execCalls[0][0]).toContain('-f lavfi');
      expect(execCalls[0][0]).toContain('anullsrc=r=44100:cl=mono');
      expect(execCalls[0][0]).toContain('-t 0.5');
      expect(execCalls[0][0]).toContain('-q:a 9');

      // Scene silence generation (different pause)
      expect(execCalls[1][0]).toContain('-t 1.5');

      // Concatenation
      const concatCall = execCalls.find(c => c[0].includes('-f concat'));
      expect(concatCall[0]).toContain('-safe 0');
      expect(concatCall[0]).toContain('-q:a 2');

      // Fade-in
      const fadeCall = execCalls.find(c => c[0].includes('afade'));
      expect(fadeCall[0]).toContain('afade=t=in:d=0.5');
      expect(fadeCall[0]).toContain('-q:a 2');
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

    it('should use scene pause for scene breaks and line pause elsewhere', async () => {
      const sceneBreaks = [0]; // break after first segment

      await service.combineAudio(mockSegments, outputPath, audioDir, sceneBreaks);

      const writeCall = (fs.writeFileSync as jest.Mock).mock.calls.find(call =>
        call[0].includes('list_')
      );
      const listContent = writeCall[1];
      const lines = listContent.split('\n').filter(l => l.length > 0);

      // segment1 -> scene silence -> segment2 -> line silence -> segment3
      expect(lines[1]).toContain('silence_scene_');
      expect(lines[3]).toContain('silence_line_');
    });

    it('should create separate scene silence when scene_pause differs from line_pause', async () => {
      const settings = {
        line_pause: 0.3,
        scene_pause: 2.0,
        fade_in: 0,
        fade_out: 0,
        loudnorm_lufs: -16,
      };

      await service.combineAudio(mockSegments, outputPath, audioDir, [], settings);

      // Should create line silence with 0.3
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('-t 0.3'),
        expect.any(Function)
      );
      // Should create scene silence with 2.0
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('-t 2'),
        expect.any(Function)
      );
    });

    it('should copy line silence to scene silence when pauses are equal', async () => {
      const settings = {
        line_pause: 0.5,
        scene_pause: 0.5,
        fade_in: 0,
        fade_out: 0,
        loudnorm_lufs: -16,
      };

      await service.combineAudio(mockSegments, outputPath, audioDir, [], settings);

      expect(fs.copyFileSync).toHaveBeenCalled();
    });

    it('should apply custom AudioMixSettings for fade-in', async () => {
      const settings = {
        line_pause: 0.5,
        scene_pause: 1.5,
        fade_in: 1.0,
        fade_out: 0,
        loudnorm_lufs: -16,
      };

      await service.combineAudio(mockSegments, outputPath, audioDir, [], settings);

      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('afade=t=in:d=1'),
        expect.any(Function)
      );
    });

    it('should skip fade filters when both are 0', async () => {
      const settings = {
        line_pause: 0.5,
        scene_pause: 1.5,
        fade_in: 0,
        fade_out: 0,
        loudnorm_lufs: -16,
      };

      (fs.renameSync as jest.Mock) = jest.fn();

      await service.combineAudio(mockSegments, outputPath, audioDir, [], settings);

      // Should NOT call ffmpeg for fade, should rename instead
      const fadeCalls = mockExec.mock.calls.filter(c => c[0].includes('afade'));
      expect(fadeCalls).toHaveLength(0);
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