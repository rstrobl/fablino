import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

interface SfxEntry {
  id: string;
  name: string;
  category: string;
  file: string;
  active: boolean;
}

@Injectable()
export class SfxService {
  private readonly sfxDirectory: string;
  private readonly manifestPath: string;

  constructor(private configService: ConfigService) {
    this.sfxDirectory = path.join(process.cwd(), '..', 'sfx-library');
    this.manifestPath = path.join(process.cwd(), 'data', 'sfx-library.json');
  }

  private loadManifest(): SfxEntry[] {
    try {
      return JSON.parse(fs.readFileSync(this.manifestPath, 'utf8'));
    } catch {
      return [];
    }
  }

  private saveManifest(manifest: SfxEntry[]): void {
    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  }

  async getAll(): Promise<SfxEntry[]> {
    return this.loadManifest();
  }

  /** Returns SFX list formatted for Claude system prompt injection */
  getSfxListForPrompt(): string {
    const manifest = this.loadManifest().filter(s => s.active !== false);
    if (manifest.length === 0) return '';
    const lines = manifest.map(s => `  - "${s.id}" (${s.name})`);
    return `\n\nVERFÜGBARE SOUNDEFFEKTE (nur diese IDs verwenden):\n${lines.join('\n')}\nSFX-Zeilen im Skript MÜSSEN eine dieser IDs verwenden: { "sfx": "<id>", "duration": 2 }`;
  }

  async update(id: string, data: Partial<{ name: string; category: string; active: boolean }>): Promise<SfxEntry> {
    const manifest = this.loadManifest();
    const entry = manifest.find(s => s.id === id);
    if (!entry) throw new NotFoundException(`SFX "${id}" nicht gefunden`);

    if (data.name !== undefined) entry.name = data.name;
    if (data.category !== undefined) entry.category = data.category;
    if (data.active !== undefined) entry.active = data.active;

    this.saveManifest(manifest);
    return entry;
  }

  async getAudioFile(id: string): Promise<Buffer> {
    const manifest = this.loadManifest();
    const entry = manifest.find(s => s.id === id);
    if (!entry) throw new NotFoundException(`SFX "${id}" nicht gefunden`);

    const filePath = path.join(this.sfxDirectory, entry.file);
    if (!fs.existsSync(filePath)) throw new NotFoundException(`Audio-Datei für "${id}" nicht gefunden`);

    return fs.readFileSync(filePath);
  }

  async getAudioPath(id: string): Promise<string | null> {
    const manifest = this.loadManifest();
    const entry = manifest.find(s => s.id === id);
    if (!entry) return null;
    const filePath = path.join(this.sfxDirectory, entry.file);
    return fs.existsSync(filePath) ? filePath : null;
  }

  async replaceWithGenerated(id: string): Promise<SfxEntry> {
    const manifest = this.loadManifest();
    const entry = manifest.find(s => s.id === id);
    if (!entry) throw new NotFoundException(`SFX "${id}" nicht gefunden`);

    const audioBuffer = await this.generateSoundEffect(entry.name);
    const filePath = path.join(this.sfxDirectory, entry.file);
    fs.writeFileSync(filePath, audioBuffer);
    return entry;
  }

  async replaceWithUpload(id: string, audioBuffer: Buffer): Promise<SfxEntry> {
    const manifest = this.loadManifest();
    const entry = manifest.find(s => s.id === id);
    if (!entry) throw new NotFoundException(`SFX "${id}" nicht gefunden`);

    const filePath = path.join(this.sfxDirectory, entry.file);
    fs.writeFileSync(filePath, audioBuffer);
    return entry;
  }

  async create(id: string, name: string, category: string): Promise<SfxEntry> {
    if (!id || !name) throw new BadRequestException('ID und Name sind Pflichtfelder');
    if (!/^[a-z0-9_]+$/.test(id)) throw new BadRequestException('ID darf nur a-z, 0-9 und _ enthalten');

    const manifest = this.loadManifest();
    if (manifest.find(s => s.id === id)) throw new BadRequestException(`SFX "${id}" existiert bereits`);

    const entry: SfxEntry = { id, name, category: category || 'other', file: `${id}.mp3`, active: true };

    manifest.push(entry);
    this.saveManifest(manifest);
    return entry;
  }

  async remove(id: string): Promise<{ deleted: true }> {
    const manifest = this.loadManifest();
    const idx = manifest.findIndex(s => s.id === id);
    if (idx === -1) throw new NotFoundException(`SFX "${id}" nicht gefunden`);

    const entry = manifest[idx];
    const filePath = path.join(this.sfxDirectory, entry.file);

    // Remove file
    try { if (fs.existsSync(filePath)) fs.unlinkSync(filePath); } catch {}

    // Remove from manifest
    manifest.splice(idx, 1);
    this.saveManifest(manifest);
    return { deleted: true };
  }

  private async generateSoundEffect(description: string): Promise<Buffer> {
    const apiKey = this.configService.get<string>('ELEVENLABS_API_KEY');
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');

    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: description, duration_seconds: 3 }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`ElevenLabs error: ${response.status} ${error.slice(0, 200)}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
