import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Character } from './claude.service';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { promisify } from 'util';
const exec = promisify(require('child_process').exec);

export interface VoiceSettings {
  stability?: number;
  similarity_boost?: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface ContextSettings {
  previous_text?: string;
  next_text?: string;
}

export interface VoiceInfo {
  name: string;
  desc: string;
  category: string;
}

@Injectable()
export class TtsService {
  private readonly EL_VOICES = {
    narrator: 'GoXyzBapJk3AoCJoMQl9',  // Daniel — neutral, professionell
    child_m: [
      'Ewvy14akxdhONg4fmNry',  // Finnegan — neugierig, aufgeweckt, mutig
      'LRpNiUBlcqgIsKUzcrlN',  // Georg — lustig, emotional, albern
      '8RjxcQ6tY1F2YZiIvWqY',  // Jasper — schüchtern, zurückhaltend, leise
    ],
    child_f: [
      '9sjP3TfMlzEjAa6uXh3A',  // Kelly — fröhlich, lebhaft
      'xOKkuQfZt5N7XfbFdn9W',  // Lucy Fennek — warm, einfühlsam
      'VD1if7jDVYtAKs4P0FIY',  // Milly Maple — hell, fröhlich, quirlig
    ],
    adult_m: [
      'tqsaTjde7edL1GHtFchL',  // Ben Smile — warmherzig, vertrauenswürdig, Vater-Typ
      'dFA3XRddYScy6ylAYTIO',  // Helmut — sanft, märchenhaft, liebevoll
      'wloRHjPaKZv3ucH7TQOT',  // Jorin — ruhig, freundlich
      '8tJgFGd1nr7H5KLTvjjt',  // Captain Comedy — durchgeknallt, verrückt, Spaßvogel
      '6n4YmXLiuP4C7cZqYOJl',  // Finn — locker, modern, cool
      'eWmswbut7I70CIuRsFwP',  // Frankie Slim — gerissen, verschmitzt, Trickster
      'UFO0Yv86wqRxAt1DmXUu',  // Sarcastic Villain — sarkastisch, durchtrieben, Bösewicht
      'h1IssowVS2h4nL5ZbkkK',  // The Fox — streng, dominant, Bösewicht
    ],
    adult_f: [
      '3t6439mGAsHvQFPpoPdf',  // Raya — warm, natürlich, Mama-Typ
      'XNYSrtboH10kulPETnVC',  // Celestine Hohenstein — arrogant, hochnäsig, Königin/Stiefmutter
    ],
    elder_f: [
      'VNHNa6nN6yJdVF3YRyuF',  // Hilde — liebevolle Oma, warmherzig
    ],
    elder_m: [
      // TODO: Opa-Stimme finden
    ],
    creature: [
      'LRpNiUBlcqgIsKUzcrlN',  // Georg — lustig, emotional, freundliche Drachen/Trolle
      'eWmswbut7I70CIuRsFwP',  // Frankie Slim — verschmitzt, schlaue Füchse/Kobolde
      'UFO0Yv86wqRxAt1DmXUu',  // Sarcastic Villain — durchtrieben, böse Zauberer/Drachen
      '8tJgFGd1nr7H5KLTvjjt',  // Captain Comedy — verrückt, chaotische Kreaturen
    ],
  };

  // Trait-to-voice mapping
  private readonly TRAIT_VOICE_MAP = {
    child_m: {
      'mutig,neugierig,aufgeweckt':   'Ewvy14akxdhONg4fmNry',  // Finnegan
      'lustig,albern,fröhlich':       'LRpNiUBlcqgIsKUzcrlN',  // Georg
      'schüchtern,ruhig,leise':       '8RjxcQ6tY1F2YZiIvWqY',  // Jasper
    },
    child_f: {
      'fröhlich,lebhaft,mutig':       '9sjP3TfMlzEjAa6uXh3A',  // Kelly
      'warm,liebevoll,einfühlsam':    'xOKkuQfZt5N7XfbFdn9W',  // Lucy Fennek
      'fröhlich,quirlig,lustig':      'VD1if7jDVYtAKs4P0FIY',  // Milly Maple
    },
    adult_m: {
      'warm,liebevoll,stolz,fröhlich,episch,kräftig,märchenhaft': 'g1jpii0iyvtRs8fqXsd1',  // Helmut Epic — Default Papa-Stimme
      'laut,neutral':                    'ruSJRhA64v8HAqiqKXVw',  // Thomas
      'emotional,nett,freundlich,ruhig': 'Tsns2HvNFKfGiNjllgqo',  // Sven
      'vertrauenswürdig,sanft':          'wloRHjPaKZv3ucH7TQOT',  // Jorin
      'sanft,liebevoll':                 'dFA3XRddYScy6ylAYTIO',  // Helmut (sanft)
      'dominant,streng,autoritär':       'tqsaTjde7edL1GHtFchL',  // Ben Smile
      'verrückt,lustig,albern':          '8tJgFGd1nr7H5KLTvjjt',  // Captain Comedy
      'cool,locker,modern':              '6n4YmXLiuP4C7cZqYOJl',  // Finn
      'verschmitzt,gerissen,gelangweilt': 'eWmswbut7I70CIuRsFwP',  // Frankie Slim — gelangweilte Männerstimme
      'sarkastisch,durchtrieben':        'UFO0Yv86wqRxAt1DmXUu',  // Sarcastic Villain
      'streng,dominant':                 'h1IssowVS2h4nL5ZbkkK',  // The Fox
    },
    adult_f: {
      'warm,liebevoll,mütterlich':       '3t6439mGAsHvQFPpoPdf',  // Raya
      'arrogant,hochnäsig,streng':       'XNYSrtboH10kulPETnVC',  // Celestine Hohenstein
    },
    elder_f: {
      'warm,liebevoll':                  'VNHNa6nN6yJdVF3YRyuF',  // Hilde
    },
    elder_m: {},
    creature: {
      'lustig,freundlich,emotional,albern,liebevoll,warm,fröhlich': 'LRpNiUBlcqgIsKUzcrlN',  // Georg — default für Drachen, Trolle, freundliche Kreaturen
      'durchtrieben,sarkastisch,böse':   'UFO0Yv86wqRxAt1DmXUu',  // Sarcastic Villain
      'verrückt,chaotisch':              '8tJgFGd1nr7H5KLTvjjt',  // Captain Comedy
      'verschmitzt,gerissen,schlau':     'eWmswbut7I70CIuRsFwP',  // Frankie Slim — nur für wirklich gerissene Kreaturen
    },
  };

