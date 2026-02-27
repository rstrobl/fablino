import { Injectable, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CostTrackingService } from '../../services/cost-tracking.service';
import { ScriptData } from '../../types/script-data';

@Injectable()
export class StoriesService {
  constructor(
    private prisma: PrismaService,
    private costTracking: CostTrackingService,
  ) {}

  async createStory(body: { title?: string; heroName?: string; age?: number; prompt?: string }) {
    const { randomUUID } = require('crypto');
    const id = randomUUID();
    const title = body.title || (body.heroName ? `${body.heroName}s Hörspiel` : 'Neues Hörspiel');
    const story = await this.prisma.story.create({
      data: {
        id,
        title,
        heroName: body.heroName || null,
        age: body.age || null,
        prompt: body.prompt || null,
        status: 'draft',
      },
    });
    return { id: story.id };
  }

  async getStories(showAll: boolean = false) {
    const stories = await this.prisma.story.findMany({
      include: {
        characters: {
          select: {
            name: true,
            gender: true,
            voiceId: true,
            emoji: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    const formattedStories = stories.map(story => {
      const characters = story.characters.map(c => ({
        name: c.name,
        gender: c.gender,
        voiceId: c.voiceId || null,
        emoji: c.emoji || null,
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
        age: story.age,
        featured: story.featured,
        createdAt: story.createdAt,
        updatedAt: story.updatedAt,
        audioUrl: story.audioPath ? `/api/audio/${story.id}` : null,
        coverUrl: story.coverUrl || null,
        status: story.status || 'requested',
        requesterName: story.requesterName || null,
        requesterSource: story.requesterSource || null,
        requesterContact: story.requesterContact || null,
        interests: story.interests || null,
        heroName: story.heroName || null,
        testGroup: story.testGroup || null,
        durationSeconds: story.durationSeconds || null,
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
            emoji: true,
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
      voiceId: c.voiceId || null,
      emoji: c.emoji || null,
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
      age: story.age,
      createdAt: story.createdAt,
        updatedAt: story.updatedAt,
      audioUrl: story.audioPath ? `/api/audio/${story.id}` : null,
      coverUrl: story.coverUrl || null,
      status: story.status || 'requested',
      requesterName: story.requesterName || null,
      requesterSource: story.requesterSource || null,
      requesterContact: story.requesterContact || null,
      interests: story.interests || null,
        heroName: story.heroName || null,
      featured: story.featured,
      testGroup: story.testGroup || null,
      scriptData: story.scriptData || null,
      durationSeconds: story.durationSeconds || null,
      lines: story.lines,
    };
  }

  async updateStatus(id: string, status: string) {
    const validStatuses = ['requested', 'draft', 'produced', 'published', 'feedback'];
    if (!validStatuses.includes(status)) {
      throw new HttpException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, HttpStatus.BAD_REQUEST);
    }
    const data: any = { status };
    // When reverting to draft, clear audio so it can be re-generated
    if (status === 'draft') {
      data.audioPath = null;
    }
    const story = await this.prisma.story.update({
      where: { id },
      data,
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

  async updateVoiceMap(id: string, voiceMap: Record<string, string>) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) throw new NotFoundException('Story not found');
    const scriptData = (story as any).scriptData as any;
    if (!scriptData) throw new HttpException('No script data', HttpStatus.BAD_REQUEST);
    scriptData.voiceMap = voiceMap;
    await this.prisma.story.update({
      where: { id },
      data: { scriptData: scriptData as any },
    });
    return { status: 'ok', voiceMap };
  }

  async resetScript(id: string) {
    const story = await this.prisma.story.findUnique({ where: { id } });
    if (!story) throw new NotFoundException('Story not found');
    const scriptData = (story as any).scriptData as any || {};
    // Preserve userCharacters and pipeline, clear script
    await this.prisma.story.update({
      where: { id },
      data: {
        status: 'draft',
        scriptData: {
          userCharacters: scriptData.userCharacters || null,
          generationState: { status: 'draft' },
        } as any,
      },
    });
    return { status: 'ok' };
  }

  async updateCoverUrl(id: string, coverUrl: string) {
    await this.prisma.story.update({
      where: { id },
      data: { coverUrl },
    });
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
