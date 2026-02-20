# 🎧✨ Fablino

**KI-generierte personalisierte Kinderhörspiele für den DACH-Markt.**

Website: [fablino.de](https://fablino.de)

## Was ist Fablino?
Fablino erstellt automatisch Hörspiele für Kinder (3-9 Jahre) mit individuellen Stimmen pro Charakter. Script-Generierung via Claude, Vertonung via ElevenLabs.

- Typisches Hörspiel: 3-6 Min, ~3.000-6.000 TTS-Zeichen, 4+ Charaktere
- Zwei Alterskategorien: Kleine Ohren (3-5) & Große Ohren (6-9)

## Stack
- **Frontend**: Vite + React (TypeScript)
- **Backend**: Express.js + PostgreSQL
- **AI**: Claude (Script) + ElevenLabs (TTS)
- **Audio**: ffmpeg (loudnorm + combining)

## Running
```bash
# Backend (Port 3001)
cd backend && node server.js

# Frontend (Port 5175)
cd frontend && npm run dev
```

## Docs
- [CLAUDE.md](CLAUDE.md) — Project context & architecture
- [SCRIPT_RULES.md](SCRIPT_RULES.md) — Age-appropriate writing rules
- [VOICE_SYSTEM.md](VOICE_SYSTEM.md) — Voice categories, pools & blacklist
- [PRICING_STRATEGY.md](PRICING_STRATEGY.md) — Markt, Monetarisierung, Unit Economics
- [FEATURE_ROADMAP.md](FEATURE_ROADMAP.md) — Done, critical, next, future
- [HISTORY.md](HISTORY.md) — Naming, origin story, key milestones
