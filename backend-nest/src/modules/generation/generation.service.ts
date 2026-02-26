import { Injectable, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ClaudeService, Script, isSfxLine } from '../../services/claude.service';
import { TtsService } from '../../services/tts.service';
import { AudioMixService } from '../../services/audio.service';
import { AudioPipelineService, AUDIO_DIR } from '../../services/audio-pipeline.service';
import { ReplicateService } from '../../services/replicate.service';
import { GenerateStoryDto } from '../../dto/generation.dto';
import { v4 as uuidv4 } from 'uuid';
import { promisify } from 'util';
import { exec as execCb } from 'child_process';
import { charEmoji } from '../../utils/char-emoji';

const execAsync = promisify(execCb);
import { CostTrackingService } from '../../services/cost-tracking.service';
import { SfxService } from '../sfx/sfx.service';
import { ScriptData, GenerationState } from '../../types/script-data';
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

@Injectable()
export class GenerationService {
  private readonly COVERS_DIR = path.resolve('./covers');

  constructor(
    private prisma: PrismaService,
    private claudeService: ClaudeService,
    private ttsService: TtsService,
    private audioService: AudioMixService,
    private audioPipeline: AudioPipelineService,
    private replicateService: ReplicateService,
    private costTracking: CostTrackingService,
    private sfxService: SfxService,
  ) {}

  private async updateGenerationState(id: string, state: Partial<GenerationState>) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    const scriptData = (story?.scriptData as unknown as ScriptData) || {} as any;
    const existing = scriptData.generationState || {};
    scriptData.generationState = { ...existing, ...state };
    await this.prisma.$executeRawUnsafe(
      `UPDATE stories SET script_data = $1::jsonb WHERE id = $2::uuid`,
      JSON.stringify(scriptData),
      id,
    );
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

