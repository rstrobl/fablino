import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
const exec = promisify(require('child_process').exec);

export interface AudioMixSettings {
  line_pause: number;    // seconds between lines (default 0.5)
  scene_pause: number;   // seconds between scenes (default 1.5)
  fade_in: number;       // fade-in duration (default 0.5)
  fade_out: number;      // fade-out duration (default 0.3)
  loudnorm_lufs: number; // loudness target (default -16)
}

export const DEFAULT_AUDIO_SETTINGS: AudioMixSettings = {
  line_pause: 0.5,
  scene_pause: 1.5,
  fade_in: 0.5,
  fade_out: 0.3,
  loudnorm_lufs: -16,
};

@Injectable()
export class AudioService {
  async combineAudio(
    segments: string[],
    outputPath: string,
    audioDir: string,
    sceneBreaks?: number[],
    settings: AudioMixSettings = DEFAULT_AUDIO_SETTINGS,
  ): Promise<void> {
    const ts = Date.now();
    const lineSilencePath = path.join(audioDir, `silence_line_${ts}.mp3`);
    const sceneSilencePath = path.join(audioDir, `silence_scene_${ts}.mp3`);
    
    // Create silence files
    await exec(`ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t ${settings.line_pause} -q:a 9 "${lineSilencePath}" 2>/dev/null`);
    if (settings.scene_pause !== settings.line_pause) {
      await exec(`ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t ${settings.scene_pause} -q:a 9 "${sceneSilencePath}" 2>/dev/null`);
    } else {
      fs.copyFileSync(lineSilencePath, sceneSilencePath);
    }
    
    const sceneBreakSet = new Set(sceneBreaks || []);
    const listPath = path.join(audioDir, `list_${ts}.txt`);
    let listContent = '';
    
    // Create concatenation list with appropriate silence between segments
    for (let i = 0; i < segments.length; i++) {
      listContent += `file '${segments[i]}'\n`;
      if (i < segments.length - 1) {
        const silenceFile = sceneBreakSet.has(i) ? sceneSilencePath : lineSilencePath;
        listContent += `file '${silenceFile}'\n`;
      }
    }
    
    fs.writeFileSync(listPath, listContent);
    
    // Concatenate audio files
    const tmpConcat = path.join(audioDir, `tmp_${ts}.mp3`);
    await exec(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -q:a 2 "${tmpConcat}"`);
    
    // Build filter chain
    const filters: string[] = [];
    if (settings.fade_in > 0) filters.push(`afade=t=in:d=${settings.fade_in}`);
    if (settings.fade_out > 0) {
      // Get duration to calculate fade-out start
      try {
        const { stdout } = await exec(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${tmpConcat}"`);
        const duration = parseFloat(stdout.trim());
        if (duration > settings.fade_out) {
          filters.push(`afade=t=out:st=${(duration - settings.fade_out).toFixed(2)}:d=${settings.fade_out}`);
        }
      } catch {}
    }
    
    if (filters.length > 0) {
      await exec(`ffmpeg -y -i "${tmpConcat}" -af "${filters.join(',')}" -q:a 2 "${outputPath}"`);
    } else {
      fs.renameSync(tmpConcat, outputPath);
    }
    
    // Cleanup temporary files
    try {
      if (fs.existsSync(tmpConcat)) fs.unlinkSync(tmpConcat);
      fs.unlinkSync(lineSilencePath);
      fs.unlinkSync(sceneSilencePath);
      fs.unlinkSync(listPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}