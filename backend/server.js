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
// Each voice has a character description to help with matching
const EL_VOICES = {
  narrator: 'GoXyzBapJk3AoCJoMQl9',  // Daniel — neutral, professionell
  child_m: [
    'Ewvy14akxdhONg4fmNry',  // Finnegan — neugierig, aufgeweckt, mutig
    'LRpNiUBlcqgIsKUzcrlN',  // Georg — lustig, emotional, albern
    '8RjxcQ6tY1F2YZiIvWqY',  // Jasper — schüchtern, zurückhaltend, leise
  ],
  child_f: [
    '9sjP3TfMlzEjAa6uXh3A',  // Kelly — fröhlich, lebhaft
    'xOKkuQfZt5N7XfbFdn9W',  // Lucy Fennek — warm, einfühlsam
    'VD1if7jDVYtAKs4P0FIY',  // Milly Maple — hell, fröhlich, quirlig
  ],
  adult_m: [
    'tqsaTjde7edL1GHtFchL',  // Ben Smile — warmherzig, vertrauenswürdig, Vater-Typ
    'dFA3XRddYScy6ylAYTIO',  // Helmut — sanft, märchenhaft, liebevoll
    'wloRHjPaKZv3ucH7TQOT',  // Jorin — ruhig, freundlich
    '8tJgFGd1nr7H5KLTvjjt',  // Captain Comedy — durchgeknallt, verrückt, Spaßvogel
    '6n4YmXLiuP4C7cZqYOJl',  // Finn — locker, modern, cool
    'eWmswbut7I70CIuRsFwP',  // Frankie Slim — gerissen, verschmitzt, Trickster
    'UFO0Yv86wqRxAt1DmXUu',  // Sarcastic Villain — sarkastisch, durchtrieben, Bösewicht
    'h1IssowVS2h4nL5ZbkkK',  // The Fox — streng, dominant, Bösewicht
  ],
  adult_f: [
    '3t6439mGAsHvQFPpoPdf',  // Raya — warm, natürlich, Mama-Typ
    'XNYSrtboH10kulPETnVC',  // Celestine Hohenstein — arrogant, hochnäsig, Königin/Stiefmutter
  ],
  elder_f: [
    'VNHNa6nN6yJdVF3YRyuF',  // Hilde — liebevolle Oma, warmherzig
  ],
  elder_m: [
    // TODO: Opa-Stimme finden
  ],
  creature: [
    'LRpNiUBlcqgIsKUzcrlN',  // Georg — lustig, emotional, freundliche Drachen/Trolle
    'eWmswbut7I70CIuRsFwP',  // Frankie Slim — verschmitzt, schlaue Füchse/Kobolde
    'UFO0Yv86wqRxAt1DmXUu',  // Sarcastic Villain — durchtrieben, böse Zauberer/Drachen
    '8tJgFGd1nr7H5KLTvjjt',  // Captain Comedy — verrückt, chaotische Kreaturen
  ],
};

// SFX cache to avoid regenerating identical effects
const sfxCache = new Map();

// Default voice settings for all stories
const DEFAULT_VOICE_SETTINGS = { stability: 0.25, similarity_boost: 0.85, style: 0.5, use_speaker_boost: true };

const FIXED_VOICES = {};

