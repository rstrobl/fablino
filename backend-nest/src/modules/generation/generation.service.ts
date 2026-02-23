import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeService, Script, Character } from '../../services/claude.service';
import { TtsService } from '../../services/tts.service';
import { AudioService } from '../../services/audio.service';
import { ReplicateService } from '../../services/replicate.service';
import { GenerateStoryDto, PreviewLineDto } from '../../dto/generation.dto';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export interface Job {
  status: 'waiting_for_script' | 'preview' | 'generating_audio' | 'done' | 'error';
  progress?: string;
  title?: string;
  script?: Script;
  voiceMap?: { [name: string]: string };
  prompt?: string;
  ageGroup?: string;
  systemPrompt?: string;
  error?: string;
  completedAt?: number;
  startedAt?: number;
  story?: any;
}

@Injectable()
export class GenerationService {
  private readonly AUDIO_DIR = path.resolve('../audio');
  private readonly COVERS_DIR = path.resolve('./covers');
  private readonly jobs: { [id: string]: Job } = {};

  constructor(
    private prisma: PrismaService,
    private claudeService: ClaudeService,
    private ttsService: TtsService,
    private audioService: AudioService,
    private replicateService: ReplicateService,
  ) {
    // Periodic cleanup of old jobs
    setInterval(() => {
      const now = Date.now();
      for (const [id, job] of Object.entries(this.jobs)) {
        if (job.completedAt && now - job.completedAt > 30 * 60 * 1000) {
          delete this.jobs[id];
        }
      }
    }, 5 * 60 * 1000);
  }

  async generateStory(dto: GenerateStoryDto) {
    const { prompt, ageGroup = '5-7', characters, systemPromptOverride, storyId } = dto;

    if (!prompt) {
      throw new HttpException('Prompt ist erforderlich', HttpStatus.BAD_REQUEST);
    }

    const id = storyId || uuidv4();
    this.jobs[id] = {
      status: 'waiting_for_script',
      progress: 'Skript wird geschrieben...',
      startedAt: Date.now(),
    };

    // Start generation async
    this.generateScriptAsync(id, prompt, ageGroup, characters, systemPromptOverride);

    return { id, status: 'accepted' };
  }

  private async generateScriptAsync(id: string, prompt: string, ageGroup: string, characters: any, systemPromptOverride?: string) {
    try {
      this.jobs[id].progress = 'Skript wird geschrieben...';
      
      const { script, systemPrompt } = await this.claudeService.generateScript(
        prompt, 
        ageGroup, 
        characters,
        systemPromptOverride,
      );

      // Post-processing: remove onomatopoeia from non-narrator lines
      const onomatopoeiaPattern = /\b(H[aie]h[aie]h?[aie]?|Buhuhu|Hihihi|Ächz|Seufz|Grr+|Brumm+|Miau|Wuff|Schnurr|Piep|Prust|Uff|Autsch|Hmpf|Pah|Tss|Juhu|Juchhu|Hurra|Wiehern?)\b\.{0,3}\s*/gi;
      for (const scene of script.scenes) {
        for (const line of scene.lines) {
          if (line.speaker !== 'Erzähler') {
            const cleaned = line.text
              .replace(onomatopoeiaPattern, '')
              .replace(/^\.\.\.\s*/, '')
              .replace(/\s{2,}/g, ' ')
              .trim();
            if (cleaned && cleaned !== line.text) {
              console.log(`[post-process] Removed onomatopoeia from ${line.speaker}: "${line.text}" → "${cleaned}"`);
              line.text = cleaned;
            }
          }
        }
      }

      // Add narrator if not present
      if (!script.characters.find(c => c.name === 'Erzähler')) {
        script.characters.unshift({
          name: 'Erzähler',
          gender: 'adult_m',
          traits: ['neutral'],
        });
      }

      // Preview mode: stop here and let user confirm
      const voiceMap = this.ttsService.assignVoices(script.characters);

      // Persist draft to DB so it survives restarts
      const existingStory = await this.prisma.story.findUnique({ where: { id } });
      if (existingStory) {
        await this.prisma.story.update({
          where: { id },
          data: {
            status: 'draft',
            title: script.title,
            summary: script.summary || null,
            scriptData: { script, voiceMap, systemPrompt } as any,
          },
        });
      } else {
        await this.prisma.story.create({
          data: {
            id,
            status: 'draft',
            title: script.title,
            prompt,
            summary: script.summary || null,
            age: parseFloat(ageGroup) || null,
            scriptData: { script, voiceMap, systemPrompt } as any,
          },
        });
      }

      this.jobs[id] = {
        status: 'preview',
        script,
        voiceMap,
        prompt,
        ageGroup,
        systemPrompt,
      };
    } catch (err) {
      console.error('Script generation error:', err);
      this.jobs[id] = {
        status: 'error',
        error: err.message,
        completedAt: Date.now(),
      };
    }
  }