      const { script, systemPrompt, pipeline, usage } = await this.claudeService.generateScript(
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
          if (isSfxLine(line)) continue;
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
          gender: 'male',
          age: 35,
          species: 'human',
          type: 'human',
          voice_character: 'kind',
        });
      }

      // Assign emojis to characters
      for (const c of script.characters) {
        if (!c.emoji) c.emoji = charEmoji(c.name, c.gender, Array.isArray(c.species) ? c.species : c.species ? [c.species] : undefined, c.age);
      }

      // Preview mode: stop here and let user confirm
      const voiceMap = await this.ttsService.assignVoices(script.characters);

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
            userCharacters: characters || null,
            generationState: { status: 'preview' },
          } as any,
        },
      });

      // Sync characters table for draft preview
      await this.prisma.character.deleteMany({ where: { storyId: id } });
      for (const char of script.characters) {
        await this.prisma.character.create({
          data: {
            storyId: id,
            name: char.name,
            gender: char.gender,
            voiceId: voiceMap[char.name] || null,
            emoji: char.emoji || charEmoji(char.name, char.gender, Array.isArray(char.species) ? char.species : char.species ? [char.species] : undefined, char.age),
            description: char.description || null,
          },
        });
      }
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

    const scriptData = story.scriptData as unknown as ScriptData;
    const { script, voiceMap, systemPrompt } = scriptData;

    // Update state to generating_audio
    (scriptData as any).generationState = { status: 'generating_audio', progress: 'Wird vertont...' };
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
    const linesDir = path.join(AUDIO_DIR, 'lines', id);
    fs.mkdirSync(linesDir, { recursive: true });

    try {
      // Flatten all lines across all scenes into chunks split at SFX boundaries
      const CHAR_LIMIT = 5000;
      const allLines: any[] = [];
      for (const scene of script.scenes) {
        for (const line of scene.lines) {
          allLines.push(line);
        }
      }

      // Group into chunks: consecutive dialogue lines separated by SFX
      const chunks: { type: 'dialogue' | 'sfx'; lines?: any[]; sfx?: string; duration?: number }[] = [];
      let currentDialogue: any[] = [];

      for (const line of allLines) {
        if (isSfxLine(line)) {
          if (currentDialogue.length > 0) {
            chunks.push({ type: 'dialogue', lines: currentDialogue });
            currentDialogue = [];
          }
          chunks.push({ type: 'sfx', sfx: line.sfx, duration: line.duration || 2 });
        } else {
          currentDialogue.push(line);
        }
      }
      if (currentDialogue.length > 0) {
        chunks.push({ type: 'dialogue', lines: currentDialogue });
      }

      await this.updateGenerationState(id, { progress: 'Wird vertont...' });

      // Generate each chunk
      const segments: string[] = [];
      const segmentTypes: ('dialogue' | 'sfx')[] = [];
      let totalChars = 0;

      for (let c = 0; c < chunks.length; c++) {
        const chunk = chunks[c];
        const chunkPath = path.join(linesDir, `chunk_${c}.mp3`);

        if (chunk.type === 'dialogue' && chunk.lines?.length) {
          // Build dialogue inputs, respecting char limit by sub-chunking if needed
          const dialogueInputs = chunk.lines.map((line: any) => {
            const emotion = line.emotion && line.emotion !== 'neutral' ? `[${line.emotion}] ` : '';
            return {
              text: `${emotion}${line.text}`,
              voice_id: voiceMap[line.speaker] || voiceMap['Erzähler'] || 'GoXyzBapJk3AoCJoMQl9',
            };
          });

          const chunkChars = dialogueInputs.reduce((sum, d) => sum + d.text.length, 0);
          totalChars += chunkChars;

          if (chunkChars <= CHAR_LIMIT) {
            // Single call for this dialogue block
            await this.ttsService.generateDialogue(dialogueInputs, chunkPath);
            console.log(`[produce] Dialogue chunk ${c}: ${chunkChars} chars (single call)`);
          } else {
            // Sub-chunk by char limit
            const subSegments: string[] = [];
            let subLines: typeof dialogueInputs = [];
            let subChars = 0;
            let subIndex = 0;

            for (const input of dialogueInputs) {
              if (subChars + input.text.length > CHAR_LIMIT && subLines.length > 0) {
                const subPath = path.join(linesDir, `chunk_${c}_sub_${subIndex}.mp3`);
                await this.ttsService.generateDialogue(subLines, subPath);
                subSegments.push(subPath);
                console.log(`[produce] Dialogue chunk ${c} sub ${subIndex}: ${subChars} chars`);
                subIndex++;
                subLines = [];
                subChars = 0;
              }
              subLines.push(input);
              subChars += input.text.length;
            }
            if (subLines.length > 0) {
              const subPath = path.join(linesDir, `chunk_${c}_sub_${subIndex}.mp3`);
              await this.ttsService.generateDialogue(subLines, subPath);
              subSegments.push(subPath);
              console.log(`[produce] Dialogue chunk ${c} sub ${subIndex}: ${subChars} chars`);
            }

            // Concat sub-chunks
            if (subSegments.length === 1) {
              fs.renameSync(subSegments[0], chunkPath);
            } else {
              await this.audioPipeline.concatSegments(subSegments, chunkPath);
            }
          }

          await this.updateGenerationState(id, { progress: `Audio: ${Math.round((c + 1) / chunks.length * 100)}%` });
        } else if (chunk.type === 'sfx' && chunk.sfx) {
          const localPath = await this.sfxService.getAudioPath(chunk.sfx);
          if (localPath) {
            fs.copyFileSync(localPath, chunkPath);
            console.log(`[produce] SFX "${chunk.sfx}" → local library`);
          } else {
            console.log(`[produce] SFX "${chunk.sfx}" → skipped (not in library)`);
          }
        }

        if (fs.existsSync(chunkPath)) {
          segments.push(chunkPath);
          segmentTypes.push(chunk.type === 'sfx' ? 'sfx' : 'dialogue');
        }
      }

      // Track ElevenLabs TTS cost
      await this.costTracking.trackElevenLabs(id, 'tts_production', totalChars).catch(() => {});

      await this.updateGenerationState(id, { progress: 'Wird vertont...' });

      // Final processing (combine with SFX pauses + loudnorm, fade in/out)
      await this.audioPipeline.recombineStoryAudio(id, segments, segmentTypes);

      // Calculate audio duration
      let durationSeconds: number | null = null;
      try {
        const { stdout } = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${path.join(AUDIO_DIR, `${id}.mp3`)}"`);
        durationSeconds = Math.round(parseFloat(stdout.trim()));
      } catch {}

      // Save to database (updates status to 'produced') — cover generated manually via admin
      const story = await this.insertStory(id, script, voiceMap, prompt, age, systemPrompt, undefined, durationSeconds);

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
    durationSeconds?: number | null,
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
        ...(coverUrl !== undefined ? { coverUrl } : {}),
        testGroup,
        status: 'produced',
        ...(durationSeconds ? { durationSeconds } : {}),
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
            emoji: char.emoji || charEmoji(char.name, char.gender, Array.isArray(char.species) ? char.species : char.species ? [char.species] : undefined, char.age),
            description: char.description || null,
          },
        });
      }

      let globalIdx = 0;
      for (let si = 0; si < script.scenes.length; si++) {
        for (let li = 0; li < script.scenes[si].lines.length; li++) {
          const line = script.scenes[si].lines[li];
          if (isSfxLine(line)) continue; // SFX lines are not stored in DB
          const audioPath = `audio/lines/${storyId}/line_${globalIdx}.mp3`;
          await tx.line.create({
            data: {
              storyId: storyId,
              sceneIdx: si,
              lineIdx: li,
              speaker: (line as any).speaker,
              text: (line as any).text,
              audioPath: audioPath,
            },
          });
          globalIdx++;
        }
      }

      return story;
    });
  }

  async getJobStatus(id: string): Promise<Job | { status: 'not_found' }> {
    // Validate UUID format
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return { status: 'not_found' as const };
    }

    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) return { status: 'not_found' as const };

    const scriptData = story.scriptData as unknown as unknown as ScriptData | null;
    const genState: Partial<GenerationState> = scriptData?.generationState || {};

    // If story is produced/sent and no active generation state, return done
    if (['produced', 'published', 'feedback'].includes(story.status) && (!genState.status || genState.status === 'done')) {
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
        progress: genState.progress || 'Wird vertont...',
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

  async regenerateScript(storyId: string, customPrompt?: string, characters?: any) {
    const story = await this.prisma.story.findUnique({ where: { id: storyId } });
    if (!story) throw new NotFoundException('Story not found');
    if (story.status !== 'draft') throw new HttpException('Nur Entwürfe können neu generiert werden', HttpStatus.BAD_REQUEST);

    const age = Number(story.age) || 6;
    const heroName = (story as any).heroName || null;

    // Build prompt: if custom prompt given, prepend hero info; otherwise use stored prompt
    let prompt = customPrompt || story.prompt || '';
    if (customPrompt && heroName) {
      prompt = `Name: ${heroName}, Alter: ${age} Jahre. Interessen/Thema: ${customPrompt}`;
    }

    if (customPrompt) {
      await this.prisma.story.update({
        where: { id: storyId },
        data: { interests: customPrompt },
      });
    }

    // Merge hero from DB with provided or previously stored sideCharacters
    const scriptData = (story as any).scriptData as any;
    const storedChars = scriptData?.userCharacters;
    const sideChars = characters?.sideCharacters?.length
      ? characters.sideCharacters
      : storedChars?.sideCharacters || [];

    const charData = {
      ...(heroName ? { hero: { name: heroName, age: String(age) } } : {}),
      ...(sideChars.length ? { sideCharacters: sideChars } : {}),
    };
    const hasChars = charData.hero || charData.sideCharacters;

    return this.generateStory({
      prompt,
      age,
      storyId,
      characters: hasChars ? charData : undefined,
    });
  }
}
