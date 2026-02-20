# CLAUDE.md - Fablino Project Context

## What is Fablino?
KI-generierte personalisierte Kinderhörspiele für den DACH-Markt. Formerly "Ohrenzauber".

## Stack
- **Frontend**: Vite + React (TypeScript), served via Nginx
- **Backend**: Express.js (Port 3001, localhost-only)
- **Database**: PostgreSQL (Port 5433, DB: fablino, User: fablino)
- **AI**: Claude (story generation) + ElevenLabs (TTS, eleven_multilingual_v2)
- **Audio**: ffmpeg (per-line loudnorm -16 LUFS, combining)

## Deployment
- **Server**: Hetzner VPS `ubuntu-16gb-fsn1-1` (46.224.128.211)
- **Backend**: runs in `screen` session "fablino-be" (no systemd yet — crashes silently during long Claude calls)
- **Frontend**: Vite build served via Nginx at fablino.de
- **Nginx**: serves frontend, proxies `/api/` to localhost:3001
- **GitHub**: https://github.com/rstrobl/fablino

## Running Locally
```bash
# Backend (screen: fablino-be)
cd backend && node server.js

# Frontend (screen: fablino-fe) 
cd frontend && npm run dev  # Port 5175
```

## Key Files
- `backend/server.js` — API + Claude story generation + ElevenLabs TTS
- `SCRIPT_RULES.md` — Age-appropriate writing rules + voice mapping
- `audio/lines/{story_id}/` — Individual line audio files
- `backend/.env` — DB URL, API keys

## Database
Tables: `stories`, `characters`, `lines`
- Individual line audio preserved for voice swapping
- `stories.featured` boolean controls landing page visibility

## API Endpoints
- `PATCH /api/stories/:id/voice` — Regenerate one character's voice (voice swap)
- TTS uses `previous_text` + `next_text` context for better prosody
