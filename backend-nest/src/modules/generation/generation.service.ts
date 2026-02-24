import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeService, Script, Character, ReviewResult, ReviewSuggestion } from '../../services/claude.service';
import { TtsService } from '../../services/tts.service';
import { AudioService } from '../../services/audio.service';
import { ReplicateService } from '../../services/replicate.service';
import { VoicesService } from '../voices/voices.service';
import { GenerateStoryDto, PreviewLineDto } from '../../dto/generation.dto';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { charEmoji } from '../../utils/char-emoji';
import { CostTrackingService } from '../../services/cost-tracking.service';
import * as fs from 'fs';
import * as path from 'path';

export interface Job {
  status: 'waiting_for_script' | 'preview' | 'generating_audio' | 'done' | 'error';
  progress?: string;
  title?: string;
  script?: Script;
  voiceMap?: { [name: string]: string };
  prompt?: string;
  age?: number;
  systemPrompt?: string;
  error?: string;
  completedAt?: number;
  startedAt?: number;
  story?: any;
}

interface GenerationState {
  status: 'waiting_for_script' | 'preview' | 'generating_audio' | 'done' | 'error';
  progress?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

@Injectable()
export class GenerationService {
  private readonly AUDIO_DIR = path.resolve('../audio');
  private readonly COVERS_DIR = path.resolve('./covers');

  constructor(
    private prisma: PrismaService,
    private claudeService: ClaudeService,
    private ttsService: TtsService,
    private audioService: AudioService,
    private replicateService: ReplicateService,
    private voicesService: VoicesService,
    private costTracking: CostTrackingService,
  ) {}

  private async updateGenerationState(id: string, state: Partial<GenerationState>) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    const scriptData = (story?.scriptData as any) || {};
    const existing = scriptData.generationState || {};
    scriptData.generationState = { ...existing, ...state };
    await this.prisma.$executeRawUnsafe(
      `UPDATE stories SET script_data = $1::jsonb WHERE id = $2::uuid`,
      JSON.stringify(scriptData),
      id,
    );
  }

  private async getScriptData(id: string): Promise<any> {
    const story = await this.prisma.story.findUnique({ where: { id } });
    return story?.scriptData as any;
  }

  async generateStory(dto: GenerateStoryDto) {
    const { prompt, age = 6, characters, systemPromptOverride, storyId } = dto;

    if (!prompt) {
      throw new HttpException('Prompt ist erforderlich', HttpStatus.BAD_REQUEST);
    }

    const id = storyId || uuidv4();

    // Ensure story row exists
    const existing = await this.prisma.story.findUnique({ where: { id } });
    if (existing) {
      await this.prisma.story.update({
        where: { id },
        data: {
          status: 'requested',
          scriptData: {
            generationState: { status: 'waiting_for_script', progress: 'Skript wird geschrieben...', startedAt: Date.now() },
          } as any,
        },
      });
    } else {
      await this.prisma.story.create({
        data: {
          id,
          status: 'requested',
          prompt,
          age: age || null,
          scriptData: {
            generationState: { status: 'waiting_for_script', progress: 'Skript wird geschrieben...', startedAt: Date.now() },
          } as any,
        },
      });
    }

    // Start generation async
    this.generateScriptAsync(id, prompt, age, characters, systemPromptOverride);

    return { id, status: 'accepted' };
  }

  private async generateScriptAsync(id: string, prompt: string, age: number, characters: any, systemPromptOverride?: string) {
    try {
      await this.updateGenerationState(id, { progress: 'Skript wird geschrieben...' });

      const { script, systemPrompt, usage } = await this.claudeService.generateScript(
        prompt,
        age,
        characters,
        systemPromptOverride,
      );

      // Track Claude cost
      if (usage) {
        await this.costTracking.trackClaude(id, 'generate', usage, usage.thinking_tokens).catch(() => {});
      }

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

      // Assign emojis to characters
      for (const c of script.characters) {
        if (!c.emoji) c.emoji = charEmoji(c.name, c.gender);
      }

      // Preview mode: stop here and let user confirm
      const voiceMap = this.ttsService.assignVoices(script.characters);

      // Persist draft to DB
      await this.prisma.story.update({
        where: { id },
        data: {
          status: 'draft',
          title: script.title,
          prompt,
          summary: script.summary || null,
          scriptData: {
            script,
            voiceMap,
            systemPrompt,
            generationState: { status: 'preview' },
          } as any,
        },
      });
    } catch (err) {
      console.error('Script generation error:', err);
      await this.updateGenerationState(id, {
        status: 'error',
        error: err.message,
        completedAt: Date.now(),
      });
    }
  }

