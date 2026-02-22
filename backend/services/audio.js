import fs from 'fs';
import path from 'path';
import { execAsync } from '../utils.js';

async function combineAudio(segments, outputPath, audioDir) {
  const silencePath = path.join(audioDir, `silence_${Date.now()}.mp3`);
  await execAsync(`ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t 0.5 -q:a 9 "${silencePath}" 2>/dev/null`);
  const listPath = path.join(audioDir, `list_${Date.now()}.txt`);
  let listContent = '';
  for (let i = 0; i < segments.length; i++) {
    listContent += `file '${segments[i]}'\n`;
    if (i < segments.length - 1) listContent += `file '${silencePath}'\n`;
  }
  fs.writeFileSync(listPath, listContent);
  const tmpConcat = path.join(audioDir, `tmp_${Date.now()}.mp3`);
  await execAsync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -q:a 2 "${tmpConcat}"`);
  await execAsync(`ffmpeg -y -i "${tmpConcat}" -af "afade=t=in:d=0.5" -q:a 2 "${outputPath}"`);
  try { fs.unlinkSync(tmpConcat); } catch {}
  try { fs.unlinkSync(silencePath); fs.unlinkSync(listPath); } catch {}
}

export { combineAudio };