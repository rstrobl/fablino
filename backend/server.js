import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { exec as execCb } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import pg from 'pg';
import { config } from 'dotenv';

config(); // load .env

const execAsync = promisify(execCb);
const app = express();
app.use(cors());
app.use(express.json());

const AUDIO_DIR = path.resolve('../audio');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// PostgreSQL connection
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

// ElevenLabs voice pool — categorized by role type
const EL_VOICES = {
  narrator: 'GoXyzBapJk3AoCJoMQl9',  // Daniel
  child_m: [
    'Ewvy14akxdhONg4fmNry',  // Finnegan - children's story voice (primary child male)
    'LRpNiUBlcqgIsKUzcrlN',  // Georg - Funny and Emotional
  ],
  child_f: [
    'xOKkuQfZt5N7XfbFdn9W',  // Lucy Fennek - warm children's narrator
    'VD1if7jDVYtAKs4P0FIY',  // Milly Maple - bright, cheerful
  ],
  adult_m: [
    '6n4YmXLiuP4C7cZqYOJl',  // Finn - Fresh and Conversational (professional)
    'MbbPUteESkJWr4IAaW35',  // Felix - Direct and Clear (high_quality)
    'IWm8DnJ4NGjFI7QAM5lM',  // Stephan - Warm and Friendly (professional)
    'MJ0RnG71ty4LH3dvNfSd',  // Leon - Soothing and Grounded (high_quality)
    'h1IssowVS2h4nL5ZbkkK',  // The Fox - Strict & Dominating (high_quality)
    'eWmswbut7I70CIuRsFwP',  // Frankie Slim - Slick & Mischievous (high_quality)
    '3kaQumuvT4NtcZsw8RVS',  // Commander Brake - Strict & Dominant (high_quality)
    '8tJgFGd1nr7H5KLTvjjt',  // Captain Comedy - Vibrant and Wonderful (high_quality)
    'UFO0Yv86wqRxAt1DmXUu',  // Sarcastic and Sultry Villain (high_quality)
    'U0W3edavfdI8ibPeeteQ',  // Freddie Flip - Sweet and Friendly (high_quality)
    'f2yUVfK5jdm78zlpcZ8C',  // Albert - Cheerful, Playful and Fun (high_quality)
  ],
  adult_f: [
    'cgSgspJ2msm6clMCkdW9',
    'pFZP5JQG7iQjIQuC4Bku',
    'FGY2WhTYpPnrIDTdsKH5',
    'hpp4J3VqNfWAUOO0d1Us',
  ],
  creature: [
    'LRpNiUBlcqgIsKUzcrlN',  // Georg - Funny and Emotional (great for creatures)
    'eWmswbut7I70CIuRsFwP',  // Frankie Slim - Slick & Mischievous
    'UFO0Yv86wqRxAt1DmXUu',  // Sarcastic and Sultry Villain
    '8tJgFGd1nr7H5KLTvjjt',  // Captain Comedy - Vibrant
  ],
};

// SFX cache to avoid regenerating identical effects
const sfxCache = new Map();

const MOOD_DESCRIPTIONS = {
  witzig: 'Absurd, lustig, Slapstick, Wortspiele, überraschende Pointen.',
  gruselig: 'Leicht unheimlich, Spannung, mysteriöse Atmosphäre — aber IMMER ein gutes Ende!',
  abenteuerlich: 'Mutige Helden, gefährliche Reisen, Rätsel lösen, Schätze finden.',
  gutenacht: 'Sanft, beruhigend, poetisch, langsames Tempo, perfekt zum Einschlafen. Leise Töne, warme Bilder, sanftes Ende.',
};

const MOOD_VOICE_SETTINGS = {
  witzig: { stability: 0.2, similarity_boost: 0.85, style: 0.6, use_speaker_boost: true },
  gruselig: { stability: 0.35, similarity_boost: 0.8, style: 0.5, use_speaker_boost: true },
  abenteuerlich: { stability: 0.25, similarity_boost: 0.85, style: 0.6, use_speaker_boost: true },
  gutenacht: { stability: 0.55, similarity_boost: 0.7, style: 0.2, use_speaker_boost: true },
};