// Trait-to-voice mapping: maps personality traits to preferred voice IDs per category
const TRAIT_VOICE_MAP = {
  child_m: {
    'mutig,neugierig,aufgeweckt':   'Ewvy14akxdhONg4fmNry',  // Finnegan
    'lustig,albern,fröhlich':       'LRpNiUBlcqgIsKUzcrlN',  // Georg
    'schüchtern,ruhig,leise':       '8RjxcQ6tY1F2YZiIvWqY',  // Jasper
  },
  child_f: {
    'fröhlich,lebhaft,mutig':       '9sjP3TfMlzEjAa6uXh3A',  // Kelly
    'warm,liebevoll,einfühlsam':    'xOKkuQfZt5N7XfbFdn9W',  // Lucy Fennek
    'fröhlich,quirlig,lustig':      'VD1if7jDVYtAKs4P0FIY',  // Milly Maple
  },
  adult_m: {
    'warm,liebevoll,stolz,fröhlich,episch,kräftig,märchenhaft': 'g1jpii0iyvtRs8fqXsd1',  // Helmut Epic — Default Papa-Stimme
    'laut,neutral':                    'ruSJRhA64v8HAqiqKXVw',  // Thomas
    'emotional,nett,freundlich,ruhig': 'Tsns2HvNFKfGiNjllgqo',  // Sven
    'vertrauenswürdig,sanft':          'wloRHjPaKZv3ucH7TQOT',  // Jorin
    'sanft,liebevoll':                 'dFA3XRddYScy6ylAYTIO',  // Helmut (sanft)
    'dominant,streng,autoritär':       'tqsaTjde7edL1GHtFchL',  // Ben Smile
    'verrückt,lustig,albern':          '8tJgFGd1nr7H5KLTvjjt',  // Captain Comedy
    'cool,locker,modern':              '6n4YmXLiuP4C7cZqYOJl',  // Finn
    'verschmitzt,gerissen,gelangweilt': 'eWmswbut7I70CIuRsFwP',  // Frankie Slim — gelangweilte Männerstimme
    'sarkastisch,durchtrieben':        'UFO0Yv86wqRxAt1DmXUu',  // Sarcastic Villain
    'streng,dominant':                 'h1IssowVS2h4nL5ZbkkK',  // The Fox
  },
  adult_f: {
    'warm,liebevoll,mütterlich':       '3t6439mGAsHvQFPpoPdf',  // Raya
    'arrogant,hochnäsig,streng':       'XNYSrtboH10kulPETnVC',  // Celestine Hohenstein
  },
  elder_f: {
    'warm,liebevoll':                  'VNHNa6nN6yJdVF3YRyuF',  // Hilde
  },
  elder_m: {},
  creature: {
    'lustig,freundlich,emotional,albern,liebevoll,warm,fröhlich': 'LRpNiUBlcqgIsKUzcrlN',  // Georg — default für Drachen, Trolle, freundliche Kreaturen
    'durchtrieben,sarkastisch,böse':   'UFO0Yv86wqRxAt1DmXUu',  // Sarcastic Villain
    'verrückt,chaotisch':              '8tJgFGd1nr7H5KLTvjjt',  // Captain Comedy
    'verschmitzt,gerissen,schlau':     'eWmswbut7I70CIuRsFwP',  // Frankie Slim — nur für wirklich gerissene Kreaturen
  },
};

// Find best voice match based on character traits
function matchVoiceByTraits(gender, traits, usedVoices) {
  const traitMap = TRAIT_VOICE_MAP[gender];
  if (!traitMap || !traits?.length) return null;

  let bestMatch = null;
  let bestScore = 0;

  for (const [traitStr, voiceId] of Object.entries(traitMap)) {
    if (usedVoices.has(voiceId)) continue; // avoid duplicates
    const voiceTraits = traitStr.split(',');
    const score = traits.filter(t => voiceTraits.some(vt => vt.includes(t) || t.includes(vt))).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = voiceId;
    }
  }
  return bestMatch;
}

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
      summary: row.summary,
      ageGroup: row.age_group,
      featured: row.featured,
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
      'INSERT INTO stories (id, title, prompt, summary, age_group, created_at, audio_path) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [story.id, story.title, story.prompt, story.summary || null, story.ageGroup, story.createdAt, `audio/${story.id}.mp3`]
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

