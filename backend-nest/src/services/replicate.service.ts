import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Character } from './claude.service';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

@Injectable()
export class ReplicateService {
  constructor(private configService: ConfigService) {}

  async generateCover(
    title: string,
    summary: string,
    characters: Character[],
    storyId: string,
    coversDir: string,
  ): Promise<string | null> {
    const REPLICATE_API_TOKEN = this.configService.get<string>('REPLICATE_API_TOKEN');

    if (!REPLICATE_API_TOKEN) {
      console.warn('No REPLICATE_API_TOKEN — skipping cover generation');
      return null;
    }

    try {
      const charDesc = characters
        .filter(c => c.name !== 'Erzähler')
        .slice(0, 4)
        .map(c => c.description ? `${c.name} (${c.description})` : c.name)
        .join(', ');
      
      const prompt = `Watercolor children's storybook illustration. ${title}. Characters: ${charDesc}. ${summary}. Warm magical lighting, soft colors, whimsical fairy tale style, no text, no words, no letters.`;
      
      // Create prediction
      const createRes = await fetch('https://api.replicate.com/v1/predictions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          version: 'black-forest-labs/flux-1.1-pro',
          input: {
            prompt,
            aspect_ratio: '1:1',
            output_format: 'jpg',
            output_quality: 90,
          },
        }),
      });
      
      if (!createRes.ok) {
        console.error('Replicate create error:', await createRes.text());
        return null;
      }
      
      let prediction = await createRes.json();
      
      // Poll for completion
      while (prediction.status !== 'succeeded' && prediction.status !== 'failed') {
        await new Promise(r => setTimeout(r, 2000));
        const pollRes = await fetch(prediction.urls.get, {
          headers: { 'Authorization': `Bearer ${REPLICATE_API_TOKEN}` },
        });
        prediction = await pollRes.json();
      }
      
      if (prediction.status === 'failed') {
        console.error('Replicate prediction failed:', prediction.error);
        return null;
      }
      
      const imageUrl = prediction.output;
      if (!imageUrl) return null;
      
      // Download image
      const imgRes = await fetch(typeof imageUrl === 'string' ? imageUrl : imageUrl[0]);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const coverFilename = `${storyId}.jpg`;
      const coverPath = path.join(coversDir, coverFilename);
      fs.mkdirSync(coversDir, { recursive: true });
      fs.writeFileSync(coverPath, buffer);
      
      const coverUrl = `/covers/${coverFilename}`;
      
      // Generate OG thumbnail for social sharing (600x600 JPEG)
      try {
        const ogDir = path.join(coversDir, 'og');
        fs.mkdirSync(ogDir, { recursive: true });
        const ogPath = path.join(ogDir, `${storyId}_og.jpg`);
        execSync(`convert "${coverPath}" -resize 600x600 -quality 80 "${ogPath}"`);
        console.log(`OG thumbnail generated: ${ogPath}`);
      } catch (ogErr) {
        console.error('OG thumbnail generation error:', ogErr.message);
      }

      // Generate list thumbnail (100x100 JPEG)
      try {
        const thumbDir = path.join(coversDir, 'thumb');
        fs.mkdirSync(thumbDir, { recursive: true });
        const thumbPath = path.join(thumbDir, coverFilename);
        execSync(`convert "${coverPath}" -resize 300x300 -quality 80 "${thumbPath}"`);
        console.log(`Thumbnail generated: ${thumbPath}`);
      } catch (thumbErr) {
        console.error('Thumbnail generation error:', thumbErr.message);
      }

      console.log(`Cover generated: ${coverUrl}`);
      return coverUrl;
    } catch (err) {
      console.error('Cover generation error:', err);
      return null;
    }
  }
}