  async confirmScript(id: string) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story?.scriptData || story.status !== 'draft') {
      throw new NotFoundException('Kein Skript zur Bestätigung gefunden');
    }

    const scriptData = story.scriptData as any;
    const { script, voiceMap, systemPrompt } = scriptData;

    // Update state to generating_audio
    scriptData.generationState = { status: 'generating_audio', progress: 'Stimmen werden eingesprochen...' };
    await this.prisma.$executeRawUnsafe(
      `UPDATE stories SET script_data = $1::jsonb WHERE id = $2::uuid`,
      JSON.stringify(scriptData),
      id,
    );

    // Start audio generation async
    this.generateAudioAsync(id, script, voiceMap, story.prompt, Number(story.age) || 6, systemPrompt);

    return { status: 'confirmed' };
  }

  private async generateAudioAsync(
    id: string,
    script: Script,
    voiceMap: { [name: string]: string },
    prompt: string,
    age: number,
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
      const segments = [];
      const sceneBreaks: number[] = [];
      let lineIdx = 0;
      const allLines: { speaker: string; text: string }[] = [];
      for (const scene of script.scenes) {
        if (allLines.length > 0) sceneBreaks.push(allLines.length - 1);
        allLines.push(...scene.lines);
      }
      const totalLines = allLines.length;

      // Load per-voice settings from DB
      const voiceSettingsMap: { [voiceId: string]: any } = {};
      for (const voiceId of new Set(Object.values(voiceMap))) {
        voiceSettingsMap[voiceId] = await this.voicesService.getSettingsForVoice(voiceId);
      }

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
          voiceSettingsMap[voice] || this.ttsService.DEFAULT_VOICE_SETTINGS,
          { previous_text, next_text },
        );

        segments.push(ttsPath);
        lineIdx++;
        await this.updateGenerationState(id, { progress: `Stimmen: ${lineIdx}/${totalLines}` });
      }

      // Track ElevenLabs TTS cost
      const totalChars = allLines.reduce((sum, l) => sum + l.text.length, 0);
      await this.costTracking.trackElevenLabs(id, 'tts_production', totalChars).catch(() => {});

      await this.updateGenerationState(id, { progress: 'Audio wird zusammengemischt...' });
      const finalPath = path.join(this.AUDIO_DIR, `${id}.mp3`);

      // Load audio mix settings from DB
      const { DEFAULT_AUDIO_SETTINGS } = require('../../services/audio.service');
      let mixSettings = { ...DEFAULT_AUDIO_SETTINGS };
      try {
        const rows = await this.prisma.$queryRaw`SELECT key, value FROM audio_settings` as any[];
        rows.forEach((r: any) => { mixSettings[r.key] = Number(r.value); });
      } catch {}

      await this.audioService.combineAudio(segments, finalPath, this.AUDIO_DIR, sceneBreaks, mixSettings);

      // Wait for cover to finish
      const coverUrl = await coverPromise;
      console.log(`Cover for ${id}: ${coverUrl || 'none'}`);
      if (coverUrl) {
        await this.costTracking.trackReplicate(id, 'cover', 1).catch(() => {});
      }

      // Save to database (updates status to 'produced')
      const story = await this.insertStory(id, script, voiceMap, prompt, age, systemPrompt, coverUrl);

      // Update generationState to done (insertStory overwrites scriptData, so update after)
      await this.updateGenerationState(id, {
        status: 'done',
        completedAt: Date.now(),
      });
    } catch (err) {
      console.error('Audio generation error:', err);
      await this.updateGenerationState(id, {
        status: 'error',
        error: err.message,
        completedAt: Date.now(),
      });
    }
  }

  private async insertStory(
    storyId: string,
    script: Script,
    voiceMap: { [name: string]: string },
    prompt: string,
    age: number,
    systemPrompt: string,
    coverUrl?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const hasHeroName = /^Name:/.test(prompt);
      const hasSideChars = script.characters.length > 2;
      const testGroup = hasHeroName ? (hasSideChars ? 'A' : 'B') : 'C';

      const storyData = {
        title: script.title,
        prompt: prompt,
        summary: script.summary || null,
        age: age || null,
        audioPath: `audio/${storyId}.mp3`,
        systemPrompt: systemPrompt || null,
        coverUrl: coverUrl || null,
        testGroup,
        status: 'produced',
        scriptData: { script, voiceMap, systemPrompt } as any,
      };
      const story = await tx.story.upsert({
        where: { id: storyId },
        update: storyData,
        create: { id: storyId, ...storyData, createdAt: new Date() },
      });

      await tx.character.deleteMany({ where: { storyId } });
      await tx.line.deleteMany({ where: { storyId } });

      for (const char of script.characters) {
        await tx.character.create({
          data: {
            storyId: storyId,
            name: char.name,
            gender: char.gender,
            voiceId: voiceMap[char.name] || null,
            emoji: char.emoji || charEmoji(char.name, char.gender),
            description: char.description || null,
          },
        });
      }

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

  async replaceLine(body: { storyId: string; lineId: number; voiceId: string; text: string; voiceSettings?: any }) {
    const { storyId, lineId, voiceId, text, voiceSettings } = body;

    const line = await this.prisma.line.findUnique({ where: { id: lineId } });
    if (!line) throw new NotFoundException('Line not found');

    const allLines = await this.prisma.line.findMany({
      where: { storyId },
      orderBy: [{ sceneIdx: 'asc' }, { lineIdx: 'asc' }],
    });

    const lineIndex = allLines.findIndex(l => l.id === lineId);
    const previous_text = lineIndex > 0
      ? allLines.slice(Math.max(0, lineIndex - 2), lineIndex).map(l => l.text).join(' ')
      : undefined;
    const next_text = lineIndex < allLines.length - 1 ? allLines[lineIndex + 1].text : undefined;

    let settings = voiceSettings;
    if (!settings) {
      settings = await this.voicesService.getSettingsForVoice(voiceId) || this.ttsService.DEFAULT_VOICE_SETTINGS;
    }

    const globalIdx = lineIndex;
    const linesDir = path.join(this.AUDIO_DIR, 'lines', storyId);
    const linePath = path.join(linesDir, `line_${globalIdx}.mp3`);

    await this.ttsService.generateTTS(text, voiceId, linePath, settings, { previous_text, next_text });

    await this.costTracking.trackElevenLabs(storyId, 'tts_replace', text.length).catch(() => {});

    if (text !== line.text) {
      await this.prisma.line.update({ where: { id: lineId }, data: { text } });
    }

    const segments: string[] = [];
    const sceneBreaks: number[] = [];
    let lastScene = -1;
    for (let i = 0; i < allLines.length; i++) {
      if (lastScene >= 0 && allLines[i].sceneIdx !== lastScene) {
        sceneBreaks.push(i - 1);
      }
      lastScene = allLines[i].sceneIdx;
      segments.push(path.join(linesDir, `line_${i}.mp3`));
    }

    const { DEFAULT_AUDIO_SETTINGS } = require('../../services/audio.service');
    let mixSettings = { ...DEFAULT_AUDIO_SETTINGS };
    try {
      const rows = await this.prisma.$queryRaw`SELECT key, value FROM audio_settings` as any[];
      rows.forEach((r: any) => { mixSettings[r.key] = Number(r.value); });
    } catch {}

    const finalPath = path.join(this.AUDIO_DIR, `${storyId}.mp3`);
    await this.audioService.combineAudio(segments, finalPath, this.AUDIO_DIR, sceneBreaks, mixSettings);

    return { ok: true, lineIndex: globalIdx, audioPath: `audio/lines/${storyId}/line_${globalIdx}.mp3` };
  }

  async getJobStatus(id: string): Promise<Job | { status: 'not_found' }> {
    // Validate UUID format
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return { status: 'not_found' as const };
    }

    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) return { status: 'not_found' as const };

    const scriptData = story.scriptData as any;
    const genState: GenerationState = scriptData?.generationState || {};

    // If story is produced/sent and no active generation state, return done
    if (['produced', 'sent', 'feedback'].includes(story.status) && (!genState.status || genState.status === 'done')) {
      return {
        status: 'done',
        completedAt: genState.completedAt,
        story: {
          id: story.id,
          title: story.title,
          status: story.status,
          audioUrl: `/api/audio/${id}`,
          characters: scriptData?.script?.characters?.map((c: any) => ({ name: c.name, gender: c.gender })),
          voiceMap: scriptData?.voiceMap,
        },
      };
    }

    // Draft with preview state
    if (story.status === 'draft' && (!genState.status || genState.status === 'preview')) {
      return {
        status: 'preview',
        script: scriptData?.script,
        voiceMap: scriptData?.voiceMap,
        prompt: story.prompt,
        age: Number(story.age) || 6,
        systemPrompt: scriptData?.systemPrompt,
      };
    }

    // Active generation states
    if (genState.status === 'waiting_for_script') {
      return {
        status: 'waiting_for_script',
        progress: genState.progress || 'Skript wird geschrieben...',
        startedAt: genState.startedAt,
      };
    }

    if (genState.status === 'generating_audio') {
      return {
        status: 'generating_audio',
        progress: genState.progress || 'Stimmen werden eingesprochen...',
        title: scriptData?.script?.title,
      };
    }

    if (genState.status === 'error') {
      return {
        status: 'error',
        error: genState.error,
        completedAt: genState.completedAt,
      };
    }

    // Fallback for draft without generationState
    if (story.status === 'draft' && scriptData?.script) {
      return {
        status: 'preview',
        script: scriptData.script,
        voiceMap: scriptData.voiceMap,
        prompt: story.prompt,
        age: Number(story.age) || 6,
        systemPrompt: scriptData.systemPrompt,
      };
    }

    return { status: 'not_found' as const };
  }

  async regenerateScript(storyId: string, customPrompt?: string) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    if (story.status !== 'draft') throw new HttpException('Nur Entwürfe können neu generiert werden', HttpStatus.BAD_REQUEST);

    const prompt = customPrompt || story.prompt || (story as any).interests || '';
    const age = Number(story.age) || 6;
    const heroName = (story as any).heroName || null;

    if (customPrompt) {
      await this.prisma.story.update({
        where: { id: storyId },
        data: { interests: customPrompt },
      });
    }

    return this.generateStory({
      prompt,
      age,
      storyId,
      characters: heroName ? { hero: { name: heroName, age: String(age) } } : undefined,
    });
  }

  async reviewScript(storyId: string): Promise<ReviewResult> {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    if (!story.scriptData) throw new HttpException('No script data', HttpStatus.BAD_REQUEST);

    const { script } = story.scriptData as any;
    const age = Number(story.age) || 6;

    const result = await this.claudeService.reviewScript(script, age);
    if ((result as any).usage) {
      await this.costTracking.trackClaude(storyId, 'review', (result as any).usage).catch(() => {});
    }
    return result;
  }

  async applyReview(storyId: string, acceptedIndices: number[]): Promise<{ script: Script }> {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    if (!story.scriptData) throw new HttpException('No script data', HttpStatus.BAD_REQUEST);

    const scriptData = story.scriptData as any;
    const script: Script = JSON.parse(JSON.stringify(scriptData.script));

    return { script };
  }

  async applyReviewSuggestions(storyId: string, suggestions: ReviewSuggestion[]): Promise<Script> {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    if (!story.scriptData) throw new HttpException('No script data', HttpStatus.BAD_REQUEST);

    const scriptData = story.scriptData as any;
    const script: Script = JSON.parse(JSON.stringify(scriptData.script));

    const sorted = [...suggestions].sort((a, b) => {
      if (a.scene !== b.scene) return b.scene - a.scene;
      return b.lineIndex - a.lineIndex;
    });

    for (const s of sorted) {
      const scene = script.scenes[s.scene];
      if (!scene) continue;

      if (s.type === 'delete') {
        scene.lines.splice(s.lineIndex, 1);
      } else if (s.type === 'replace' && s.replacement) {
        if (scene.lines[s.lineIndex]) {
          scene.lines[s.lineIndex].text = s.replacement;
        }
      } else if (s.type === 'insert' && s.replacement && s.speaker) {
        scene.lines.splice(s.lineIndex, 0, { speaker: s.speaker, text: s.replacement });
      }
    }

    scriptData.script = script;
    await this.prisma.$executeRawUnsafe(
      `UPDATE stories SET script_data = $1::jsonb WHERE id = $2::uuid`,
      JSON.stringify(scriptData),
      storyId,
    );

    return script;
  }
}
