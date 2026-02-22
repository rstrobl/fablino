import express from 'express';
import { VOICE_DIRECTORY } from '../services/tts.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.json(VOICE_DIRECTORY);
});

export default router;