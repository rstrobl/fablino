import pg from 'pg';
import { config } from 'dotenv';

config();

// PostgreSQL connection
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

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
      audioUrl: row.audio_path ? `/api/audio/${row.id}` : null,
      coverUrl: row.cover_url || null,
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

export { pool, getStories, insertStory };