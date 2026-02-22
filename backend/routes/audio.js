import express from 'express';
import fs from 'fs';
import path from 'path';
import { pool } from '../db.js';

const router = express.Router();

const AUDIO_DIR = path.resolve('../audio');

router.get('/:id', async (req, res) => {
  let filePath = path.join(AUDIO_DIR, `${req.params.id}.mp3`);
  // If file doesn't exist, check DB for actual audio_path
  if (!fs.existsSync(filePath)) {
    try {
      const { rows } = await pool.query('SELECT audio_path FROM stories WHERE id = $1', [req.params.id]);
      if (rows.length && rows[0].audio_path) {
        filePath = path.resolve(path.join('..', rows[0].audio_path));
      }
    } catch {}
  }
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

export default router;