async function generateTTS(text, voiceId, outputPath, voiceSettings = { stability: 0.5, similarity_boost: 0.75, style: 1.0, use_speaker_boost: false }, { previous_text, next_text } = {}) {
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
  // Write raw TTS output, then normalize volume per line
  const rawPath = outputPath.replace('.mp3', '_raw.mp3');
  fs.writeFileSync(rawPath, buffer);
  try {
    // Step 1: Normalize volume
    const normPath = outputPath.replace('.mp3', '_norm.mp3');
    await execAsync(`ffmpeg -y -i "${rawPath}" -af "loudnorm=I=-16:TP=-1.5:LRA=11" -q:a 2 "${normPath}" 2>/dev/null`);
    fs.unlinkSync(rawPath);
    // Step 2: Trim trailing silence + apply fade-out to remove ElevenLabs artifacts
    // silenceremove removes trailing silence below -35dB, then 150ms fade-out for clean ending
    await execAsync(`ffmpeg -y -i "${normPath}" -af "silenceremove=stop_periods=1:stop_duration=0.15:stop_threshold=-35dB,afade=t=out:st=0:d=0.15:curve=log" -q:a 2 "${outputPath}" 2>/dev/null`);
    // Fix fade-out start to actual end: re-probe and apply
    const probeOut = await execAsync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${outputPath}"`);
    const dur = parseFloat(probeOut.stdout.trim()) || 0;
    if (dur > 0.3) {
      const fadeStart = Math.max(0, dur - 0.15);
      const fadedPath = outputPath.replace('.mp3', '_faded.mp3');
      await execAsync(`ffmpeg -y -i "${outputPath}" -af "afade=t=out:st=${fadeStart}:d=0.15:curve=log" -q:a 2 "${fadedPath}" 2>/dev/null`);
      fs.renameSync(fadedPath, outputPath);
    }
    try { fs.unlinkSync(normPath); } catch {}
  } catch {
    // If processing fails, use raw file
    if (fs.existsSync(rawPath)) fs.renameSync(rawPath, outputPath);
  }
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
  await execAsync(`ffmpeg -y -f lavfi -i "anullsrc=r=44100:cl=mono" -t 0.5 -q:a 9 "${silencePath}" 2>/dev/null`);
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
  const usedVoices = new Set();
  const counters = { child_m: 0, child_f: 0, adult_m: 0, adult_f: 0, elder_m: 0, elder_f: 0, creature: 0 };

  for (const char of characters) {
    if (FIXED_VOICES[char.name]) {
      voiceMap[char.name] = FIXED_VOICES[char.name];
      usedVoices.add(FIXED_VOICES[char.name]);
    } else if (char.name === 'Erzähler') {
      voiceMap[char.name] = EL_VOICES.narrator;
      usedVoices.add(EL_VOICES.narrator);
    } else {
      const gender = char.gender || 'adult_m';
      // Try trait-based matching first
      const traitMatch = matchVoiceByTraits(gender, char.traits, usedVoices);
      if (traitMatch) {
        voiceMap[char.name] = traitMatch;
      } else {
        // Fallback: sequential assignment from pool
        const pool = EL_VOICES[gender];
        if (pool?.length) {
          // Find first unused voice in pool
          let voice = null;
          for (let i = 0; i < pool.length; i++) {
            const idx = (counters[gender] + i) % pool.length;
            if (!usedVoices.has(pool[idx])) {
              voice = pool[idx];
              counters[gender] = idx + 1;
              break;
            }
          }
          voiceMap[char.name] = voice || pool[counters[gender] % pool.length];
        } else {
          // Empty pool (e.g. elder_m) — fallback to adult equivalent
          const fallback = gender === 'elder_m' ? 'adult_m' : gender === 'elder_f' ? 'adult_f' : 'adult_m';
          const fbPool = EL_VOICES[fallback];
          voiceMap[char.name] = fbPool[counters[fallback] % fbPool.length];
          counters[fallback]++;
        }
      }
      usedVoices.add(voiceMap[char.name]);
    }
  }
  return voiceMap;
}

