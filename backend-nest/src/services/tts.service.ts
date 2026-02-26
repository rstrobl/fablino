import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../modules/prisma/prisma.service';
import { Character } from './claude.service';
import * as fs from 'fs';

interface DbVoice {
  voice_id: string;
  name: string;
  category: string;
  gender: string;
  age_min: number;
  age_max: number;
  types: string[];       // ['human'] or ['human', 'creature'] or ['creature']
  voice_character: string; // 'kind' | 'funny' | 'evil' | 'wise'
  active: boolean;
}

const NARRATOR_CATEGORY = 'narrator';

@Injectable()
export class TtsService {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  /**
   * Load active voices from DB.
   */
  private async loadVoices(): Promise<DbVoice[]> {
    return this.prisma.$queryRaw<DbVoice[]>`
      SELECT voice_id, name, category, gender, age_min, age_max, types, voice_character, active
      FROM voices WHERE active = true ORDER BY category, name
    `;
  }

  /**
   * Score how well a voice matches a character.
   * Matching dimensions: gender (must match) > age > type > voice_character
   */
  private scoreVoice(voice: DbVoice, char: Character): number {
    let score = 0;
    const charAge = char.age || 30;

    // Gender match (must match)
    const charGender = char.gender === 'female' ? 'female' : 'male';
    if (voice.gender === charGender) {
      score += 10;
    } else {
      return -100;
    }

    // Age range match
    if (charAge >= voice.age_min && charAge <= voice.age_max) {
      score += 10;
    } else {
      const dist = charAge < voice.age_min
        ? voice.age_min - charAge
        : charAge - voice.age_max;
      score -= dist;
    }

    // Type match (human/creature)
    const charType = char.type || 'human';
    if (voice.types?.includes(charType)) {
      score += 5;
    } else {
      return -50; // Wrong type = strong penalty
    }

    // Voice character match (kind/funny/evil/wise)
    const charVoice = char.voice_character || 'kind';
    if (voice.voice_character === charVoice) {
      score += 5;
    }

    return score;
  }

  /**
   * Assign voices to characters using DB voices.
   */
  async assignVoices(characters: Character[]): Promise<{ [name: string]: string }> {
    const voices = await this.loadVoices();
    const voiceMap: { [name: string]: string } = {};
    const usedVoices = new Set<string>();

    for (const char of characters) {
      // Narrator is fixed
      if (char.name === 'Erzähler') {
        const narrator = voices.find(v => v.category === NARRATOR_CATEGORY);
        if (narrator) {
          voiceMap[char.name] = narrator.voice_id;
          usedVoices.add(narrator.voice_id);
        }
        continue;
      }

      // Score all unused voices
      const candidates = voices
        .filter(v => !usedVoices.has(v.voice_id) && v.category !== NARRATOR_CATEGORY)
        .map(v => ({ voice: v, score: this.scoreVoice(v, char) }))
        .filter(c => c.score > 0)
        .sort((a, b) => b.score - a.score);

      // If nothing unused fits, allow reuse
      const pool = candidates.length > 0
        ? candidates
        : voices
            .filter(v => v.category !== NARRATOR_CATEGORY)
            .map(v => ({ voice: v, score: this.scoreVoice(v, char) }))
            .filter(c => c.score > 0)
            .sort((a, b) => b.score - a.score);

      if (pool.length > 0) {
        const best = pool[0];
        voiceMap[char.name] = best.voice.voice_id;
        usedVoices.add(best.voice.voice_id);
        console.log(`🎤 ${char.name} (${char.gender}, ${char.age}y, ${char.type}, ${char.voice_character}) → ${best.voice.name} (score: ${best.score}, types: ${best.voice.types})`);
      }
    }

    return voiceMap;
  }

  /**
   * Generate dialogue for multiple lines using the Text to Dialogue API.
   * One call per scene — natural character transitions.
   */
  async generateDialogue(
    lines: { text: string; voice_id: string }[],
    outputPath: string,
  ): Promise<void> {
    const ELEVENLABS_API_KEY = this.configService.get<string>('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not configured');

    const body = {
      inputs: lines.map(l => ({ text: l.text, voice_id: l.voice_id })),
      model_id: 'eleven_v3',
      language_code: 'de',
    };

    const response = await fetch('https://api.elevenlabs.io/v1/text-to-dialogue', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs Dialogue ${response.status}: ${errText}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
  }

  /**
   * Generate a sound effect via ElevenLabs Sound Generation API.
   */
  async generateSfx(
    description: string,
    durationSeconds: number,
    outputPath: string,
  ): Promise<void> {
    const ELEVENLABS_API_KEY = this.configService.get<string>('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not configured');

    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: description,
        duration_seconds: Math.min(Math.max(durationSeconds, 0.5), 5),
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`SFX generation failed: ${response.status}: ${errText}`);
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);
  }
}
