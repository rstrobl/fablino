# Fablino — Project History

## Naming
- **Original name**: "Ohrenzauber" (Feb 10, 2026 — Robert: "Ohrenzauber klingt gut. Bau doch mal ein MVP")
- ohrenzauber.de war vergeben → Brainstorming Feb 13
- Rejected: Lauschfuchs (Tim fand's nicht gut), Klang-Varianten, Otter-Varianten, Fabel-Varianten (zu märchenhaft)
- **Winner: Fablino** — Fable + "-ino", warm aber erwachsen klingend
- Domains: fablino.de ✅, fablino.app ✅, fablino.com ❌
- Rebranding: 12 Files geändert, Directory renamed, Nginx updated, `/ohrenzauber/` redirects zu `/fablino/`

## Origin (Feb 10, 2026)
1. Robert hörte Prototyp-Hörspiel (Funki/Eulalia/Mäuschen, OpenAI TTS)
2. Robert: "Let's build a startup"
3. MVP in ~5 Min als Sub-Agent-Task: Vite+React, Node Backend, OpenAI GPT-4o + TTS-1-HD
4. **OpenAI TTS hatte englischen Akzent** → Robert sofort gemerkt → selben Tag auf ElevenLabs gewechselt
5. **Antje K** war erste externe Testerin: "sehr lustig", "coole Idee", hat Story erstellt (Arlo + Lotta in den Alpen), erlebte Timeouts

## Early Architecture (pre-PostgreSQL)
- File-based: `stories.json`, `prompt-*.json` / `script-*.json` file handoff
- Cron-basierte Script-Generierung: Heartbeat alle 2 Min pollt `audio/` nach Prompt-Files
- Share-Endpoint mit OG-Tags für WhatsApp-Previews

## Strategic Decision (Feb 13)
- Robert entschied zwischen Kubidu vs. Ohrenzauber als Startup-Fokus
- Django empfahl Ohrenzauber: "first mover, smaller TAM but clearer path to revenue"
- Robert schlug separate Telegram-Gruppen pro Projekt vor (noch nicht umgesetzt)

## First Real User Test: Detlev/Konstantin (Feb 19)
- Vater "Detlev" testete Fablino → begeistert
- Sohn Konstantin: Ritter findet Gold in Berg, Drache bewacht Schatz, muss **ohne Gewalt** vorbeikommen (Kitzeln/Singen/Kreativität), bringt Schatz auf Pferd heim, Drache am Ende glücklich
- 5 Iterationen generiert, v5 an Robert geschickt
- Feedback: Drachen-Lachgeräusche funktionierten nicht → führte zur Lautmalerei-Regel

## Key Refactoring (Feb 17)
- Removed dead `generateScriptViaFile()` (alte Cron-Methode)
- `MOOD_DESCRIPTIONS` war deklariert aber nie im Claude-Prompt benutzt → gefixt
- Frontend: `pollJob` Helper extrahiert, ageGroup-Display entfernt, Story Interface gefixt
- N+1 Query in `getStories()` → batched Character-Queries
- Hardcoded ElevenLabs Key Fallback entfernt

## Frontend Redesign (Feb 11)
- Professionelles Redesign: Landing-Page-Feel statt "Hobby-Projekt"
- Story-Cards mit Farb-Coding nach Mood
- Duration-Display auf Cards
- Web Share API + WhatsApp/Telegram/Link-Copy Fallbacks
- Mood/Stimmung UI später komplett entfernt (Feb 19)
