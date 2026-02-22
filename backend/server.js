import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

// Import routes
import storiesRouter from './routes/stories.js';
import generationRouter from './routes/generation.js';
import voicesRouter from './routes/voices.js';
import audioRouter from './routes/audio.js';
import waitlistRouter from './routes/waitlist.js';
import sharingRouter from './routes/sharing.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';

config(); // load .env

const app = express();
app.use(cors());
app.use(express.json());

const COVERS_DIR = path.resolve('./covers');
app.use('/covers/og', express.static(path.join(COVERS_DIR, 'og'), { maxAge: '7d' }));
app.use('/covers', express.static(COVERS_DIR));

const AUDIO_DIR = path.resolve('../audio');
fs.mkdirSync(AUDIO_DIR, { recursive: true });

// Routes
app.use('/api/stories', storiesRouter);
app.use('/api/generate', generationRouter);
app.use('/api/voices', voicesRouter);
app.use('/api/audio', audioRouter);
app.use('/api/waitlist', waitlistRouter);
app.use('/api/reserve', waitlistRouter); // Reserve uses waitlist router
app.use('/', sharingRouter);

// Error handling middleware
app.use(errorHandler);

app.listen(3001, '127.0.0.1', () => console.log('🎧 Fablino Backend on 127.0.0.1:3001'));