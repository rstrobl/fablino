import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { generateScript } from '../services/claude.js';
import { generateTTS, assignVoices, DEFAULT_VOICE_SETTINGS, EL_VOICES } from '../services/tts.js';
import { generateCover } from '../services/replicate.js';
import { combineAudio } from '../services/audio.js';
import { insertStory } from '../db.js';

const router = express.Router();

const AUDIO_DIR = path.resolve('../audio');
const COVERS_DIR = path.resolve('./covers');

// --- Job tracking ---
const jobs = {};

// Periodic cleanup of old jobs
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of Object.entries(jobs)) {
    if (job.completedAt && now - job.completedAt > 30 * 60 * 1000) delete jobs[id];
  }
}, 5 * 60 * 1000);

// Generate story script
router.post('/', (req, res) => {
  const { prompt, ageGroup, characters } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt ist erforderlich' });

  const id = uuidv4();
  jobs[id] = { status: 'waiting_for_script', progress: 'Skript wird geschrieben...', startedAt: Date.now() };
  res.json({ id, status: 'accepted' });

  (async () => {
    try {
      jobs[id].progress = 'Skript wird geschrieben...';
      if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');
      const script = await generateScript(prompt, ageGroup || '5-7', characters);

      // Post-processing: remove onomatopoeia from non-narrator lines
      const onomatopoeiaPattern = /\b(H[aie]h[aie]h?[aie]?|Buhuhu|Hihihi|Ächz|Seufz|Grr+|Brumm+|Miau|Wuff|Schnurr|Piep|Prust|Uff|Autsch|Hmpf|Pah|Tss|Juhu|Juchhu|Hurra|Wiehern?)\b\.{0,3}\s*/gi;
      for (const scene of script.scenes) {
        for (const line of scene.lines) {
          if (line.speaker !== 'Erzähler') {
            const cleaned = line.text.replace(onomatopoeiaPattern, '').replace(/^\.\.\.\s*/, '').replace(/\s{2,}/g, ' ').trim();
            if (cleaned && cleaned !== line.text) {
              console.log(`[post-process] Removed onomatopoeia from ${line.speaker}: "${line.text}" → "${cleaned}"`);
              line.text = cleaned;
            }
          }
        }
      }

      // Preview mode: stop here and let user confirm
      const voiceMap = assignVoices(script.characters);
      jobs[id] = {
        status: 'preview',
        script,
        voiceMap,
        prompt,
        ageGroup: ageGroup || '5-7',
      };
    } catch (err) {
      console.error('Script generation error:', err);
      jobs[id] = { status: 'error', error: err.message, completedAt: Date.now() };
    }
  })();
});

// Confirm script and start TTS generation
router.post('/:id/confirm', (req, res) => {
  const { id } = req.params;
  const job = jobs[id];
  if (!job || job.status !== 'preview') {
    return res.status(404).json({ error: 'Kein Skript zur Bestätigung gefunden' });
  }

  const { script, voiceMap, prompt, ageGroup } = job;
  jobs[id] = { status: 'generating_audio', progress: 'Stimmen werden eingesprochen...', title: script.title };
  res.json({ status: 'confirmed' });

  (async () => {
    const linesDir = path.join(AUDIO_DIR, 'lines', id);
    fs.mkdirSync(linesDir, { recursive: true });

    // Start cover generation in parallel
    const coverPromise = generateCover(script.title, script.summary || prompt, script.characters, id, COVERS_DIR);

    try {
      const voiceSettings = DEFAULT_VOICE_SETTINGS;
      const segments = [];
      let lineIdx = 0;
      const allLines = script.scenes.flatMap(s => s.lines);
      const totalLines = allLines.length;
      for (let i = 0; i < allLines.length; i++) {
        const line = allLines[i];

        const voice = voiceMap[line.speaker] || EL_VOICES.narrator;
        const ttsPath = path.join(linesDir, `line_${lineIdx}.mp3`);
        const previous_text = i > 0 ? allLines.slice(Math.max(0, i - 2), i).map(l => l.text).join(' ') : undefined;
        const next_text = i < allLines.length - 1 ? allLines[i + 1].text : undefined;
        await generateTTS(line.text, voice, ttsPath, voiceSettings, { previous_text, next_text });
        segments.push(ttsPath);
        lineIdx++;
        jobs[id].progress = `Stimmen: ${lineIdx}/${totalLines}`;
      }

      jobs[id].progress = 'Audio wird zusammengemischt...';
      const finalPath = path.join(AUDIO_DIR, `${id}.mp3`);
      await combineAudio(segments, finalPath, AUDIO_DIR);

      // Wait for cover to finish (may already be done)
      const coverUrl = await coverPromise;
      console.log(`Cover for ${id}: ${coverUrl || 'none'}`);

      const story = {
        id,
        title: script.title,
        prompt,
        summary: script.summary || null,
        ageGroup,
        createdAt: new Date().toISOString(),
      };
      await insertStory(story, script, voiceMap);

      jobs[id] = {
        status: 'done',
        completedAt: Date.now(),
        story: {
          ...story,
          characters: script.characters,
          voiceMap,
          audioUrl: `/api/audio/${id}`,
        },
      };
    } catch (err) {
      console.error('Audio generation error:', err);
      jobs[id] = { status: 'error', error: err.message, completedAt: Date.now() };
    }
  })();
});

// Preview a single line with custom voice/parameters
router.post('/preview-line', async (req, res) => {
  const { text, voiceId, voiceSettings } = req.body;
  if (!text || !voiceId) return res.status(400).json({ error: 'text and voiceId required' });
  try {
    const settings = {
      stability: voiceSettings?.stability ?? 0.5,
      similarity_boost: voiceSettings?.similarity_boost ?? 0.75,
      style: voiceSettings?.style ?? 1.0,
      use_speaker_boost: voiceSettings?.use_speaker_boost ?? false,
    };
    const tmpPath = path.join(AUDIO_DIR, `preview_${Date.now()}.mp3`);
    await generateTTS(text, voiceId, tmpPath, settings, {
      previous_text: req.body.previous_text,
      next_text: req.body.next_text,
    });
    res.sendFile(tmpPath, () => { try { fs.unlinkSync(tmpPath); } catch(e) {} });
  } catch (err) {
    console.error('Preview error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get job status
router.get('/status/:id', (req, res) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ status: 'not_found' });
  res.json(job);
});

export default router;