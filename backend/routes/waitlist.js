import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pool } from '../db.js';

const router = express.Router();

// Reserve a story slot (placeholder for waitlist)
router.post('/reserve', async (req, res) => {
  try {
    const { heroName, heroAge, prompt } = req.body;
    const id = uuidv4();
    const title = heroName ? `${heroName}s Hörspiel` : 'Dein Hörspiel';
    const ageGroup = (parseInt(heroAge) || 5) <= 5 ? '3-5' : '6-9';
    const meta = JSON.stringify({ heroName, heroAge, prompt: prompt || null });
    await pool.query(
      'INSERT INTO stories (id, title, prompt, age_group, summary) VALUES ($1, $2, $3, $4, $5)',
      [id, title, prompt || null, ageGroup, meta]
    );
    // Notify Robert
    const botToken = '7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus';
    const chatId = '5559274578';
    const parts = [`✨ *Neuer Hörspiel-Wunsch!*`];
    if (heroName) parts.push(`🦸 ${heroName}${heroAge ? ` (${heroAge} J.)` : ''}`);
    if (prompt) parts.push(`💬 „${prompt}"`);
    parts.push(`🔗 https://fablino.de/story/${id}`);
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: parts.join('\n'), parse_mode: 'Markdown' })
    }).catch(() => {});

    res.json({ ok: true, storyId: id });
  } catch (err) {
    console.error('Reserve error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Waitlist signup
router.post('/', async (req, res) => {
  try {
    const { email, heroName, heroAge, prompt, sideCharacters } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Bitte gib eine gültige Email-Adresse ein.' });
    }
    const storyId = req.body.storyId;
    if (!storyId) {
      return res.status(400).json({ error: 'Story-ID fehlt.' });
    }
    // Check for duplicate email
    const existing = await pool.query('SELECT id FROM waitlist WHERE email = $1 AND story_id = $2', [email.toLowerCase().trim(), storyId]);
    if (existing.rows.length > 0) {
      return res.json({ ok: true, storyId, message: 'Du bist bereits vorgemerkt! Wir melden uns, sobald dein Hörspiel fertig ist.' });
    }
    await pool.query(
      'INSERT INTO waitlist (email, hero_name, hero_age, prompt, side_characters, story_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [email.toLowerCase().trim(), heroName || null, heroAge || null, prompt || null, JSON.stringify(sideCharacters || []), storyId]
    );
    // Notify Robert via Telegram
    const botToken = '7864521445:AAHocdoKrms2HG3kshkoETC1kVAO5tAiUus';
    const chatId = '5559274578';
    const parts = [`📬 *Email eingetragen!*\n✉️ ${email.toLowerCase().trim()}`];
    if (heroName) parts.push(`🦸 ${heroName}${heroAge ? ` (${heroAge} J.)` : ''}`);
    if (prompt) parts.push(`💬 „${prompt}"`);
    if (storyId) parts.push(`🔗 https://fablino.de/story/${storyId}`);
    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: parts.join('\n'), parse_mode: 'Markdown' })
    }).catch(() => {});

    // Create Trello card
    const trelloKey = process.env.TRELLO_API_KEY;
    const trelloToken = process.env.TRELLO_TOKEN;
    const trelloListNeu = '6998aebd8a96dd70e0c03438';
    const cardName = `${heroName || 'Unbekannt'}${heroAge ? ` (${heroAge} J.)` : ''} — ${email.toLowerCase().trim()}`;
    const cardDesc = [
      `**Email:** ${email.toLowerCase().trim()}`,
      heroName ? `**Held:** ${heroName}${heroAge ? ` (${heroAge} J.)` : ''}` : null,
      prompt ? `**Wunsch:** ${prompt}` : null,
      `\n🔗 **Story:** https://fablino.de/story/${storyId}`,
      `\n### Status`,
      `- [ ] Script generieren`,
      `- [ ] Audio generieren`,
      `- [ ] An Kunde senden`,
    ].filter(Boolean).join('\n');
    fetch(`https://api.trello.com/1/cards?key=${trelloKey}&token=${trelloToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idList: trelloListNeu, name: cardName, desc: cardDesc })
    }).catch(() => {});

    res.json({ ok: true, storyId, message: 'Du bist dabei! Wir melden uns per Email, sobald dein Hörspiel fertig gezaubert ist.' });
  } catch (err) {
    console.error('Waitlist error:', err);
    res.status(500).json({ error: 'Etwas ist schiefgelaufen. Bitte versuche es später noch mal.' });
  }
});

// Check if story has waitlist signup
router.get('/:storyId', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT email FROM waitlist WHERE story_id = $1 LIMIT 1', [req.params.storyId]);
    res.json({ registered: rows.length > 0 });
  } catch (err) {
    res.json({ registered: false });
  }
});

// Admin: list waitlist entries
router.get('/', async (_req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM waitlist ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;