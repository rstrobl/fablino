import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class VoicesService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  async getAll() {
    const voices = await this.prisma.$queryRaw`
      SELECT voice_id, name, gender, age_min, age_max, types,
             voice_character, is_narrator, active, preview_url
      FROM voices 
      ORDER BY name
    ` as any[];
    return voices;
  }

  async getOne(voiceId: string) {
    const rows = await this.prisma.$queryRaw`
      SELECT voice_id, name, gender, age_min, age_max, types,
             voice_character, is_narrator, active, preview_url
      FROM voices WHERE voice_id = ${voiceId}
    ` as any[];
    if (!rows.length) throw new NotFoundException('Voice not found');
    return rows[0];
  }

  async update(voiceId: string, body: any) {
    const { name, gender, age_min, age_max, types, voice_character, is_narrator, active } = body;
    await this.prisma.$executeRaw`
      UPDATE voices SET 
        name = COALESCE(${name}, name),
        gender = COALESCE(${gender}, gender),
        age_min = COALESCE(${age_min !== undefined ? age_min : null}::int, age_min),
        age_max = COALESCE(${age_max !== undefined ? age_max : null}::int, age_max),
        types = COALESCE(${types || null}::text[], types),
        voice_character = COALESCE(${voice_character}, voice_character),
        is_narrator = COALESCE(${is_narrator !== undefined ? is_narrator : null}::boolean, is_narrator),
        active = COALESCE(${active !== undefined ? active : null}::boolean, active)
      WHERE voice_id = ${voiceId}
    `;
    return this.getOne(voiceId);
  }

  async create(body: any) {
    const { voice_id, name, gender, age_min, age_max, types, voice_character, is_narrator } = body;
    await this.prisma.$executeRaw`
      INSERT INTO voices (voice_id, name, gender, age_min, age_max, types, voice_character, is_narrator)
      VALUES (${voice_id}, ${name}, ${gender || 'male'}, ${age_min || 18}, ${age_max || 59},
              ${types || ['human']}::text[], ${voice_character || 'kind'}, ${is_narrator || false})
    `;
    return this.getOne(voice_id);
  }

  async remove(voiceId: string) {
    await this.prisma.$executeRaw`DELETE FROM voices WHERE voice_id = ${voiceId}`;
    return { deleted: true };
  }

  async preview(voiceId: string, text: string): Promise<Buffer> {
    const ELEVENLABS_API_KEY = this.configService.get<string>('ELEVENLABS_API_KEY');
    if (!ELEVENLABS_API_KEY) throw new Error('ELEVENLABS_API_KEY not configured');

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_v3',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`ElevenLabs ${response.status}: ${errText}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
