"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StoriesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const tts_service_1 = require("../../services/tts.service");
const audio_service_1 = require("../../services/audio.service");
const fs = require("fs");
const path = require("path");
let StoriesService = class StoriesService {
    constructor(prisma, ttsService, audioService) {
        this.prisma = prisma;
        this.ttsService = ttsService;
        this.audioService = audioService;
        this.AUDIO_DIR = path.resolve('../audio');
    }
    async getStories(showAll = false) {
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
                if (c.name)
                    voiceMap[c.name] = c.voiceId;
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
    async getStory(id) {
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
            throw new common_1.NotFoundException('Story nicht gefunden');
        }
        const characters = story.characters.map(c => ({
            name: c.name,
            gender: c.gender,
        }));
        const voiceMap = {};
        for (const c of story.characters) {
            if (c.name)
                voiceMap[c.name] = c.voiceId;
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
    async updateStatus(id, status) {
        const validStatuses = ['requested', 'draft', 'produced', 'sent', 'feedback'];
        if (!validStatuses.includes(status)) {
            throw new common_1.HttpException(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, common_1.HttpStatus.BAD_REQUEST);
        }
        const story = await this.prisma.story.update({
            where: { id },
            data: { status },
        });
        return { status: 'ok', newStatus: story.status };
    }
    async toggleFeatured(id, featured) {
        try {
            await this.prisma.story.update({
                where: { id },
                data: { featured },
            });
            return { status: 'ok', featured };
        }
        catch (error) {
            throw new common_1.HttpException('DB error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async voiceSwap(storyId, character, voiceId) {
        if (!character || !voiceId) {
            throw new common_1.HttpException('character and voiceId required', common_1.HttpStatus.BAD_REQUEST);
        }
        try {
            const story = await this.prisma.story.findUnique({
                where: { id: storyId },
            });
            if (!story) {
                throw new common_1.NotFoundException('Story nicht gefunden');
            }
            const updateResult = await this.prisma.character.updateMany({
                where: {
                    storyId,
                    name: character,
                },
                data: { voiceId },
            });
            if (updateResult.count === 0) {
                throw new common_1.NotFoundException('Character nicht gefunden');
            }
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
            let globalIdx = 0;
            for (let i = 0; i < allLines.length; i++) {
                const line = allLines[i];
                const linePath = path.join(linesDir, `line_${globalIdx}.mp3`);
                if (line.speaker === character) {
                    const previous_text = i > 0 ?
                        allLines.slice(Math.max(0, i - 2), i).map(l => l.text).join(' ') :
                        undefined;
                    const next_text = i < allLines.length - 1 ? allLines[i + 1].text : undefined;
                    await this.ttsService.generateTTS(line.text, voiceId, linePath, voiceSettings, { previous_text, next_text });
                    await this.prisma.line.update({
                        where: { id: line.id },
                        data: { audioPath: `audio/lines/${storyId}/line_${globalIdx}.mp3` },
                    });
                }
                globalIdx++;
            }
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
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.HttpException) {
                throw error;
            }
            console.error('Voice update error:', error);
            throw new common_1.HttpException(error.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async deleteStory(id) {
        try {
            await this.prisma.story.delete({
                where: { id },
            });
            return { status: 'ok' };
        }
        catch (error) {
            throw new common_1.HttpException('DB error', common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
};
exports.StoriesService = StoriesService;
exports.StoriesService = StoriesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        tts_service_1.TtsService,
        audio_service_1.AudioService])
], StoriesService);
//# sourceMappingURL=stories.service.js.map