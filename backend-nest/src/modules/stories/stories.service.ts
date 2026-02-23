import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TtsService } from '../../services/tts.service';
import { AudioService } from '../../services/audio.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StoriesService {
  private readonly AUDIO_DIR = path.resolve('../audio');

  constructor(
    private prisma: PrismaService,
    private ttsService: TtsService,
    private audioService: AudioService,
  ) {}

  async getStories(showAll: boolean = false) {
    const stories = await this.prisma.story.findMany({
      include: {
        characters: {
          select: {
            name: true,
            gender: true,
            voiceId: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedStories = stories.map(story => {
      const characters = story.characters.map(c => ({
        name: c.name,
        gender: c.gender,
      }));

      const voiceMap = {};
      for (const c of story.characters) {
        if (c.name) voiceMap[c.name] = c.voiceId;
      }

      return {
        id: story.id,
        title: story.title,
        characters,
        voiceMap,
        prompt: story.prompt,
        summary: story.summary,
        ageGroup: story.ageGroup,
        featured: story.featured,
        createdAt: story.createdAt,
        audioUrl: story.audioPath ? `/api/audio/${story.id}` : null,
        coverUrl: story.coverUrl || null,
        status: story.status || 'requested',
      };
    });

    return showAll ? formattedStories : formattedStories.filter(s => s.featured);
  }

  async getStory(id: string) {
    const story = await this.prisma.story.findUnique({
      where: { id },
      include: {
        characters: {
          select: {
            name: true,
            gender: true,
            voiceId: true,
          },
        },
        lines: {
          orderBy: [
            { sceneIdx: 'asc' },
            { lineIdx: 'asc' },
          ],
        },
      },
    });

    if (!story) {
      throw new NotFoundException('Story nicht gefunden');
    }

    const characters = story.characters.map(c => ({
      name: c.name,
      gender: c.gender,
    }));

    const voiceMap = {};
    for (const c of story.characters) {
      if (c.name) voiceMap[c.name] = c.voiceId;
    }

    return {
      id: story.id,
      title: story.title,
      characters,
      voiceMap,
      prompt: story.prompt,
      summary: story.summary,
      ageGroup: story.ageGroup,
      createdAt: story.createdAt,
      audioUrl: story.audioPath ? `/api/audio/${story.id}` : null,
      coverUrl: story.coverUrl || null,
      lines: story.lines,
    };
  }

  async updateStatus(id: string, status: string) {
    const validStatuses = ['requested', 'draft', 'produced', 'sent', 'feedback'];
    if (!validStatuses.includes(status)) {
      throw new HttpException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, HttpStatus.BAD_REQUEST);
    }
    const story = await this.prisma.story.update({
      where: { id },
      data: { status },
    });
    return { status: 'ok', newStatus: story.status };
  }

  async toggleFeatured(id: string, featured: boolean) {
    try {
      await this.prisma.story.update({
        where: { id },
        data: { featured },
      });

      return { status: 'ok', featured };
    } catch (error) {
      throw new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async voiceSwap(storyId: string, character: string, voiceId: string) {
    if (!character || !voiceId) {
      throw new HttpException('character and voiceId required', HttpStatus.BAD_REQUEST);
    }

    try {
      // Check story exists
      const story = await this.prisma.story.findUnique({
        where: { id: storyId },
      });

      if (!story) {
        throw new NotFoundException('Story nicht gefunden');
      }

      // Update voice in characters table
      const updateResult = await this.prisma.character.updateMany({
        where: {
          storyId,
          name: character,
        },
        data: { voiceId },
      });

      if (updateResult.count === 0) {
        throw new NotFoundException('Character nicht gefunden');
      }

      // Get all lines for this story
      const allLines = await this.prisma.line.findMany({
        where: { storyId },
        orderBy: [
          { sceneIdx: 'asc' },
          { lineIdx: 'asc' },
        ],
      });

      if (allLines.length === 0) {
        return { status: 'no_lines', message: 'No lines in DB to regenerate' };
      }

      const voiceSettings = this.ttsService.DEFAULT_VOICE_SETTINGS;
      const linesDir = path.join(this.AUDIO_DIR, 'lines', storyId);
      fs.mkdirSync(linesDir, { recursive: true });

      // Regenerate only lines for the specified character (with context)
      let globalIdx = 0;
      for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];
        const linePath = path.join(linesDir, `line_${globalIdx}.mp3`);
        
        if (line.speaker === character) {
          const previous_text = i > 0 ? 
            allLines.slice(Math.max(0, i - 2), i).map(l => l.text).join(' ') : 
            undefined;
          const next_text = i < allLines.length - 1 ? allLines[i + 1].text : undefined;
          
          await this.ttsService.generateTTS(
            line.text,
            voiceId,
            linePath,
            voiceSettings,
            { previous_text, next_text },
          );
          
          await this.prisma.line.update({
            where: { id: line.id },
            data: { audioPath: `audio/lines/${storyId}/line_${globalIdx}.mp3` },
          });
        }
        globalIdx++;
      }

      // Recombine all lines
      const segments = [];
      for (let i = 0; i < allLines.length; i++) {
        const p = path.join(linesDir, `line_${i}.mp3`);
        if (fs.existsSync(p)) {
          segments.push(p);
        }
      }

      if (segments.length > 0) {
        const finalPath = path.join(this.AUDIO_DIR, `${storyId}.mp3`);
        await this.audioService.combineAudio(segments, finalPath, this.AUDIO_DIR);
      }

      const linesRegenerated = allLines.filter(l => l.speaker === character).length;
      return { status: 'ok', character, voiceId, linesRegenerated };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof HttpException) {
        throw error;
      }
      console.error('Voice update error:', error);
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async deleteStory(id: string) {
    try {
      // Delete will cascade to characters and lines due to Prisma schema
      await this.prisma.story.delete({
        where: { id },
      });
      
      return { status: 'ok' };
    } catch (error) {
      throw new HttpException('DB error', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}