  async confirmScript(id: string) {
    let job = this.jobs[id];
    
    // Try restore from DB if not in memory
    if (!job || job.status !== 'preview') {
      const story = await this.prisma.story.findUnique({ where: { id } });
      if (story?.scriptData && story.status === 'draft') {
        const { script, voiceMap, systemPrompt } = story.scriptData as any;
        job = {
          status: 'preview',
          script,
          voiceMap,
          prompt: story.prompt,
          ageGroup: String(story.age || '5'),
          systemPrompt,
        };
        this.jobs[id] = job;
      } else {
        throw new NotFoundException('Kein Skript zur Bestätigung gefunden');
      }
    }

    const { script, voiceMap, prompt, ageGroup, systemPrompt } = job;
    this.jobs[id] = {
      status: 'generating_audio',
      progress: 'Stimmen werden eingesprochen...',
      title: script.title,
    };

    // Start audio generation async
    this.generateAudioAsync(id, script, voiceMap, prompt, ageGroup, systemPrompt);

    return { status: 'confirmed' };
  }

  private async generateAudioAsync(
    id: string,
    script: Script,
    voiceMap: { [name: string]: string },
    prompt: string,
    ageGroup: string,
    systemPrompt: string,
  ) {
    const linesDir = path.join(this.AUDIO_DIR, 'lines', id);
    fs.mkdirSync(linesDir, { recursive: true });

    // Start cover generation in parallel
    const coverPromise = this.replicateService.generateCover(
      script.title,
      script.summary || prompt,
      script.characters,
      id,
      this.COVERS_DIR,
    );

    try {
      const voiceSettings = this.ttsService.DEFAULT_VOICE_SETTINGS;
      const segments = [];
      let lineIdx = 0;
      const allLines = script.scenes.flatMap(s => s.lines);
      const totalLines = allLines.length;

      for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];
        const voice = voiceMap[line.speaker] || this.ttsService['EL_VOICES'].narrator;
        const ttsPath = path.join(linesDir, `line_${lineIdx}.mp3`);
        
        const previous_text = i > 0 ?
          allLines.slice(Math.max(0, i - 2), i).map(l => l.text).join(' ') :
          undefined;
        const next_text = i < allLines.length - 1 ? allLines[i + 1].text : undefined;
        
        await this.ttsService.generateTTS(
          line.text,
          voice,
          ttsPath,
          voiceSettings,
          { previous_text, next_text },
        );
        
        segments.push(ttsPath);
        lineIdx++;
        this.jobs[id].progress = `Stimmen: ${lineIdx}/${totalLines}`;
      }

      this.jobs[id].progress = 'Audio wird zusammengemischt...';
      const finalPath = path.join(this.AUDIO_DIR, `${id}.mp3`);
      await this.audioService.combineAudio(segments, finalPath, this.AUDIO_DIR);

      // Wait for cover to finish (may already be done)
      const coverUrl = await coverPromise;
      console.log(`Cover for ${id}: ${coverUrl || 'none'}`);

      // Save to database
      const story = await this.insertStory(id, script, voiceMap, prompt, ageGroup, systemPrompt, coverUrl);

