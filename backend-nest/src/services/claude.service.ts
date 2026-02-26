import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

const CLAUDE_SETTINGS_PATH = path.join(__dirname, '../../data/claude-settings.json');
const DEFAULT_CLAUDE_SETTINGS = {
  model: 'claude-opus-4-20250514',
  max_tokens: 16000,
  temperature: 1.0,
  thinking_budget: 10000,
};

function loadClaudeSettings() {
  try {
    const raw = fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8');
    return { ...DEFAULT_CLAUDE_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CLAUDE_SETTINGS };
  }
}

export interface Character {
  name: string;
  gender: 'male' | 'female';
  age: number;
  type: string;
  species: string;
  voice_character: string;
  emoji?: string;
  description?: string;
}

export interface Line {
  speaker: string;
  text: string;
  emotion?: string;
}

export interface SfxLine {
  sfx: string;
  duration: number;
}

export type ScriptLine = Line | SfxLine;

export function isSfxLine(line: any): line is SfxLine {
  return 'sfx' in line && !('speaker' in line);
}

export interface Scene {
  lines: ScriptLine[];
}

export interface Script {
  title: string;
  summary: string;
  characters: Character[];
  scenes: Scene[];
}

export interface GeneratedScript {
  script: Script;
  systemPrompt: string;
  usage?: { input_tokens: number; output_tokens: number; thinking_tokens: number };
}

export interface CharacterRequest {
  hero?: {
    name: string;
    age?: string;
  };
  sideCharacters?: Array<{
    name: string;
    role: string;
  }>;
}

@Injectable()
export class ClaudeService {
  constructor(private configService: ConfigService) {}

  async generateScript(
    prompt: string,
    age: number = 6,
    characters?: CharacterRequest,
    systemPromptOverride?: string,
  ): Promise<GeneratedScript> {
    const ANTHROPIC_API_KEY = this.configService.get<string>('ANTHROPIC_API_KEY');

    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');
    }

    const ageRules = `
ZIELALTER: ${age} Jahre. Passe Sprache, Komplexität und Länge exakt an dieses Alter an.

${age <= 5 ? `REGELN FÜR JÜNGERE KINDER (${age} Jahre):
- Kurze Sätze. Wiederholungen ("Klopf, klopf, klopf!"). Klangwörter nur im Erzählertext.
- KEINE Zahlen, Maßeinheiten, Zeitangaben, abstrakte Konzepte
- Emotionen benennen: "Da wurde der Igel ganz traurig" (Kinder lernen Gefühle einzuordnen)
- Max 6 Charaktere (inkl. Erzähler)
- Klare Gut/Böse-Struktur, aber Böse wird nie bestraft — sondern versteht es am Ende
- Happy End ist Pflicht
- LÄNGE: MINDESTENS 40 Zeilen, besser 50–60. Das Hörspiel MUSS mindestens 6 Minuten dauern. Schreibe ausführliche Szenen mit vielen Dialogen. Nicht abkürzen! Jede Szene braucht mehrere Hin-und-Her-Dialoge zwischen den Charakteren.
- Erzähler führt stark — bindet Szenen zusammen, beschreibt Bilder, leitet Dialoge ein
- Keine Ironie, kein Sarkasmus — wird nicht verstanden` : age <= 8 ? `REGELN FÜR MITTLERE KINDER (${age} Jahre):
- Komplexere Plots: Rätsel, Wendungen, Geheimnisse
- Humor: Wortspiele, absurde Situationen, Slapstick
- Einfache Zahlen/Fakten OK wenn sie der Story dienen
- Bis 6 Charaktere, Nebenfiguren möglich
- Moral darf subtil sein — nicht mit dem Holzhammer
- Offene Enden möglich (Cliffhanger für Fortsetzungen!)
- LÄNGE: MINDESTENS 60 Zeilen, besser 70–80. Das Hörspiel MUSS mindestens 10 Minuten dauern. Schreibe ausführliche Szenen mit vielen Dialogen, Wendungen und Details. Nicht abkürzen!
- Erzähler als Rahmen: Intro, Szenenwechsel, Atmosphäre, Outro — aber Dialog trägt die Handlung
- Leichte Grusel-Elemente OK (aber immer aufgelöst)` : `REGELN FÜR ÄLTERE KINDER (${age} Jahre):
- Anspruchsvolle Plots: Mehrere Handlungsstränge, echte Spannung, überraschende Wendungen
- Humor: Ironie, Wortspiele, situationsbedingte Komik
- Fakten, Technik, Geschichte dürfen einfließen
- Bis 8 Charaktere, komplexere Beziehungen zwischen Figuren
- Moral und Botschaft subtil eingewoben
- Cliffhanger und offene Enden ausdrücklich erlaubt
- LÄNGE: MINDESTENS 70 Zeilen, besser 80–100. Das Hörspiel MUSS mindestens 12 Minuten dauern. Ausführliche Dialoge, Spannungsaufbau, Details. Nicht abkürzen!
- Erzähler sparsam — Dialog und Handlung tragen die Story
- Echte Spannung und leichter Grusel OK`}`;

