import { Injectable } from '@nestjs/common';
import { PrismaService } from '../modules/prisma/prisma.service';
import { AudioMixService, AudioMixSettings, DEFAULT_AUDIO_SETTINGS } from './audio.service';
import * as path from 'path';

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
        settings[r.key] = Number(r.value);
      });
    } catch {}
    return settings;
  }

  /**
   * Calculate scene break indices from a flat list of lines with sceneIdx.
   */
  calculateSceneBreaks(lines: { sceneIdx: number }[]): number[] {
    const sceneBreaks: number[] = [];
    let lastScene = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lastScene >= 0 && lines[i].sceneIdx !== lastScene) {
        sceneBreaks.push(i - 1);
      }
      lastScene = lines[i].sceneIdx;
    }
    return sceneBreaks;
  }

  /**
   * Calculate scene break indices from a Script's scenes array.
   */
  calculateSceneBreaksFromScenes(scenes: { lines: any[] }[]): number[] {
    const sceneBreaks: number[] = [];
    let count = 0;
    for (const scene of scenes) {
      if (count > 0) sceneBreaks.push(count - 1);
      count += scene.lines.length;
    }
    return sceneBreaks;
  }

  /**
   * Recombine all line audio files into a final MP3 for a story.
   * Loads mix settings from DB and calculates scene breaks automatically.
   */
  async recombineStoryAudio(
    storyId: string,
    segments: string[],
    sceneBreaks: number[],
  ): Promise<void> {
    const mixSettings = await this.loadMixSettings();
    const finalPath = path.join(AUDIO_DIR, `${storyId}.mp3`);
    await this.audioMixService.combineAudio(segments, finalPath, AUDIO_DIR, sceneBreaks, mixSettings);
  }
}
