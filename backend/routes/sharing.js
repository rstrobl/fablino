import express from 'express';
import path from 'path';
import { pool } from '../db.js';

const router = express.Router();

// OG meta tags for crawlers (WhatsApp, Telegram, Twitter, Facebook)
// Serves both /share/:id and /og/story/:id (nginx proxies crawlers here)
async function serveOgPage(req, res) {
  try {
    const storyId = req.params.id;
    const { rows } = await pool.query('SELECT * FROM stories WHERE id = $1', [storyId]);
    if (!rows.length) return res.status(404).send('<h1>Geschichte nicht gefunden</h1>');
    const story = rows[0];
    const chars = await pool.query('SELECT name FROM characters WHERE story_id = $1', [story.id]);
    const charNames = chars.rows.map(c => c.name).join(', ');
    const summary = story.summary || 'Ein personalisiertes Hörspiel für kleine Ohren';
    const desc = summary;
    const storyUrl = `https://fablino.de/story/${story.id}`;
    // Use OG thumbnail (600x600 JPEG, <150KB) for fast WhatsApp/social previews
    const ogImage = story.cover_url
      ? `https://fablino.de/covers/og/${path.basename(story.cover_url, path.extname(story.cover_url))}_og.jpg`
      : `https://fablino.de/logo.png`;
    const ogImageType = story.cover_url ? 'summary_large_image' : 'summary';
    // Escape HTML entities in dynamic content
    const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${esc(story.title)} — Fablino</title>
<meta property="og:title" content="${esc(story.title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="600">
<meta property="og:image:height" content="600">
<meta property="og:type" content="website">
<meta property="og:url" content="${storyUrl}">
<meta property="og:site_name" content="Fablino · Hörspiele für kleine Helden">
<meta name="twitter:card" content="${ogImageType}">
<meta name="twitter:title" content="${esc(story.title)}">
<meta name="twitter:description" content="${esc(desc)}">
<meta name="twitter:image" content="${ogImage}">
<meta http-equiv="refresh" content="0;url=${storyUrl}">
<script>window.location.replace("${storyUrl}");</script>
</head>
<body><p>Weiterleitung zu <a href="${storyUrl}">Fablino</a>...</p></body>
</html>`);
  } catch (err) {
    res.status(500).send('<h1>Fehler</h1>');
  }
}

router.get('/share/:id', serveOgPage);
router.get('/og/story/:id', serveOgPage);

export default router;