const FIXED_VOICES = {
  'Charly': 'RMDEjuHXo5bcQLkbu6MB',
  'Kimo': 'Ewvy14akxdhONg4fmNry',
};

// --- DB helpers ---

async function getStories() {
  const { rows } = await pool.query('SELECT * FROM stories ORDER BY created_at DESC');
  if (!rows.length) return [];
  const storyIds = rows.map(r => r.id);
  const { rows: allChars } = await pool.query('SELECT story_id, name, gender, voice_id FROM characters WHERE story_id = ANY($1)', [storyIds]);
  const charsByStory = {};
  for (const c of allChars) {
    if (!charsByStory[c.story_id]) charsByStory[c.story_id] = [];
    charsByStory[c.story_id].push(c);
  }
  return rows.map(row => {
    const chars = charsByStory[row.id] || [];
    const voiceMap = {};
    for (const c of chars) voiceMap[c.name] = c.voice_id;
    return {
      id: row.id,
      title: row.title,
      characters: chars.map(c => ({ name: c.name, gender: c.gender })),
      voiceMap,
      prompt: row.prompt,
      ageGroup: row.age_group,
      mood: row.mood,
      createdAt: row.created_at,
      audioUrl: `/api/audio/${row.id}`,
    };
  });
}

async function insertStory(story, script, voiceMap) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      'INSERT INTO stories (id, title, prompt, mood, age_group, created_at, audio_path) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [story.id, story.title, story.prompt, story.mood, story.ageGroup, story.createdAt, `audio/${story.id}.mp3`]
    );
    for (const char of script.characters) {
      await client.query(
        'INSERT INTO characters (story_id, name, gender, voice_id) VALUES ($1,$2,$3,$4)',
        [story.id, char.name, char.gender, voiceMap[char.name] || null]
      );
    }
    let globalIdx = 0;
    for (let si = 0; si < script.scenes.length; si++) {
      for (let li = 0; li < script.scenes[si].lines.length; li++) {
        const line = script.scenes[si].lines[li];
        const audioPath = `audio/lines/${story.id}/line_${globalIdx}.mp3`;
        await client.query(
          'INSERT INTO lines (story_id, scene_idx, line_idx, speaker, text, sfx, audio_path) VALUES ($1,$2,$3,$4,$5,$6,$7)',
          [story.id, si, li, line.speaker, line.text, line.sfx || null, audioPath]
        );
        globalIdx++;
      }
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

// --- TTS ---

async function generateTTS(text, voiceId, outputPath, voiceSettings = { stability: 0.5, similarity_boost: 0.75 }, { previous_text, next_text } = {}) {
  const body = { text, model_id: 'eleven_multilingual_v2', voice_settings: voiceSettings };
  if (previous_text) body.previous_text = previous_text;
  if (next_text) body.next_text = next_text;
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ElevenLabs ${response.status}: ${errText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(outputPath, buffer);
}

async function generateSFX(description, outputPath) {
  // Check cache first
  const cacheKey = description.toLowerCase().trim();
  if (sfxCache.has(cacheKey)) {
    fs.copyFileSync(sfxCache.get(cacheKey), outputPath);
    return;
  }

  const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: { 'xi-api-key': ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
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
  sfxCache.set(cacheKey, outputPath);
  return outputPath;
}

async function combineAudio(segments, outputPath) {
  const silencePath = path.join(AUDIO_DIR, `silence_${Date.now()}.mp3`);
  await execAsync(`ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t 0.3 -q:a 9 "${silencePath}" 2>/dev/null`);
  const listPath = path.join(AUDIO_DIR, `list_${Date.now()}.txt`);
  let listContent = '';
  for (let i = 0; i < segments.length; i++) {
    listContent += `file '${segments[i]}'\n`;
    if (i < segments.length - 1) listContent += `file '${silencePath}'\n`;
  }
  fs.writeFileSync(listPath, listContent);
  const tmpConcat = path.join(AUDIO_DIR, `tmp_${Date.now()}.mp3`);
  await execAsync(`ffmpeg -y -f concat -safe 0 -i "${listPath}" -q:a 2 "${tmpConcat}"`);
  const probeOut = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${tmpConcat}"`);
  const dur = parseFloat(probeOut.stdout.trim()) || 10;
  const fadeOutStart = Math.max(0, dur - 1);
  await execAsync(`ffmpeg -y -i "${tmpConcat}" -af "loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:d=0.5,afade=t=out:st=${fadeOutStart}:d=1" -q:a 2 "${outputPath}"`);
  try { fs.unlinkSync(tmpConcat); } catch {}
  try { fs.unlinkSync(silencePath); fs.unlinkSync(listPath); } catch {}
}

// --- Voice assignment ---

function assignVoices(characters) {
  const voiceMap = {};
  let childMIdx = 0, childFIdx = 0, adultMIdx = 0, adultFIdx = 0, creatureIdx = 0;
  for (const char of characters) {
    if (FIXED_VOICES[char.name]) {
      voiceMap[char.name] = FIXED_VOICES[char.name];
    } else if (char.name === 'Erzähler') {
      voiceMap[char.name] = EL_VOICES.narrator;
    } else if (char.gender === 'child_m') {
      voiceMap[char.name] = EL_VOICES.child_m[childMIdx % EL_VOICES.child_m.length];
      childMIdx++;
    } else if (char.gender === 'child_f') {
      voiceMap[char.name] = EL_VOICES.child_f[childFIdx % EL_VOICES.child_f.length];
      childFIdx++;
    } else if (char.gender === 'adult_f') {
      voiceMap[char.name] = EL_VOICES.adult_f[adultFIdx % EL_VOICES.adult_f.length];
      adultFIdx++;
    } else if (char.gender === 'creature') {
      voiceMap[char.name] = EL_VOICES.creature[creatureIdx % EL_VOICES.creature.length];
      creatureIdx++;
    } else {
      // default: adult_m (covers 'adult_m', 'male', and any unrecognized)
      voiceMap[char.name] = EL_VOICES.adult_m[adultMIdx % EL_VOICES.adult_m.length];
      adultMIdx++;
    }
  }
  return voiceMap;
}

// --- Script generation via Claude API ---
async function generateScript(prompt, ageGroup, mood, characters) {
  const ageRules = ageGroup === '3-5' ? `
KLEINE OHREN (3–5 Jahre):
- Kurze Sätze. Lautmalerei. Wiederholungen ("Klopf, klopf, klopf!")
- KEINE Zahlen, Maßeinheiten, Zeitangaben, abstrakte Konzepte
- Emotionen benennen: "Da wurde der Igel ganz traurig" (Kinder lernen Gefühle einzuordnen)
- Max 4 Charaktere (zu viele Stimmen verwirren)
- Klare Gut/Böse-Struktur, aber Böse wird nie bestraft — sondern versteht es am Ende
- Happy End ist Pflicht
- Länge: 10–20 Zeilen, ~3 Minuten
- Erzähler führt stark — bindet Szenen zusammen, beschreibt Bilder, leitet Dialoge ein
- Keine Ironie, kein Sarkasmus — wird nicht verstanden` : `
GROSSE OHREN (6–9 Jahre):
- Komplexere Plots: Rätsel, Wendungen, Geheimnisse
- Humor: Wortspiele, absurde Situationen, Slapstick
- Einfache Zahlen/Fakten OK wenn sie der Story dienen
- Bis 6 Charaktere, Nebenfiguren möglich
- Moral darf subtil sein — nicht mit dem Holzhammer
- Offene Enden möglich (Cliffhanger für Fortsetzungen!)
- Länge: 20–35 Zeilen, ~5–7 Minuten
- Erzähler als Rahmen: Intro, Szenenwechsel, Atmosphäre, Outro — aber Dialog trägt die Handlung
- Leichte Grusel-Elemente OK (aber immer aufgelöst)`;

  const systemPrompt = `Du bist ein preisgekrönter deutscher Kinderhörspiel-Autor. Schreibe brillante, lustige, liebevolle Hörspiele für Kinder.

Stimmung: ${mood} — ${MOOD_DESCRIPTIONS[mood] || ''}
${ageRules}

ALLGEMEINE REGELN:
- Ein "Erzähler" MUSS immer dabei sein — er ist die verbindende Stimme des Hörspiels
- Jede Zeile max 2 Sätze (für TTS-Qualität)
- Jeder Charakter hat ein Erkennungsmerkmal (Catchphrase, Sprachstil, Tick)
- Die erste Zeile muss sofort fesseln — kein "Es war einmal" Langeweile
- KEINE Sound-Effekte (SFX) — nur Stimmen und Dialog
- KEINE Lautmalerei für Emotionen im Dialog (kein HAHAHA, Hihihi, Buhuhu, Ächz, Seufz etc.) — Emotionen werden vom ERZÄHLER beschrieben ("Der Drache lachte so laut, dass der Berg wackelte"), die Charaktere selbst sprechen normal
- Kinder sind die Helden, nicht Erwachsene — Kinder lösen das Problem
- Keine Belehrung, keine Moral-Keule — Story first
- Deutsche Settings/Kultur bevorzugt, aber Fantasie-Welten genauso OK
- Diversität natürlich einbauen — verschiedene Familienmodelle, Namen, Hintergründe — ohne es zu betonen

PERSONALISIERUNG:
${characters?.hero ? `Der HELD der Geschichte heißt "${characters.hero.name}"${characters.hero.age ? ` und ist ${characters.hero.age} Jahre alt` : ''}. Das Kind IST der Held — es erlebt das Abenteuer, löst die Probleme, ist mutig.` : 'Erfinde einen passenden Helden.'}
${characters?.sideCharacters?.length ? `Folgende Personen sollen auch vorkommen:\n${characters.sideCharacters.map(c => `- ${c.role}: "${c.name}"`).join('\n')}` : ''}

Antworte NUR mit validem JSON (kein Markdown, kein \`\`\`):
{
  "title": "Kreativer Titel",
  "characters": [{ "name": "Name", "gender": "child_m|child_f|adult_m|adult_f|creature" }],
  "scenes": [{ "lines": [{ "speaker": "Name", "text": "Dialog" }] }]
}

WICHTIG zu gender:
- child_m = männliches Kind/Junge
- child_f = weibliches Kind/Mädchen
- adult_m = erwachsener Mann (Papa, König, Bäcker, etc.)
- adult_f = erwachsene Frau (Mama, Hexe, Lehrerin, etc.)
- creature = Fabelwesen, Tiere, Drachen, etc.
- Der Erzähler hat IMMER gender "adult_m" (wird automatisch zugewiesen)
- KEINE SFX — lasse das "sfx" Feld komplett weg`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: `Schreibe ein Hörspiel basierend auf diesem Prompt:\n\n${prompt}` }],
      system: systemPrompt,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const text = data.content[0].text.trim();
  // Parse JSON, handle potential markdown wrapping
  const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonStr);
}