  // Voice directory with names for UI
  private readonly VOICE_DIRECTORY: { [key: string]: VoiceInfo } = {
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

  public readonly DEFAULT_VOICE_SETTINGS: VoiceSettings = {
    stability: 0.35,
    similarity_boost: 0.75,
    style: 0.6,
    use_speaker_boost: false,
  };

  private readonly FIXED_VOICES: { [name: string]: string } = {};
  private readonly sfxCache = new Map<string, string>();

  constructor(private configService: ConfigService) {}

  getVoiceDirectory(): { [key: string]: VoiceInfo } {
    return this.VOICE_DIRECTORY;
  }

  // Find best voice match based on character traits
  private matchVoiceByTraits(
    gender: string,
    traits: string[],
    usedVoices: Set<string>,
  ): string | null {
    const traitMap = this.TRAIT_VOICE_MAP[gender];
    if (!traitMap || !traits?.length) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const [traitStr, voiceId] of Object.entries(traitMap)) {
      if (usedVoices.has(voiceId as string)) continue; // avoid duplicates
      const voiceTraits = traitStr.split(',');
      const score = traits.filter(t => 
        voiceTraits.some(vt => vt.includes(t) || t.includes(vt))
      ).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = voiceId as string;
      }
    }
    return bestMatch;
  }

  // Voice assignment for characters
  assignVoices(characters: Character[]): { [name: string]: string } {
    const voiceMap: { [name: string]: string } = {};
    const usedVoices = new Set<string>();
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
      } else if (char.name === 'Erzähler') {
        voiceMap[char.name] = this.EL_VOICES.narrator;
        usedVoices.add(this.EL_VOICES.narrator);
      } else {
        const gender = char.gender || 'adult_m';
        // Try trait-based matching first
        const traitMatch = this.matchVoiceByTraits(gender, char.traits, usedVoices);
        if (traitMatch) {
          voiceMap[char.name] = traitMatch;
        } else {
          // Fallback: sequential assignment from pool
          const pool = this.EL_VOICES[gender];
          if (pool?.length) {
            // Find first unused voice in pool
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
          } else {
            // Empty pool (e.g. elder_m) — fallback to adult equivalent
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

  async generateTTS(
    text: string,
    voiceId: string,
    outputPath: string,
    voiceSettings: VoiceSettings = this.DEFAULT_VOICE_SETTINGS,
    context: ContextSettings = {},
  ): Promise<void> {
    const ELEVENLABS_API_KEY = this.configService.get<string>('ELEVENLABS_API_KEY');

    if (!ELEVENLABS_API_KEY) {
      throw new Error('ELEVENLABS_API_KEY not configured');
    }

    const body: any = {
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: voiceSettings,
    };

    if (context.previous_text) body.previous_text = context.previous_text;
    if (context.next_text) body.next_text = context.next_text;

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
    // Write raw TTS output, then normalize volume per line
    const rawPath = outputPath.replace('.mp3', '_raw.mp3');
    fs.writeFileSync(rawPath, buffer);

    try {
      await exec(`ffmpeg -y -i "${rawPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -q:a 2 "${outputPath}" 2>/dev/null`);
      fs.unlinkSync(rawPath);
    } catch {
      // If processing fails, use raw file
      if (fs.existsSync(rawPath)) {
        fs.renameSync(rawPath, outputPath);
      }
    }
  }

  async generateSFX(description: string, outputPath: string): Promise<string | null> {
    // Check cache first
    const cacheKey = description.toLowerCase().trim();
    if (this.sfxCache.has(cacheKey)) {
      fs.copyFileSync(this.sfxCache.get(cacheKey), outputPath);
      return outputPath;
    }

    const ELEVENLABS_API_KEY = this.configService.get<string>('ELEVENLABS_API_KEY');

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
      return null; // non-fatal: skip SFX if it fails
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
    this.sfxCache.set(cacheKey, outputPath);
    return outputPath;
  }
}