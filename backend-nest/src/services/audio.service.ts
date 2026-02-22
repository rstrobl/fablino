import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
const exec = promisify(require('child_process').exec);

@Injectable()
export class AudioService {
  async combineAudio(segments: string[], outputPath: string, audioDir: string): Promise<void> {
    const silencePath = path.join(audioDir, `silence_${Date.now()}.mp3`);
    
    // Create silence file
    await exec(`ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t 0.5 -q:a 9 "${silencePath}" 2>/dev/null`);
    
    const listPath = path.join(audioDir, `list_${Date.now()}.txt`);
    let listContent = '';
    
    // Create concatenation list with silence between segments
    for (let i = 0; i < segments.length; i++) {
      listContent += `file '${segments[i]}'\n`;
      if (i < segments.length - 1) {
        listContent += `file '${silencePath}'\n`;
      }
    }
    
    fs.writeFileSync(listPath, listContent);
    
    // Concatenate audio files
    const tmpConcat = path.join(audioDir, `tmp_${Date.now()}.mp3`);
    await exec(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -q:a 2 "${tmpConcat}"`);
    
    // Add fade-in effect
    await exec(`ffmpeg -y -i "${tmpConcat}" -af "afade=t=in:d=0.5" -q:a 2 "${outputPath}"`);
    
    // Cleanup temporary files
    try {
      fs.unlinkSync(tmpConcat);
      fs.unlinkSync(silencePath);
      fs.unlinkSync(listPath);
    } catch (e) {
      // Ignore cleanup errors
    }
  }
}