// --- Job tracking ---
const jobs = {};

// Periodic cleanup of old jobs
setInterval(() => {
  const now = Date.now();
  for (const [id, job] of Object.entries(jobs)) {
    if (job.completedAt && now - job.completedAt > 30 * 60 * 1000) delete jobs[id];
  }
}, 5 * 60 * 1000);

// --- Routes ---

app.post('/api/generate', (req, res) => {
  const { prompt, ageGroup, mood, characters } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt ist erforderlich' });

  const id = uuidv4();
  jobs[id] = { status: 'waiting_for_script', progress: 'Skript wird geschrieben...', startedAt: Date.now() };
  res.json({ id, status: 'accepted' });

  (async () => {
    try {
      jobs[id].progress = 'Skript wird geschrieben...';
      if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');
      const script = await generateScript(prompt, ageGroup || '5-7', mood || 'witzig', characters);

      // Preview mode: stop here and let user confirm
      const voiceMap = assignVoices(script.characters);
      jobs[id] = {
        status: 'preview',
        script,
        voiceMap,
        prompt,
        ageGroup: ageGroup || '5-7',
        mood: mood || 'witzig',
      };
    } catch (err) {
      console.error('Script generation error:', err);
      jobs[id] = { status: 'error', error: err.message, completedAt: Date.now() };
    }
  })();
});

