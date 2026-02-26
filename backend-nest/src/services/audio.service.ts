import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
const exec = promisify(require('child_process').exec);

export interface AudioMixSettings {
  scene_pause: number;   // seconds between scenes (default 1.5)
  sfx_pause: number;     // seconds before and after SFX (default 0.4)
  fade_in: number;       // fade-in duration (default 0.5)
  fade_out: number;      // fade-out duration (default 0.3)
}

export const DEFAULT_AUDIO_SETTINGS: AudioMixSettings = {
  scene_pause: 1.5,
  sfx_pause: 0.4,
  fade_in: 0.5,
  fade_out: 0.3,
};

@Injectable()
export class AudioMixService {
  async combineAudio(
    segments: string[],
    outputPath: string,
    audioDir: string,
    settings: AudioMixSettings = DEFAULT_AUDIO_SETTINGS,
    segmentTypes?: ('dialogue' | 'sfx')[],
  ): Promise<void> {
    const ts = Date.now();
    const silencePath = path.join(audioDir, `silence_${ts}.mp3`);
    const sfxSilencePath = path.join(audioDir, `sfx_silence_${ts}.mp3`);
    
    // Create silence files
    await exec(`ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t ${settings.scene_pause} -q:a 9 "${silencePath}" 2>/dev/null`);
    const sfxPause = settings.sfx_pause || 0.4;
    await exec(`ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t ${sfxPause} -q:a 9 "${sfxSilencePath}" 2>/dev/null`);
    
    const listPath = path.join(audioDir, `list_${ts}.txt`);
    let listContent = '';
    
    // Create concatenation list with appropriate pauses
    for (let i = 0; i < segments.length; i++) {
      listContent += `file '${segments[i]}'\n`;
      if (i < segments.length - 1) {
        // Use SFX pause if current or next segment is SFX
        const curIsSfx = segmentTypes?.[i] === 'sfx';
        const nextIsSfx = segmentTypes?.[i + 1] === 'sfx';
        const pause = (curIsSfx || nextIsSfx) ? sfxSilencePath : silencePath;
        listContent += `file '${pause}'\n`;
      }
    }
    
    fs.writeFileSync(listPath, listContent);
    
    // Concatenate via WAV intermediate to avoid MP3 frame boundary clicks
    const tmpConcat = path.join(audioDir, `tmp_${ts}.mp3`);
    
    if (segments.length <= 1) {
      await exec(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -q:a 2 "${tmpConcat}"`);
    } else {
      const tmpWav = path.join(audioDir, `tmp_${ts}.wav`);
      await exec(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -ar 44100 -ac 1 "${tmpWav}"`);
      await exec(`ffmpeg -y -i "${tmpWav}" -q:a 2 "${tmpConcat}"`);
      try { fs.unlinkSync(tmpWav); } catch {}
    }
    
    // Build filter chain (fade in/out)
    const filters: string[] = [];
    if (settings.fade_in > 0) filters.push(`afade=t=in:d=${settings.fade_in}`);
    if (settings.fade_out > 0) {
      try {
        const { stdout } = await exec(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${tmpConcat}"`);
        const duration = parseFloat(stdout.trim());
        if (duration > settings.fade_out) {
          filters.push(`afade=t=out:st=${(duration - settings.fade_out).toFixed(2)}:d=${settings.fade_out}`);
        }
      } catch {}
    }
    
    // Always normalize final audio to consistent volume
    filters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
    
    await exec(`ffmpeg -y -i "${tmpConcat}" -af "${filters.join(',')}" -q:a 2 "${outputPath}"`);
    
    // Cleanup
    try {
      if (fs.existsSync(tmpConcat)) fs.unlinkSync(tmpConcat);
      fs.unlinkSync(silencePath);
      try { fs.unlinkSync(sfxSilencePath); } catch {}
      fs.unlinkSync(listPath);
    } catch {}
  }
}
