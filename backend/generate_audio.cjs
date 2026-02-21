
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ELEVENLABS_KEY = process.env.ELEVENLABS_API_KEY;
const AUDIO_DIR = path.resolve('/root/.openclaw/workspace/fablino/audio');
const STORY_ID = '31039e44-ecc4-4c26-95fa-41658a8ae121';
const NARRATOR_VOICE = 'GoXyzBapJk3AoCJoMQl9';

const VOICE_SETTINGS = { stability: 0.35, similarity_boost: 0.75, style: 0.6, use_speaker_boost: false };

const pool = new Pool({ host: '127.0.0.1', port: 5433, user: 'fablino', password: 'fablino123', database: 'fablino' });

async function generateTTS(text, voiceId, outputPath, settings, context) {
  const body = {
    text,
    model_id: 'eleven_multilingual_v2',
    voice_settings: settings,
  };
  if (context?.previous_text) body.previous_text = context.previous_text;
  if (context?.next_text) body.next_text = context.next_text;

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`TTS error ${res.status}: ${err}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  // Per-line loudnorm
  const tmpRaw = outputPath.replace('.mp3', '_raw.mp3');
  fs.writeFileSync(tmpRaw, buffer);
  execSync(`ffmpeg -y -i "${tmpRaw}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -q:a 2 "${outputPath}"`, { stdio: 'ignore' });
  fs.unlinkSync(tmpRaw);
}

(async () => {
  const { rows: chars } = await pool.query('SELECT name, voice_id FROM characters WHERE story_id = $1', [STORY_ID]);
  const voiceMap = {};
  for (const c of chars) voiceMap[c.name] = c.voice_id;
  voiceMap['Erzähler'] = NARRATOR_VOICE;
  console.log('VoiceMap:', voiceMap);

  const { rows: lines } = await pool.query('SELECT speaker, text FROM lines WHERE story_id = $1 ORDER BY scene_idx, line_idx', [STORY_ID]);
  console.log(`Generating ${lines.length} lines...`);

  const linesDir = path.join(AUDIO_DIR, 'lines', STORY_ID);
  fs.mkdirSync(linesDir, { recursive: true });

  const segments = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const voice = voiceMap[line.speaker];
    if (!voice) { console.error(`No voice for ${line.speaker}!`); continue; }
    const ttsPath = path.join(linesDir, `line_${i}.mp3`);
    const prev = i > 0 ? lines.slice(Math.max(0, i-2), i).map(l => l.text).join(' ') : undefined;
    const next = i < lines.length - 1 ? lines[i+1].text : undefined;
    console.log(`  ${i+1}/${lines.length} [${line.speaker}] ${line.text.substring(0,50)}...`);
    await generateTTS(line.text, voice, ttsPath, VOICE_SETTINGS, { previous_text: prev, next_text: next });
    segments.push(ttsPath);
    // Update line audio_path
    await pool.query('UPDATE lines SET audio_path = $1 WHERE story_id = $2 AND line_idx = $3', [`audio/lines/${STORY_ID}/line_${i}.mp3`, STORY_ID, i]);
  }

  console.log('Combining audio...');
  // Create silence
  const silencePath = path.join(AUDIO_DIR, 'silence_400ms.mp3');
  execSync(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=mono -t 0.4 -q:a 2 "${silencePath}"`, { stdio: 'ignore' });

  const listPath = path.join(AUDIO_DIR, `list_${STORY_ID}.txt`);
  const listContent = segments.map(s => `file '${s}'\nfile '${silencePath}'`).join('\n');
  fs.writeFileSync(listPath, listContent);

  const tmpConcat = path.join(AUDIO_DIR, `tmp_${Date.now()}.mp3`);
  execSync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -q:a 2 "${tmpConcat}"`, { stdio: 'ignore' });

  const finalPath = path.join(AUDIO_DIR, `${STORY_ID}.mp3`);
  execSync(`ffmpeg -y -i "${tmpConcat}" -af "afade=t=in:d=0.5" -q:a 2 "${finalPath}"`, { stdio: 'ignore' });

  fs.unlinkSync(tmpConcat);
  fs.unlinkSync(silencePath);
  fs.unlinkSync(listPath);

  // Update story with audio path
  await pool.query('UPDATE stories SET audio_path = $1 WHERE id = $2', [finalPath, STORY_ID]);

  const duration = execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${finalPath}"`).toString().trim();
  console.log(`Done! Duration: ${duration}s`);
  console.log(`URL: https://fablino.de/story/${STORY_ID}`);
  
  await pool.end();
})();