// Confirm script and start TTS generation
app.post('/api/generate/:id/confirm', (req, res) => {
  const { id } = req.params;
  const job = jobs[id];
  if (!job || job.status !== 'preview') {
    return res.status(404).json({ error: 'Kein Skript zur Bestätigung gefunden' });
  }

  const { script, voiceMap, prompt, ageGroup, mood } = job;
  jobs[id] = { status: 'generating_audio', progress: 'Stimmen werden eingesprochen...', title: script.title };
  res.json({ status: 'confirmed' });

  (async () => {
    const linesDir = path.join(AUDIO_DIR, 'lines', id);
    fs.mkdirSync(linesDir, { recursive: true });

    try {
      const voiceSettings = MOOD_VOICE_SETTINGS[mood] || MOOD_VOICE_SETTINGS.witzig;
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
      await combineAudio(segments, finalPath);

      const story = {
        id,
        title: script.title,
        prompt,
        ageGroup,
        mood,
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

app.get('/api/status/:id', (req, res) => {
  const job = jobs[req.params.id];
  if (!job) return res.status(404).json({ status: 'not_found' });
  res.json(job);
});

app.get('/api/audio/:id', (req, res) => {
  const filePath = path.join(AUDIO_DIR, `${req.params.id}.mp3`);
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Audio nicht gefunden' });
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': end - start + 1,
      'Content-Type': 'audio/mpeg',
    });
    fs.createReadStream(filePath, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

app.get('/api/stories', async (req, res) => {
  try {
    const stories = await getStories();
    res.json(stories);
  } catch (err) {
    console.error('Failed to get stories:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

app.get('/api/story/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM stories WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: 'Story nicht gefunden' });
    const row = rows[0];
    const chars = await pool.query('SELECT name, gender, voice_id FROM characters WHERE story_id = $1', [row.id]);
    const voiceMap = {};
    for (const c of chars.rows) voiceMap[c.name] = c.voice_id;
    const linesRes = await pool.query('SELECT * FROM lines WHERE story_id = $1 ORDER BY scene_idx, line_idx', [row.id]);
    res.json({
      id: row.id,
      title: row.title,
      characters: chars.rows.map(c => ({ name: c.name, gender: c.gender })),
      voiceMap,
      prompt: row.prompt,
      ageGroup: row.age_group,
      mood: row.mood,
      createdAt: row.created_at,
      audioUrl: `/api/audio/${row.id}`,
      lines: linesRes.rows,
    });
  } catch (err) {
    console.error('Failed to get story:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// PATCH /api/stories/:id/voice — regenerate a character's lines with a new voice
app.patch('/api/stories/:id/voice', async (req, res) => {
  const { character, voiceId } = req.body;
  if (!character || !voiceId) return res.status(400).json({ error: 'character and voiceId required' });

  const storyId = req.params.id;
  try {
    // Check story exists
    const { rows: storyRows } = await pool.query('SELECT * FROM stories WHERE id = $1', [storyId]);
    if (!storyRows.length) return res.status(404).json({ error: 'Story nicht gefunden' });
    const story = storyRows[0];

    // Update voice in characters table
    const updateRes = await pool.query(
      'UPDATE characters SET voice_id = $1 WHERE story_id = $2 AND name = $3 RETURNING *',
      [voiceId, storyId, character]
    );
    if (!updateRes.rows.length) return res.status(404).json({ error: 'Character nicht gefunden' });

    // Get all lines for this story
    const { rows: allLines } = await pool.query(
      'SELECT * FROM lines WHERE story_id = $1 ORDER BY scene_idx, line_idx',
      [storyId]
    );
    if (!allLines.length) return res.json({ status: 'no_lines', message: 'No lines in DB to regenerate' });

    // Get voice settings for mood
    const voiceSettings = MOOD_VOICE_SETTINGS[story.mood || 'witzig'] || MOOD_VOICE_SETTINGS.witzig;
    const linesDir = path.join(AUDIO_DIR, 'lines', storyId);
    fs.mkdirSync(linesDir, { recursive: true });

    // Regenerate only lines for the specified character (with context)
    let globalIdx = 0;
    for (let i = 0; i < allLines.length; i++) {
      const line = allLines[i];
      const linePath = path.join(linesDir, `line_${globalIdx}.mp3`);
      if (line.speaker === character) {
        const previous_text = i > 0 ? allLines.slice(Math.max(0, i - 2), i).map(l => l.text).join(' ') : undefined;
        const next_text = i < allLines.length - 1 ? allLines[i + 1].text : undefined;
        await generateTTS(line.text, voiceId, linePath, voiceSettings, { previous_text, next_text });
        await pool.query('UPDATE lines SET audio_path = $1 WHERE id = $2', [`audio/lines/${storyId}/line_${globalIdx}.mp3`, line.id]);
      }
      globalIdx++;
    }

    // Recombine all lines
    const segments = [];
    for (let i = 0; i < allLines.length; i++) {
      const p = path.join(linesDir, `line_${i}.mp3`);
      if (fs.existsSync(p)) segments.push(p);
    }
    if (segments.length) {
      const finalPath = path.join(AUDIO_DIR, `${storyId}.mp3`);
      await combineAudio(segments, finalPath);
    }

    res.json({ status: 'ok', character, voiceId, linesRegenerated: allLines.filter(l => l.speaker === character).length });
  } catch (err) {
    console.error('Voice update error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/share/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM stories WHERE id = $1', [req.params.id]);
    if (!rows.length) return res.status(404).send('<h1>Geschichte nicht gefunden</h1>');
    const story = rows[0];
    const chars = await pool.query('SELECT name FROM characters WHERE story_id = $1', [story.id]);
    const charNames = chars.rows.map(c => c.name).join(', ');
    const desc = `Ein Hörspiel mit ${charNames} — für ${story.age_group}-Jährige`;
    const audioUrl = `https://fablino.de/api/audio/${story.id}`;
    const shareUrl = `https://fablino.de/share/${story.id}`;
    const appUrl = `https://fablino.de/story/${story.id}`;
    const ogImage = `https://fablino.de/logo.png`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${story.title} — Fablino</title>
<meta property="og:title" content="${story.title} — Fablino">
<meta property="og:description" content="${desc}">
<meta property="og:image" content="${ogImage}">
<meta property="og:audio" content="${audioUrl}">
<meta property="og:type" content="music.song">
<meta property="og:url" content="${shareUrl}">
<meta property="og:site_name" content="Fablino">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${story.title} — Fablino">
<meta name="twitter:description" content="${desc}">
<meta name="twitter:image" content="${ogImage}">
<meta http-equiv="refresh" content="0;url=${appUrl}">
<script>window.location.replace("${appUrl}");</script>
</head>
<body><p>Weiterleitung zu <a href="${appUrl}">Fablino</a>...</p></body>
</html>`);
  } catch (err) {
    res.status(500).send('<h1>Fehler</h1>');
  }
});

app.listen(3001, '127.0.0.1', () => console.log('🎧 Fablino Backend on 127.0.0.1:3001'));