// --- Script generation via Claude API ---
async function generateScript(prompt, ageGroup, characters) {
  const ageRules = ageGroup === '3-5' ? `
KLEINE OHREN (3–5 Jahre):
- Kurze Sätze. Wiederholungen ("Klopf, klopf, klopf!"). Klangwörter nur im Erzählertext.
- KEINE Zahlen, Maßeinheiten, Zeitangaben, abstrakte Konzepte
- Emotionen benennen: "Da wurde der Igel ganz traurig" (Kinder lernen Gefühle einzuordnen)
- Max 6 Charaktere (inkl. Erzähler)
- Klare Gut/Böse-Struktur, aber Böse wird nie bestraft — sondern versteht es am Ende
- Happy End ist Pflicht
- LÄNGE: MINDESTENS 40 Zeilen, besser 50–60. Das Hörspiel MUSS mindestens 6 Minuten dauern. Schreibe ausführliche Szenen mit vielen Dialogen. Nicht abkürzen! Jede Szene braucht mehrere Hin-und-Her-Dialoge zwischen den Charakteren.
- Erzähler führt stark — bindet Szenen zusammen, beschreibt Bilder, leitet Dialoge ein
- Keine Ironie, kein Sarkasmus — wird nicht verstanden` : `
GROSSE OHREN (6–9 Jahre):
- Komplexere Plots: Rätsel, Wendungen, Geheimnisse
- Humor: Wortspiele, absurde Situationen, Slapstick
- Einfache Zahlen/Fakten OK wenn sie der Story dienen
- Bis 6 Charaktere, Nebenfiguren möglich
- Moral darf subtil sein — nicht mit dem Holzhammer
- Offene Enden möglich (Cliffhanger für Fortsetzungen!)
- LÄNGE: MINDESTENS 60 Zeilen, besser 70–80. Das Hörspiel MUSS mindestens 10 Minuten dauern. Schreibe ausführliche Szenen mit vielen Dialogen, Wendungen und Details. Nicht abkürzen!
- Erzähler als Rahmen: Intro, Szenenwechsel, Atmosphäre, Outro — aber Dialog trägt die Handlung
- Leichte Grusel-Elemente OK (aber immer aufgelöst)`;

  const systemPrompt = `Du bist ein preisgekrönter deutscher Kinderhörspiel-Autor. Schreibe brillante, lustige, liebevolle Hörspiele für Kinder.

⛔ ABSOLUT VERBOTEN — LAUTMALEREI IM DIALOG:
Kein Charakter darf Lautmalerei sprechen. NIEMALS: Hihihi, Hahaha, Buhuhu, Ächz, Seufz, Grr, Brumm, Miau, Wuff, Wiehern, Schnurr, Piep, Kicher, Prust, Uff, Autsch, Hmpf, Pah, Tss, Juhu, Juchhu, Hurra.
Stattdessen beschreibt der ERZÄHLER die Emotion oder den Laut. Charaktere sprechen nur in normalen, ganzen Sätzen.
Dies gilt OHNE AUSNAHME für ALLE Charaktere, auch für Tiere und Kreaturen.

GRUNDTON: Abenteuerlich, witzig, kindgerecht. KEINE Gewalt. Immer ein gutes Ende.
${ageRules}

ALLGEMEINE REGELN:
- Ein "Erzähler" MUSS immer dabei sein — er ist die verbindende Stimme des Hörspiels
- Jede Zeile max 2 Sätze (für TTS-Qualität)
- Jeder Charakter hat ein subtiles Erkennungsmerkmal (Sprachstil, typische Redewendung) — aber nicht in jeder Zeile wiederholen
- Jeder genannte Charakter muss mindestens 2 Zeilen sprechen (sonst weglassen)
- BEVOR ein Charakter zum ersten Mal spricht, MUSS der Erzähler ihn in einer eigenen Zeile vorstellen (Name + wer er/sie ist). Erst Erzähler-Einführung, DANN die erste Sprechzeile des Charakters. Keine Ausnahme!
- Tiere sprechen nur wenn sie als "creature" getaggt sind — sonst beschreibt der Erzähler ihre Laute
- Die erste Zeile muss sofort fesseln — kein "Es war einmal" Langeweile
- KEINE Sound-Effekte (SFX) — nur Stimmen und Dialog
- Emotionen und Tierlaute werden vom ERZÄHLER beschrieben, nicht von den Charakteren selbst. (Siehe ABSOLUT VERBOTEN oben!)
- KEINE konkreten Zeitangaben (keine "eine Stunde später", "nach 30 Minuten", "um 3 Uhr"). Stattdessen: "Kurze Zeit später", "Als die Sonne unterging", "Nach einer langen Reise"
- Kinder sind die Helden, nicht Erwachsene — Kinder lösen das Problem
- Keine Belehrung, keine Moral-Keule — Story first
- Deutsche Settings/Kultur bevorzugt, aber Fantasie-Welten genauso OK
- Diversität natürlich einbauen — verschiedene Familienmodelle, Namen, Hintergründe — ohne es zu betonen
- KORREKTES DEUTSCH IST PFLICHT: Keine Grammatikfehler, keine falschen Deklinationen, keine Anglizismen. Charakternamen MÜSSEN korrekt deutsch sein (NICHT "Drachenfriend" sondern "Drachenfreund", NICHT "Kuchens" sondern "Kuchen"). Schreibe wie ein deutscher Muttersprachler. Im Zweifel einfacher formulieren.

PERSONALISIERUNG:
${characters?.hero ? `Der HELD der Geschichte heißt "${characters.hero.name}"${characters.hero.age ? ` und ist ${characters.hero.age} Jahre alt` : ''}. Das Kind IST der Held — es erlebt das Abenteuer, löst die Probleme, ist mutig.` : 'Erfinde einen passenden Helden.'}
${characters?.sideCharacters?.length ? `Folgende Personen sollen auch vorkommen:\n${characters.sideCharacters.map(c => `- ${c.role}: "${c.name}"`).join('\n')}` : ''}

Antworte NUR mit validem JSON (kein Markdown, kein \`\`\`):
{
  "title": "Kreativer Titel",
  "summary": "Ein spannender Teaser in 1-2 Sätzen, der neugierig macht ohne zu spoilern. Wie ein Klappentext für Kinder.",
  "characters": [{ "name": "Name", "gender": "child_m|child_f|adult_m|adult_f|elder_m|elder_f|creature", "traits": ["trait1", "trait2"] }],
  "scenes": [{ "lines": [{ "speaker": "Name", "text": "Dialog" }] }]
}

WICHTIG zu gender:
- child_m = männliches Kind/Junge
- child_f = weibliches Kind/Mädchen
- adult_m = erwachsener Mann (Papa, König, Bäcker, etc.)
- adult_f = erwachsene Frau (Mama, Hexe, Lehrerin, etc.)
- elder_m = älterer Mann (Opa, alter Zauberer, weiser Mann)
- elder_f = ältere Frau (Oma, weise Frau, Hexe)
- creature = Fabelwesen, Tiere, Drachen, etc.
- Der Erzähler hat IMMER gender "adult_m" (wird automatisch zugewiesen)
- KEINE SFX — lasse das "sfx" Feld komplett weg

WICHTIG zu traits (1-3 pro Charakter):
Wähle aus: mutig, neugierig, schüchtern, lustig, albern, fröhlich, warm, liebevoll, streng, arrogant, verschmitzt, gerissen, verrückt, cool, ruhig, dominant, sarkastisch, durchtrieben, sanft, märchenhaft
Die traits beschreiben die PERSÖNLICHKEIT des Charakters und werden für die Stimmzuordnung genutzt.`;

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
  const { prompt, ageGroup, characters } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Prompt ist erforderlich' });

  const id = uuidv4();
  jobs[id] = { status: 'waiting_for_script', progress: 'Skript wird geschrieben...', startedAt: Date.now() };
  res.json({ id, status: 'accepted' });

  (async () => {
    try {
      jobs[id].progress = 'Skript wird geschrieben...';
      if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');
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
app.post('/api/generate/:id/confirm', (req, res) => {
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
      await combineAudio(segments, finalPath);

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
app.post('/api/preview-line', async (req, res) => {
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

// Voice directory with names for UI
const VOICE_DIRECTORY = {
  'GoXyzBapJk3AoCJoMQl9': { name: 'Daniel', desc: 'neutral, professionell', category: 'narrator' },
  'Ewvy14akxdhONg4fmNry': { name: 'Finnegan', desc: 'neugierig, aufgeweckt, mutig', category: 'child_m' },
  'LRpNiUBlcqgIsKUzcrlN': { name: 'Georg', desc: 'lustig, emotional, albern', category: 'child_m' },
  '8RjxcQ6tY1F2YZiIvWqY': { name: 'Jasper', desc: 'schüchtern, zurückhaltend', category: 'child_m' },
  '9sjP3TfMlzEjAa6uXh3A': { name: 'Kelly', desc: 'fröhlich, lebhaft', category: 'child_f' },
  'xOKkuQfZt5N7XfbFdn9W': { name: 'Lucy Fennek', desc: 'warm, einfühlsam', category: 'child_f' },
  'VD1if7jDVYtAKs4P0FIY': { name: 'Milly Maple', desc: 'hell, quirlig', category: 'child_f' },
  'g1jpii0iyvtRs8fqXsd1': { name: 'Helmut Epic', desc: 'episch, kräftig', category: 'adult_m' },
  'ruSJRhA64v8HAqiqKXVw': { name: 'Thomas', desc: 'laut, neutral', category: 'adult_m' },
  'Tsns2HvNFKfGiNjllgqo': { name: 'Sven', desc: 'emotional, nett', category: 'adult_m' },
  'wloRHjPaKZv3ucH7TQOT': { name: 'Jorin', desc: 'ruhig, freundlich', category: 'adult_m' },
  'dFA3XRddYScy6ylAYTIO': { name: 'Helmut', desc: 'sanft, märchenhaft', category: 'adult_m' },
  'tqsaTjde7edL1GHtFchL': { name: 'Ben Smile', desc: 'warmherzig, vertrauenswürdig', category: 'adult_m' },
  '8tJgFGd1nr7H5KLTvjjt': { name: 'Captain Comedy', desc: 'verrückt, Spaßvogel', category: 'adult_m' },
  '6n4YmXLiuP4C7cZqYOJl': { name: 'Finn', desc: 'locker, modern, cool', category: 'adult_m' },
  'eWmswbut7I70CIuRsFwP': { name: 'Frankie Slim', desc: 'gelangweilt, verschmitzt', category: 'adult_m' },
  'UFO0Yv86wqRxAt1DmXUu': { name: 'Sarcastic Villain', desc: 'sarkastisch, durchtrieben', category: 'adult_m' },
  'h1IssowVS2h4nL5ZbkkK': { name: 'The Fox', desc: 'streng, dominant', category: 'adult_m' },
  '3t6439mGAsHvQFPpoPdf': { name: 'Raya', desc: 'warm, natürlich, Mama-Typ', category: 'adult_f' },
  'XNYSrtboH10kulPETnVC': { name: 'Celestine', desc: 'arrogant, hochnäsig', category: 'adult_f' },
  'RMDEjuHXo5bcQLkbu6MB': { name: 'Janine', desc: 'verspielt, expressiv', category: 'adult_f' },
  'VNHNa6nN6yJdVF3YRyuF': { name: 'Hilde', desc: 'liebevolle Oma', category: 'elder_f' },
};

app.get('/api/voices', (req, res) => {
  res.json(VOICE_DIRECTORY);
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
    const all = req.query.all === 'true'; // ?all=true shows all, otherwise only featured
    const stories = await getStories();
    res.json(all ? stories : stories.filter(s => s.featured));
  } catch (err) {
    console.error('Failed to get stories:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Toggle featured status
app.patch('/api/stories/:id/featured', async (req, res) => {
  try {
    const { featured } = req.body;
    await pool.query('UPDATE stories SET featured = $1 WHERE id = $2', [!!featured, req.params.id]);
    res.json({ status: 'ok', featured: !!featured });
  } catch (err) {
    console.error('Failed to toggle featured:', err);
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
      summary: row.summary,
      ageGroup: row.age_group,
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

    const voiceSettings = DEFAULT_VOICE_SETTINGS;
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