    // Load base system prompt from file (or use override)
    const fs = require('fs');
    const path = require('path');
    const promptPath = path.join(__dirname, '../../data/system-prompt.txt');
    const filePrompt = fs.readFileSync(promptPath, 'utf-8');
    const basePrompt = systemPromptOverride
      ? `${filePrompt}\n\n--- Zusätzliche Anweisungen ---\n${systemPromptOverride}`
      : filePrompt;

    const systemPrompt = `${basePrompt}

${ageRules}

PERSONALISIERUNG:
${characters?.hero ? `Der HELD der Geschichte heißt "${characters.hero.name}"${characters.hero.age ? ` und ist ${characters.hero.age} Jahre alt` : ''}. Das Kind IST der Held — es erlebt das Abenteuer, löst die Probleme, ist mutig.` : 'Erfinde einen passenden Helden.'}
${characters?.sideCharacters?.length ? `Folgende Personen sollen auch vorkommen:\n${characters.sideCharacters.map(c => `- ${c.role}: "${c.name}"`).join('\n')}` : ''}

Antworte NUR mit validem JSON (kein Markdown, kein \`\`\`):
{
  "title": "Kreativer Titel",
  "summary": "Ein kurzer Teaser-Satz, der neugierig macht und mit einer offenen Frage endet (z.B. 'Wird sie es schaffen?', 'Ob das gut geht?'). Maximal EIN Satz. Nicht spoilern!",
  "characters": [{ "name": "Name", "gender": "male|female", "age": 8, "type": "human|creature", "species": "human|unicorn|owl|dragon|...", "voice_character": "kind|funny|evil|wise", "description": "kurze visuelle Beschreibung mit Rolle" }],
  "scenes": [{ "lines": [{ "speaker": "Name", "text": "Dialog", "emotion": "neutral" }, { "sfx": "english sound description", "duration": 2 }] }]
}

WICHTIG zu SFX-Zeilen in scenes:
- SFX-Zeilen haben KEIN "speaker" und KEIN "text" — nur "sfx" (englische Beschreibung) und "duration" (Sekunden, 1-5)
- SFX stehen ZWISCHEN normalen Sprechzeilen
- 1-3 SFX pro Szene, sparsam und wirkungsvoll einsetzen
- Die sfx-Beschreibung ist IMMER auf Englisch (z.B. "door creaking open", "thunder rumbling", "leaves rustling")

WICHTIG zu emotion:
- Jede Sprechzeile MUSS ein "emotion"-Feld haben (englisch)
- Erlaubte Werte: neutral, happy, excited, sad, angry, scared, nervous, surprised, proud, shy, mysterious, whispering, shouting, laughing, crying
- Die Emotion beschreibt die GRUNDSTIMMUNG der Zeile — zusätzliche Audio-Tags im Text sind weiterhin erlaubt
- Emotionen dürfen sich über mehrere Zeilen halten (trauriges Einhorn bleibt "sad" bis sich etwas ändert)
- JEDE Figur (außer Erzähler) MUSS eine passende Emotion haben — "neutral" ist fast nie richtig! Auch "Hallo, hast du meine Mama gesehen?" ist mindestens "nervous" oder "hopeful"
- Der Erzähler darf neutral sein, aber andere Figuren nicht
- SFX-Zeilen haben KEIN emotion-Feld

WICHTIG zu Charakteren:
- gender: "male" oder "female" — auch für Tiere und Fabelwesen
- age: geschätztes Alter als Zahl. Bei Tieren/Kreaturen: wie alt KLINGT die Figur? (kleiner Troll = 8, weise Eule = 80, junges Einhorn = 4)
- type: "human" für Menschen, "creature" für alles andere (Tiere, Fabelwesen, Monster, Roboter etc.)
- species: die KONKRETE Spezies auf Englisch (für Icons). Beispiele: "human", "unicorn", "owl", "dragon", "fox", "troll", "fairy", "robot", "cat", "bear". Bei Menschen immer "human"
- voice_character: beschreibt den STIMMCHARAKTER — "kind" (warm, freundlich), "funny" (verspielt, albern), "evil" (bedrohlich, dunkel), "wise" (ruhig, weise)
- Der Erzähler hat IMMER gender "male", age 35, type "human", species "human", voice_character "kind" (wird automatisch zugewiesen)`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify((() => {
        const cs = loadClaudeSettings();
        return {
          model: cs.model,
          max_tokens: cs.max_tokens,
          temperature: cs.temperature,
          thinking: {
            type: 'enabled',
            budget_tokens: cs.thinking_budget,
          },
          messages: [{ role: 'user', content: `Schreibe ein Hörspiel basierend auf diesem Prompt:\n\n${prompt}\n\nDenke zuerst gründlich nach: Plane die Story-Struktur, die Charaktere und ihre Beziehungen, den Spannungsbogen, und wie der Held das Problem clever löst. Prüfe auf Logikfehler und Widersprüche. Dann schreibe das finale JSON.` }],
          system: systemPrompt,
        };
      })()),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API ${response.status}: ${errText}`);
    }

    const data = await response.json();
    // With extended thinking, content has thinking blocks + text block
    const textBlock = data.content.find((b: any) => b.type === 'text');
    if (!textBlock) throw new Error('No text block in Claude response');
    const text = textBlock.text.trim();
    // Parse JSON, handle potential markdown wrapping
    const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    let script: any;
    try {
      script = JSON.parse(jsonStr);
    } catch (e) {
      // Try to fix common Claude JSON errors: trailing commas, unescaped quotes in strings
      const fixed = jsonStr
        .replace(/,\s*([\]}])/g, '$1')  // trailing commas
        .replace(/([^\\])"\s*\n/g, '$1\\"\n');  // unescaped quotes
      try {
        script = JSON.parse(fixed);
        console.log('JSON auto-fixed (trailing comma or similar)');
      } catch {
        console.error('Script generation error:', e);
        console.error('Raw JSON (first 500 chars):', jsonStr.substring(0, 500));
        throw e;
      }
    }
    
    // Extract thinking tokens
    const thinkingBlock = data.content.find((b: any) => b.type === 'thinking');
    const thinkingTokens = thinkingBlock ? (data.usage?.cache_creation_input_tokens || 0) : 0;

    return {
      script,
      systemPrompt,
      usage: data.usage ? {
        input_tokens: data.usage.input_tokens || 0,
        output_tokens: data.usage.output_tokens || 0,
        thinking_tokens: thinkingTokens,
      } : undefined,
    };
  }

  async reviewScript(script: Script, age: number): Promise<ReviewResult> {
    const ANTHROPIC_API_KEY = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');

    const totalLines = script.scenes.reduce((t, s) => t + s.lines.filter(l => !isSfxLine(l)).length, 0);
    const scriptText = script.scenes.map((scene, si) =>
      scene.lines.map(l => isSfxLine(l) ? `[Szene ${si + 1}] 🔊 SFX: ${l.sfx}` : `[Szene ${si + 1}] ${l.speaker}: ${l.text}`).join('\n')
    ).join('\n\n');

    const systemPrompt = `Du bist ein erfahrener Lektor für deutsche Kinderhörspiele. Du überprüfst Skripte auf Qualität, Natürlichkeit und Altersangemessenheit.

Deine Aufgabe: Analysiere das Skript und schlage konkrete Verbesserungen vor.

Prüfe auf:
1. **Wiederholungen**: Gleiche Formulierungen, Wörter oder Aktionen die sich wiederholen
2. **Natürlichkeit**: Klingt der Dialog wie echte Kinder/Menschen sprechen? Keine Übersetzungen aus dem Englischen
3. **Übertriebener Enthusiasmus**: Zu viele "Fantastisch!", "Toll!", "Super!" — Kinder reden nicht so aufgedreht
4. **Flache Charaktere**: Haben Nebenfiguren eigene Persönlichkeit oder sind sie nur Stichwortgeber?
5. **Show don't tell**: Wird zu viel erklärt statt gezeigt? (z.B. "Mit meiner Hockey-Technik schaffe ich das!")
6. **Erzwungene Referenzen**: Werden Themen/Hobbys zu plump eingebaut?
7. **Pacing**: Ist das Ende zu lang? Gibt es Durchhänger?
8. **Altersangemessenheit**: Passt Sprache und Komplexität zum Alter (${age} Jahre)?
9. **TTS-Optimierung**: Ausrufe als eigene Sätze mit "!", dramatische Pausen mit "..." oder Punkten, keine Klammern/Gedankenstriche/Semikolons
10. **Keine erfundenen Alltagspersonen**: Nur Fantasiefiguren, keine "Trainer Weber" oder "beste Freundin Emma"
11. **Rätsel-Qualität**: Sind Rätsel logisch einwandfrei, altersgerecht und fair lösbar? Keine konstruierten oder fragwürdigen Lösungen. Das Rätsel muss eindeutig eine richtige Antwort haben.
12. **Szenen-Struktur**: Gibt es genug Szenenwechsel? Eine Geschichte sollte mindestens 4-6 Szenen haben. Alles in einer Szene = keine Pausen im Audio.

Antworte NUR mit einem JSON-Objekt in diesem Format:
{
  "overallRating": "gut" | "okay" | "überarbeiten",
  "summary": "Kurze Gesamteinschätzung (2-3 Sätze)",
  "suggestions": [
    {
      "type": "replace" | "delete" | "insert",
      "scene": 0,
      "lineIndex": 3,
      "reason": "Warum diese Änderung",
      "original": "Originaltext (bei replace/delete)",
      "replacement": "Neuer Text (bei replace/insert)",
      "speaker": "Sprecher (bei insert)"
    }
  ]
}

Maximal 15 Vorschläge, fokussiert auf die wichtigsten Verbesserungen. Bei "insert" gibt lineIndex die Position an, VOR der eingefügt werden soll.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: loadClaudeSettings().model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Hier ist das Skript für ein Kinderhörspiel (${age} Jahre, ${script.scenes.length} Szenen, ${totalLines} Zeilen):\n\nTitel: ${script.title}\n\nCharaktere: ${script.characters.map(c => `${c.name} (${c.gender})`).join(', ')}\n\n${scriptText}` }],
      }),
    });

    if (!res.ok) throw new Error(`Claude API error: ${res.status}`);
    const data = await res.json();
    const text = data.content[0].text;

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Could not parse review response');

    const result = JSON.parse(jsonMatch[0]) as ReviewResult;
    (result as any).usage = data.usage ? {
      input_tokens: data.usage.input_tokens || 0,
      output_tokens: data.usage.output_tokens || 0,
    } : undefined;
    return result;
  }
}

export interface ReviewSuggestion {
  type: 'replace' | 'delete' | 'insert';
  scene: number;
  lineIndex: number;
  reason: string;
  original?: string;
  replacement?: string;
  speaker?: string;
}

export interface ReviewResult {
  overallRating: 'gut' | 'okay' | 'überarbeiten';
  summary: string;
  suggestions: ReviewSuggestion[];
}