# Voice System

7 categories with trait-based matching.

## Voice Pools (as of 2026-02-19)

| Category  | Voices |
|-----------|--------|
| child_m   | Finnegan, Georg, Jasper |
| child_f   | Kelly, Lucy Fennek, Milly Maple |
| adult_m   | Ben Smile, Helmut, Jorin, Captain Comedy, Finn, Frankie Slim, Sarcastic Villain, The Fox |
| adult_f   | Celestine Hohenstein only — **NEEDS MORE VOICES** |
| elder_f   | Hilde |
| elder_m   | **EMPTY** |
| creature  | Georg, Frankie Slim, Sarcastic Villain, Captain Comedy |

## Top Voices
- **child_m**: Finnegan
- **child_f**: Kelly
- **adult_m**: Ben Smile
- **adult_f**: Raya
- **creature**: Georg
- **elder_f**: Hilde

## Blacklisted
- **Elli** — permanently banned
- Julian (Ij3D7RBMzlWQDt3CctjK)
- Peter (wDnxGeJ6u1xICsO4Agdh)
- Opa Johann (R3XXDwKMU2YHwBcuYUH3)
- alte Charly (YQ9Q2ORpGKe5Kyr5k57o)

## Rules
- Georg (Funny and Emotional): NUR für Kinder/Kreaturen/Fabelwesen, NICHT für erwachsene Männer
- Milly Maple: child_f only (removed from adult_f)
- All unnamed voices removed
- No Charly/Kimo hardcoding

## Notable Voice IDs
- Finnegan (child_m): `Ewvy14akxdhONg4fmNry` — Robert's pick for Konstantin
- Georg (creature): `LRpNiUBlcqgIsKUzcrlN` — Robert liked for dragon
- Helmut: `dFA3XRddYScy6ylAYTIO` — Robert found interesting, moved to position 1
- `tqsaTjde7edL1GHtFchL` — Robert approved as good male voice
- Original narrator was Opa Johann (`R3XXDwKMU2YHwBcuYUH3`) — now blacklisted

## Category Origin
Robert proposed the system: **erzähler, kind (m/w), erwachsener (m/w), kreatur** → evolved into current 7 categories

## TTS Details
- Provider: ElevenLabs (eleven_multilingual_v2)
- **Plan**: Creator tier, 104,034 chars/cycle, resets ~March 10
- **Quota**: EXHAUSTED as of Feb 19 (28 chars remaining)
- Per-line loudnorm: -16 LUFS before combining
- Context: previous_text + next_text passed for prosody
- Cost: ~€0,60-0,85 per Hörspiel (Hauptkosten!)
- **Azure TTS** identified as 20x cheaper alternative (~€0.01-0.04/Hörspiel)
- Original MVP used OpenAI TTS-1-HD — had English accent, switched to ElevenLabs day 1
