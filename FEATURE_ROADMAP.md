# Feature Roadmap

## ✅ Done
- Story generation via Claude (originally GPT-4o, switched early)
- Multi-character TTS via ElevenLabs (originally OpenAI TTS-1-HD — English accent)
- Voice swap per character (PATCH endpoint)
- Per-line loudnorm (-16 LUFS)
- Featured stories system (landing page curation)
- PostgreSQL migration (from JSON file-based storage)
- Individual line audio preservation
- TTS context (previous/next text for prosody)
- 7-category voice system with trait-based matching
- SCRIPT_RULES.md (age-appropriate content rules)
- Lautmalerei removed from dialog (TTS can't handle it)
- HTTP Range Requests for audio seeking (206 responses)
- OG tags / share endpoint for WhatsApp/Telegram previews
- Web Share API + WhatsApp/Telegram/Link copy
- Mood/Stimmung system (later removed from UI, Feb 19)
- Rebranding from Ohrenzauber → Fablino (Feb 13)
- N+1 query fix in getStories() (batched character queries)
- Code cleanup: removed file-handoff fallback, dead code, hardcoded keys

## 🔴 Critical
- **adult_f voice pool**: Only 1 voice (Celestine Hohenstein) — needs evaluation of 20 candidates
- **elder_m voice pool**: Empty — no voices at all
- **ElevenLabs quota**: Exhausted as of 2026-02-19 — need to check/upgrade plan
- **Domain registration**: fablino.de läuft, fablino.app noch verfügbar

## 🟡 Next Up
- Evaluate 20 candidate German female voices (retrieved 2026-02-19)
- Systemd service for auto-start (backend crashes silently during long Claude calls)
- User authentication / profiles
- Personalisierung (Kind als Held der Geschichte)

## 🟢 Future
- Gute-Nacht-Abo (daily story)
- Offline-Modus
- Multiple Kinderprofile (Family plan)
- Azure TTS hybrid (cost reduction)
- QR-Code-Karten (physical product)
- White-Label API for Verlage/Kitas
