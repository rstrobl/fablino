import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
const exec = promisify(require('child_process').exec);

@Injectable()
export class VoicesService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getAll() {
    const voices = await this.prisma.$queryRaw`
      SELECT voice_id, name, category, description, 
             stability, similarity_boost, style, use_speaker_boost, 
             traits, active, preview_url
      FROM voices 
      ORDER BY category, name
    ` as any[];
    return voices.map(v => ({
      ...v,
      stability: Number(v.stability),
      similarity_boost: Number(v.similarity_boost),
      style: Number(v.style),
    }));
  }

  async getCategories() {
    const result = await this.prisma.$queryRaw`
      SELECT DISTINCT category FROM voices WHERE active = true ORDER BY category
    ` as any[];
    return result.map(r => r.category);
  }

  async getOne(voiceId: string) {
    const rows = await this.prisma.$queryRaw`
      SELECT * FROM voices WHERE voice_id = ${voiceId}
    ` as any[];
    if (!rows.length) throw new NotFoundException('Voice not found');
    const v = rows[0];
    return {
      ...v,
      stability: Number(v.stability),
      similarity_boost: Number(v.similarity_boost),
      style: Number(v.style),
    };
  }

  async getSettingsForVoice(voiceId: string) {
    const rows = await this.prisma.$queryRaw`
      SELECT stability, similarity_boost, style, use_speaker_boost 
      FROM voices WHERE voice_id = ${voiceId}
    ` as any[];
    if (!rows.length) return null;
    return {
      stability: Number(rows[0].stability),
      similarity_boost: Number(rows[0].similarity_boost),
      style: Number(rows[0].style),
      use_speaker_boost: rows[0].use_speaker_boost,
    };
  }

  async update(voiceId: string, body: any) {
    const { name, category, description, stability, similarity_boost, style, use_speaker_boost, traits, active } = body;
    await this.prisma.$executeRaw`
      UPDATE voices SET 
        name = COALESCE(${name}, name),
        category = COALESCE(${category}, category),
        description = COALESCE(${description}, description),
        stability = COALESCE(${stability !== undefined ? stability : null}::numeric, stability),
        similarity_boost = COALESCE(${similarity_boost !== undefined ? similarity_boost : null}::numeric, similarity_boost),
        style = COALESCE(${style !== undefined ? style : null}::numeric, style),
        use_speaker_boost = COALESCE(${use_speaker_boost !== undefined ? use_speaker_boost : null}::boolean, use_speaker_boost),
        traits = COALESCE(${traits || null}::text[], traits),
        active = COALESCE(${active !== undefined ? active : null}::boolean, active)
      WHERE voice_id = ${voiceId}
    `;
    return this.getOne(voiceId);
  }

  async create(body: any) {
    const { voice_id, name, category, description, stability, similarity_boost, style, use_speaker_boost, traits } = body;
    await this.prisma.$executeRaw`
      INSERT INTO voices (voice_id, name, category, description, stability, similarity_boost, style, use_speaker_boost, traits)
      VALUES (${voice_id}, ${name}, ${category}, ${description || ''}, 
              ${stability || 0.35}, ${similarity_boost || 0.75}, ${style || 0.6}, ${use_speaker_boost || false},
              ${traits || []}::text[])
    `;
    return this.getOne(voice_id);
  }

  async remove(voiceId: string) {
    await this.prisma.$executeRaw`DELETE FROM voices WHERE voice_id = ${voiceId}`;
    return { deleted: true };
  }

  async preview(voiceId: string, text: string, overrideSettings?: any): Promise<Buffer> {
    const dbSettings = await this.getSettingsForVoice(voiceId);
    const ELEVENLABS_API_KEY = this.configService.get<string>('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not configured');

    const defaults = { stability: 0.35, similarity_boost: 0.75, style: 0.6, use_speaker_boost: false };
    const voiceSettings = {
      stability: overrideSettings?.stability ?? dbSettings?.stability ?? defaults.stability,
      similarity_boost: overrideSettings?.similarity_boost ?? dbSettings?.similarity_boost ?? defaults.similarity_boost,
      style: overrideSettings?.style ?? dbSettings?.style ?? defaults.style,
      use_speaker_boost: overrideSettings?.use_speaker_boost ?? dbSettings?.use_speaker_boost ?? defaults.use_speaker_boost,
    };

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: voiceSettings,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs ${response.status}: ${errText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
