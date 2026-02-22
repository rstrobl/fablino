import express from 'express';
import fs from 'fs';
import path from 'path';
import { getStories, pool } from '../db.js';
import { generateTTS, DEFAULT_VOICE_SETTINGS } from '../services/tts.js';
import { combineAudio } from '../services/audio.js';

const router = express.Router();

// Get all stories
router.get('/', async (req, res) => {
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
router.patch('/:id/featured', async (req, res) => {
  try {
    const { featured } = req.body;
    await pool.query('UPDATE stories SET featured = $1 WHERE id = $2', [!!featured, req.params.id]);
    res.json({ status: 'ok', featured: !!featured });
  } catch (err) {
    console.error('Failed to toggle featured:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// Get single story
router.get('/:id', async (req, res) => {
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
      audioUrl: row.audio_path ? `/api/audio/${row.id}` : null,
      coverUrl: row.cover_url || null,
      lines: linesRes.rows,
    });
  } catch (err) {
    console.error('Failed to get story:', err);
    res.status(500).json({ error: 'DB error' });
  }
});

// PATCH /api/stories/:id/voice — regenerate a character's lines with a new voice
router.patch('/:id/voice', async (req, res) => {
  const { character, voiceId } = req.body;
  if (!character || !voiceId) return res.status(400).json({ error: 'character and voiceId required' });

  const storyId = req.params.id;
  const AUDIO_DIR = path.resolve('../audio');
  
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
      await combineAudio(segments, finalPath, AUDIO_DIR);
    }

    res.json({ status: 'ok', character, voiceId, linesRegenerated: allLines.filter(l => l.speaker === character).length });
  } catch (err) {
    console.error('Voice update error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;