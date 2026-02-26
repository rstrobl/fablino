import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { AudioMixService, AudioMixSettings, DEFAULT_AUDIO_SETTINGS } from './audio.service';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { exec as execCb } from 'child_process';
const exec = promisify(execCb);

export const AUDIO_DIR = path.resolve('../audio');

@Injectable()
export class AudioPipelineService {
  constructor(
    private prisma: PrismaService,
    private audioMixService: AudioMixService,
  ) {}

  /**
   * Load audio mix settings from DB, merged with defaults.
   */
  async loadMixSettings(): Promise<AudioMixSettings> {
    const settings = { ...DEFAULT_AUDIO_SETTINGS };
    try {
      const rows = await this.prisma.$queryRaw`SELECT key, value FROM audio_settings` as any[];
      rows.forEach((r: any) => {
        if (r.key in settings) {
          settings[r.key] = Number(r.value);
        }
      });
    } catch {}
    return settings;
  }

  /**
   * Recombine scene audio files into a final MP3 for a story.
   */
  async recombineStoryAudio(
    storyId: string,
    segments: string[],
  ): Promise<void> {
    const mixSettings = await this.loadMixSettings();
    const finalPath = path.join(AUDIO_DIR, `${storyId}.mp3`);
    await this.audioMixService.combineAudio(segments, finalPath, AUDIO_DIR, mixSettings);
  }

  /**
   * Simple concat of audio segments (no silence between them).
   * Used for joining dialogue chunks + SFX within a scene.
   */
  async concatSegments(segments: string[], outputPath: string): Promise<void> {
    if (segments.length === 0) return;
    if (segments.length === 1) {
      fs.copyFileSync(segments[0], outputPath);
      return;
    }
    const listPath = outputPath.replace('.mp3', '_list.txt');
    const listContent = segments.map(s => `file '${s}'`).join('\n');
    fs.writeFileSync(listPath, listContent);
    // Decode to WAV intermediate to avoid MP3 frame boundary clicks
    const tmpWav = outputPath.replace('.mp3', '_tmp.wav');
    await exec(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -ar 44100 -ac 1 "${tmpWav}" 2>/dev/null`);
    await exec(`ffmpeg -y -i "${tmpWav}" -q:a 2 "${outputPath}" 2>/dev/null`);
    try { fs.unlinkSync(tmpWav); } catch {}
    fs.unlinkSync(listPath);
  }
}