      this.jobs[id] = {
        status: 'done',
        completedAt: Date.now(),
        story: {
          ...story,
          characters: script.characters.map(c => ({ name: c.name, gender: c.gender })),
          voiceMap,
          audioUrl: `/api/audio/${id}`,
        },
      };
    } catch (err) {
      console.error('Audio generation error:', err);
      this.jobs[id] = {
        status: 'error',
        error: err.message,
        completedAt: Date.now(),
      };
    }
  }

  private async insertStory(
    storyId: string,
    script: Script,
    voiceMap: { [name: string]: string },
    prompt: string,
    ageGroup: string,
    systemPrompt: string,
    coverUrl?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      // Determine test group based on what was provided
      // A = hero name + side characters (Bezugspersonen), B = hero name only, C = no hero name
      const hasHeroName = /^Name:/.test(prompt);
      const hasSideChars = script.characters.length > 2; // narrator + hero + others = Bezugspersonen
      const testGroup = hasHeroName ? (hasSideChars ? 'A' : 'B') : 'C';

      // Insert story
      const story = await tx.story.create({
        data: {
          id: storyId,
          title: script.title,
          prompt: prompt,
          summary: script.summary || null,
          age: parseInt(ageGroup) || null,
          createdAt: new Date(),
          audioPath: `audio/${storyId}.mp3`,
          systemPrompt: systemPrompt || null,
          coverUrl: coverUrl || null,
          testGroup,
        },
      });

      // Insert characters
      for (const char of script.characters) {
        await tx.character.create({
          data: {
            storyId: storyId,
            name: char.name,
            gender: char.gender,
            voiceId: voiceMap[char.name] || null,
          },
        });
      }

      // Insert lines
      let globalIdx = 0;
      for (let si = 0; si < script.scenes.length; si++) {
        for (let li = 0; li < script.scenes[si].lines.length; li++) {
          const line = script.scenes[si].lines[li];
          const audioPath = `audio/lines/${storyId}/line_${globalIdx}.mp3`;
          await tx.line.create({
            data: {
              storyId: storyId,
              sceneIdx: si,
              lineIdx: li,
              speaker: line.speaker,
              text: line.text,
              sfx: null,
              audioPath: audioPath,
            },
          });
          globalIdx++;
        }
      }

      return story;
    });
  }

  async previewLine(dto: PreviewLineDto, res: Response) {
    const { text, voiceId, voiceSettings, previous_text, next_text } = dto;

    if (!text || !voiceId) {
      throw new HttpException('text and voiceId required', HttpStatus.BAD_REQUEST);
    }

    try {
      const settings = {
        stability: voiceSettings?.stability ?? 0.5,
        similarity_boost: voiceSettings?.similarity_boost ?? 0.75,
        style: voiceSettings?.style ?? 1.0,
        use_speaker_boost: voiceSettings?.use_speaker_boost ?? false,
      };

      const tmpPath = path.join(this.AUDIO_DIR, `preview_${Date.now()}.mp3`);
      await this.ttsService.generateTTS(text, voiceId, tmpPath, settings, {
        previous_text,
        next_text,
      });

      res.sendFile(tmpPath, () => {
        try {
          fs.unlinkSync(tmpPath);
        } catch (e) {
          // Ignore cleanup errors
        }
      });
    } catch (err) {
      console.error('Preview error:', err);
      throw new HttpException(err.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getJobStatus(id: string): Promise<Job | { status: 'not_found' }> {
    const job = this.jobs[id];
    if (job) return job;

    // Try to restore from DB
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (story?.scriptData && story.status === 'draft') {
      const { script, voiceMap, systemPrompt } = story.scriptData as any;
      this.jobs[id] = {
        status: 'preview',
        script,
        voiceMap,
        prompt: story.prompt,
        ageGroup: String(story.age || '5'),
        systemPrompt,
      };
      return this.jobs[id];
    }

    return { status: 'not_found' as const };
  }
}