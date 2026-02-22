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
exports.TtsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fs = require("fs");
const util_1 = require("util");
const exec = (0, util_1.promisify)(require('child_process').exec);
let TtsService = class TtsService {
    constructor(configService) {
        this.configService = configService;
        this.EL_VOICES = {
            narrator: 'GoXyzBapJk3AoCJoMQl9',
            child_m: [
                'Ewvy14akxdhONg4fmNry',
                'LRpNiUBlcqgIsKUzcrlN',
                '8RjxcQ6tY1F2YZiIvWqY',
            ],
            child_f: [
                '9sjP3TfMlzEjAa6uXh3A',
                'xOKkuQfZt5N7XfbFdn9W',
                'VD1if7jDVYtAKs4P0FIY',
            ],
            adult_m: [
                'tqsaTjde7edL1GHtFchL',
                'dFA3XRddYScy6ylAYTIO',
                'wloRHjPaKZv3ucH7TQOT',
                '8tJgFGd1nr7H5KLTvjjt',
                '6n4YmXLiuP4C7cZqYOJl',
                'eWmswbut7I70CIuRsFwP',
                'UFO0Yv86wqRxAt1DmXUu',
                'h1IssowVS2h4nL5ZbkkK',
            ],
            adult_f: [
                '3t6439mGAsHvQFPpoPdf',
                'XNYSrtboH10kulPETnVC',
            ],
            elder_f: [
                'VNHNa6nN6yJdVF3YRyuF',
            ],
            elder_m: [],
            creature: [
                'LRpNiUBlcqgIsKUzcrlN',
                'eWmswbut7I70CIuRsFwP',
                'UFO0Yv86wqRxAt1DmXUu',
                '8tJgFGd1nr7H5KLTvjjt',
            ],
        };
        this.TRAIT_VOICE_MAP = {
            child_m: {
                'mutig,neugierig,aufgeweckt': 'Ewvy14akxdhONg4fmNry',
                'lustig,albern,fröhlich': 'LRpNiUBlcqgIsKUzcrlN',
                'schüchtern,ruhig,leise': '8RjxcQ6tY1F2YZiIvWqY',
            },
            child_f: {
                'fröhlich,lebhaft,mutig': '9sjP3TfMlzEjAa6uXh3A',
                'warm,liebevoll,einfühlsam': 'xOKkuQfZt5N7XfbFdn9W',
                'fröhlich,quirlig,lustig': 'VD1if7jDVYtAKs4P0FIY',
            },
            adult_m: {
                'warm,liebevoll,stolz,fröhlich,episch,kräftig,märchenhaft': 'g1jpii0iyvtRs8fqXsd1',
                'laut,neutral': 'ruSJRhA64v8HAqiqKXVw',
                'emotional,nett,freundlich,ruhig': 'Tsns2HvNFKfGiNjllgqo',
                'vertrauenswürdig,sanft': 'wloRHjPaKZv3ucH7TQOT',
                'sanft,liebevoll': 'dFA3XRddYScy6ylAYTIO',
                'dominant,streng,autoritär': 'tqsaTjde7edL1GHtFchL',
                'verrückt,lustig,albern': '8tJgFGd1nr7H5KLTvjjt',
                'cool,locker,modern': '6n4YmXLiuP4C7cZqYOJl',
                'verschmitzt,gerissen,gelangweilt': 'eWmswbut7I70CIuRsFwP',
                'sarkastisch,durchtrieben': 'UFO0Yv86wqRxAt1DmXUu',
                'streng,dominant': 'h1IssowVS2h4nL5ZbkkK',
            },
            adult_f: {
                'warm,liebevoll,mütterlich': '3t6439mGAsHvQFPpoPdf',
                'arrogant,hochnäsig,streng': 'XNYSrtboH10kulPETnVC',
            },
            elder_f: {
                'warm,liebevoll': 'VNHNa6nN6yJdVF3YRyuF',
            },
            elder_m: {},
            creature: {
                'lustig,freundlich,emotional,albern,liebevoll,warm,fröhlich': 'LRpNiUBlcqgIsKUzcrlN',
                'durchtrieben,sarkastisch,böse': 'UFO0Yv86wqRxAt1DmXUu',
                'verrückt,chaotisch': '8tJgFGd1nr7H5KLTvjjt',
                'verschmitzt,gerissen,schlau': 'eWmswbut7I70CIuRsFwP',
            },
        };
        this.VOICE_DIRECTORY = {
            'GoXyzBapJk3AoCJoMQl9': { name: 'Daniel', desc: 'neutral, professionell', category: 'narrator' },
            'Ewvy14akxdhONg4fmNry': { name: 'Finnegan', desc: 'neugierig, aufgeweckt, mutig', category: 'child_m' },
            'LRpNiUBlcqgIsKUzcrlN': { name: 'Georg', desc: 'lustig, emotional, albern', category: 'child_m' },
            '8RjxcQ6tY1F2YZiIvWqY': { name: 'Jasper', desc: 'schüchtern, zurückhaltend', category: 'child_m' },
            '9sjP3TfMlzEjAa6uXh3A': { name: 'Kelly', desc: 'fröhlich, lebhaft', category: 'child_f' },
            'xOKkuQfZt5N7XfbFdn9W': { name: 'Lucy Fennek', desc: 'warm, einfühlsam', category: 'child_f' },
            'VD1if7jDVYtAKs4P0FIY': { name: 'Milly Maple', desc: 'hell, quirlig', category: 'child_f' },
            'g1jpii0iyvtRs8fqXsd1': { name: 'Helmut Epic', desc: 'episch, kräftig', category: 'adult_m' },
            'ruSJRhA64v8HAqiqKXVw': { name: 'Thomas', desc: 'laut, neutral', category: 'adult_m' },
            'Tsns2HvNFKfGiNjllgqo': { name: 'Sven', desc: 'emotional, nett', category: 'adult_m' },
            'wloRHjPaKZv3ucH7TQOT': { name: 'Jorin', desc: 'ruhig, freundlich', category: 'adult_m' },
            'dFA3XRddYScy6ylAYTIO': { name: 'Helmut', desc: 'sanft, märchenhaft', category: 'adult_m' },
            'tqsaTjde7edL1GHtFchL': { name: 'Ben Smile', desc: 'warmherzig, vertrauenswürdig', category: 'adult_m' },
            '8tJgFGd1nr7H5KLTvjjt': { name: 'Captain Comedy', desc: 'verrückt, Spaßvogel', category: 'adult_m' },
            '6n4YmXLiuP4C7cZqYOJl': { name: 'Finn', desc: 'locker, modern, cool', category: 'adult_m' },
            'eWmswbut7I70CIuRsFwP': { name: 'Frankie Slim', desc: 'gelangweilt, verschmitzt', category: 'adult_m' },
            'UFO0Yv86wqRxAt1DmXUu': { name: 'Sarcastic Villain', desc: 'sarkastisch, durchtrieben', category: 'adult_m' },
            'h1IssowVS2h4nL5ZbkkK': { name: 'The Fox', desc: 'streng, dominant', category: 'adult_m' },
            '3t6439mGAsHvQFPpoPdf': { name: 'Raya', desc: 'warm, natürlich, Mama-Typ', category: 'adult_f' },
            'XNYSrtboH10kulPETnVC': { name: 'Celestine', desc: 'arrogant, hochnäsig', category: 'adult_f' },
            'RMDEjuHXo5bcQLkbu6MB': { name: 'Janine', desc: 'verspielt, expressiv', category: 'adult_f' },
            'VNHNa6nN6yJdVF3YRyuF': { name: 'Hilde', desc: 'liebevolle Oma', category: 'elder_f' },
        };
        this.DEFAULT_VOICE_SETTINGS = {
            stability: 0.35,
            similarity_boost: 0.75,
            style: 0.6,
            use_speaker_boost: false,
        };
        this.FIXED_VOICES = {};
        this.sfxCache = new Map();
    }
    getVoiceDirectory() {
        return this.VOICE_DIRECTORY;
    }
    matchVoiceByTraits(gender, traits, usedVoices) {
        const traitMap = this.TRAIT_VOICE_MAP[gender];
        if (!traitMap || !traits?.length)
            return null;
        let bestMatch = null;
        let bestScore = 0;
        for (const [traitStr, voiceId] of Object.entries(traitMap)) {
            if (usedVoices.has(voiceId))
                continue;
            const voiceTraits = traitStr.split(',');
            const score = traits.filter(t => voiceTraits.some(vt => vt.includes(t) || t.includes(vt))).length;
            if (score > bestScore) {
                bestScore = score;
                bestMatch = voiceId;
            }
        }
        return bestMatch;
    }
    assignVoices(characters) {
        const voiceMap = {};
        const usedVoices = new Set();
        const counters = {
            child_m: 0,
            child_f: 0,
            adult_m: 0,
            adult_f: 0,
            elder_m: 0,
            elder_f: 0,
            creature: 0,
        };
        for (const char of characters) {
            if (this.FIXED_VOICES[char.name]) {
                voiceMap[char.name] = this.FIXED_VOICES[char.name];
                usedVoices.add(this.FIXED_VOICES[char.name]);
            }
            else if (char.name === 'Erzähler') {
                voiceMap[char.name] = this.EL_VOICES.narrator;
                usedVoices.add(this.EL_VOICES.narrator);
            }
            else {
                const gender = char.gender || 'adult_m';
                const traitMatch = this.matchVoiceByTraits(gender, char.traits, usedVoices);
                if (traitMatch) {
                    voiceMap[char.name] = traitMatch;
                }
                else {
                    const pool = this.EL_VOICES[gender];
                    if (pool?.length) {
                        let voice = null;
                        for (let i = 0; i < pool.length; i++) {
                            const idx = (counters[gender] + i) % pool.length;
                            if (!usedVoices.has(pool[idx])) {
                                voice = pool[idx];
                                counters[gender] = idx + 1;
                                break;
                            }
                        }
                        voiceMap[char.name] = voice || pool[counters[gender] % pool.length];
                    }
                    else {
                        const fallback = gender === 'elder_m' ? 'adult_m' :
                            gender === 'elder_f' ? 'adult_f' : 'adult_m';
                        const fbPool = this.EL_VOICES[fallback];
                        voiceMap[char.name] = fbPool[counters[fallback] % fbPool.length];
                        counters[fallback]++;
                    }
                }
                usedVoices.add(voiceMap[char.name]);
            }
        }
        return voiceMap;
    }
    async generateTTS(text, voiceId, outputPath, voiceSettings = this.DEFAULT_VOICE_SETTINGS, context = {}) {
        const ELEVENLABS_API_KEY = this.configService.get('ELEVENLABS_API_KEY');
        if (!ELEVENLABS_API_KEY) {
            throw new Error('ELEVENLABS_API_KEY not configured');
        }
        const body = {
            text,
            model_id: 'eleven_multilingual_v2',
            voice_settings: voiceSettings,
        };
        if (context.previous_text)
            body.previous_text = context.previous_text;
        if (context.next_text)
            body.next_text = context.next_text;
        const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`ElevenLabs ${response.status}: ${errText}`);
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const rawPath = outputPath.replace('.mp3', '_raw.mp3');
        fs.writeFileSync(rawPath, buffer);
        try {
            await exec(`ffmpeg -y -i "${rawPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -q:a 2 "${outputPath}" 2>/dev/null`);
            fs.unlinkSync(rawPath);
        }
        catch {
            if (fs.existsSync(rawPath)) {
                fs.renameSync(rawPath, outputPath);
            }
        }
    }
    async generateSFX(description, outputPath) {
        const cacheKey = description.toLowerCase().trim();
        if (this.sfxCache.has(cacheKey)) {
            fs.copyFileSync(this.sfxCache.get(cacheKey), outputPath);
            return outputPath;
        }
        const ELEVENLABS_API_KEY = this.configService.get('ELEVENLABS_API_KEY');
        if (!ELEVENLABS_API_KEY) {
            console.warn('ELEVENLABS_API_KEY not configured — skipping SFX');
            return null;
        }
        const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
            method: 'POST',
            headers: {
                'xi-api-key': ELEVENLABS_API_KEY,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: description,
                duration_seconds: 2.0,
                prompt_influence: 0.4,
            }),
        });
        if (!response.ok) {
            const errText = await response.text();
            console.warn(`SFX generation failed (${response.status}): ${errText} — skipping "${description}"`);
            return null;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        fs.writeFileSync(outputPath, buffer);
        this.sfxCache.set(cacheKey, outputPath);
        return outputPath;
    }
};
exports.TtsService = TtsService;
exports.TtsService = TtsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], TtsService);
//# sourceMappingURL=tts.service.js.map