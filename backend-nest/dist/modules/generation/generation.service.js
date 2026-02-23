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
exports.GenerationService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const claude_service_1 = require("../../services/claude.service");
const tts_service_1 = require("../../services/tts.service");
const audio_service_1 = require("../../services/audio.service");
const replicate_service_1 = require("../../services/replicate.service");
const uuid_1 = require("uuid");
const fs = require("fs");
const path = require("path");
let GenerationService = class GenerationService {
    constructor(prisma, claudeService, ttsService, audioService, replicateService) {
        this.prisma = prisma;
        this.claudeService = claudeService;
        this.ttsService = ttsService;
        this.audioService = audioService;
        this.replicateService = replicateService;
        this.AUDIO_DIR = path.resolve('../audio');
        this.COVERS_DIR = path.resolve('./covers');
        this.jobs = {};
        setInterval(() => {
            const now = Date.now();
            for (const [id, job] of Object.entries(this.jobs)) {
                if (job.completedAt && now - job.completedAt > 30 * 60 * 1000) {
                    delete this.jobs[id];
                }
            }
        }, 5 * 60 * 1000);
    }
    async generateStory(dto) {
        const { prompt, ageGroup = '5-7', characters, systemPromptOverride, storyId } = dto;
        if (!prompt) {
            throw new common_1.HttpException('Prompt ist erforderlich', common_1.HttpStatus.BAD_REQUEST);
        }
        const id = storyId || (0, uuid_1.v4)();
        this.jobs[id] = {
            status: 'waiting_for_script',
            progress: 'Skript wird geschrieben...',
            startedAt: Date.now(),
        };
        this.generateScriptAsync(id, prompt, ageGroup, characters, systemPromptOverride);
        return { id, status: 'accepted' };
    }
    async generateScriptAsync(id, prompt, ageGroup, characters, systemPromptOverride) {
        try {
            this.jobs[id].progress = 'Skript wird geschrieben...';
            const { script, systemPrompt } = await this.claudeService.generateScript(prompt, ageGroup, characters, systemPromptOverride);
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
            if (!script.characters.find(c => c.name === 'Erzähler')) {
                script.characters.unshift({
                    name: 'Erzähler',
                    gender: 'adult_m',
                    traits: ['neutral'],
                });
            }
            const voiceMap = this.ttsService.assignVoices(script.characters);
            const existingStory = await this.prisma.story.findUnique({ where: { id } });
            if (existingStory) {
                await this.prisma.story.update({
                    where: { id },
                    data: {
                        status: 'draft',
                        title: script.title,
                        summary: script.summary || null,
                        scriptData: { script, voiceMap, systemPrompt },
                    },
                });
            }
            else {
                await this.prisma.story.create({
                    data: {
                        id,
                        status: 'draft',
                        title: script.title,
                        prompt,
                        summary: script.summary || null,
                        age: parseFloat(ageGroup) || null,
                        scriptData: { script, voiceMap, systemPrompt },
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
        }
        catch (err) {
            console.error('Script generation error:', err);
            this.jobs[id] = {
                status: 'error',
                error: err.message,
                completedAt: Date.now(),
            };
        }
    }
    async confirmScript(id) {
        let job = this.jobs[id];
        if (!job || job.status !== 'preview') {
            const story = await this.prisma.story.findUnique({ where: { id } });
            if (story?.scriptData && story.status === 'draft') {
                const { script, voiceMap, systemPrompt } = story.scriptData;
                job = {
                    status: 'preview',
                    script,
                    voiceMap,
                    prompt: story.prompt,
                    ageGroup: String(story.age || '5'),
                    systemPrompt,
                };
                this.jobs[id] = job;
            }
            else {
                throw new common_1.NotFoundException('Kein Skript zur Bestätigung gefunden');
            }
        }
        const { script, voiceMap, prompt, ageGroup, systemPrompt } = job;
        this.jobs[id] = {
            status: 'generating_audio',
            progress: 'Stimmen werden eingesprochen...',
            title: script.title,
        };
        this.generateAudioAsync(id, script, voiceMap, prompt, ageGroup, systemPrompt);
        return { status: 'confirmed' };
    }
    async generateAudioAsync(id, script, voiceMap, prompt, ageGroup, systemPrompt) {
        const linesDir = path.join(this.AUDIO_DIR, 'lines', id);
        fs.mkdirSync(linesDir, { recursive: true });
        const coverPromise = this.replicateService.generateCover(script.title, script.summary || prompt, script.characters, id, this.COVERS_DIR);
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
                await this.ttsService.generateTTS(line.text, voice, ttsPath, voiceSettings, { previous_text, next_text });
                segments.push(ttsPath);
                lineIdx++;
                this.jobs[id].progress = `Stimmen: ${lineIdx}/${totalLines}`;
            }
            this.jobs[id].progress = 'Audio wird zusammengemischt...';
            const finalPath = path.join(this.AUDIO_DIR, `${id}.mp3`);
            await this.audioService.combineAudio(segments, finalPath, this.AUDIO_DIR);
            const coverUrl = await coverPromise;
            console.log(`Cover for ${id}: ${coverUrl || 'none'}`);
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
        }
        catch (err) {
            console.error('Audio generation error:', err);
            this.jobs[id] = {
                status: 'error',
                error: err.message,
                completedAt: Date.now(),
            };
        }
    }
    async insertStory(storyId, script, voiceMap, prompt, ageGroup, systemPrompt, coverUrl) {
        return this.prisma.$transaction(async (tx) => {
            const hasHeroName = /^Name:/.test(prompt);
            const hasSideChars = script.characters.length > 2;
            const testGroup = hasHeroName ? (hasSideChars ? 'A' : 'B') : 'C';
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
    async previewLine(dto, res) {
        const { text, voiceId, voiceSettings, previous_text, next_text } = dto;
        if (!text || !voiceId) {
            throw new common_1.HttpException('text and voiceId required', common_1.HttpStatus.BAD_REQUEST);
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
                }
                catch (e) {
                }
            });
        }
        catch (err) {
            console.error('Preview error:', err);
            throw new common_1.HttpException(err.message, common_1.HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
    async getJobStatus(id) {
        const job = this.jobs[id];
        if (job)
            return job;
        const story = await this.prisma.story.findUnique({ where: { id } });
        if (story?.scriptData && story.status === 'draft') {
            const { script, voiceMap, systemPrompt } = story.scriptData;
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
        return { status: 'not_found' };
    }
};
exports.GenerationService = GenerationService;
exports.GenerationService = GenerationService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        claude_service_1.ClaudeService,
        tts_service_1.TtsService,
        audio_service_1.AudioService,
        replicate_service_1.ReplicateService])
], GenerationService);
//# sourceMappingURL=generation.service.js.map