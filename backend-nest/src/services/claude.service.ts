import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Character {
  name: string;
  gender: 'child_m' | 'child_f' | 'adult_m' | 'adult_f' | 'elder_m' | 'elder_f' | 'creature';
  traits: string[];
}

export interface Line {
  speaker: string;
  text: string;
}

export interface Scene {
  lines: Line[];
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
  "characters": [{ "name": "Name", "gender": "child_m|child_f|adult_m|adult_f|elder_m|elder_f|creature", "traits": ["trait1", "trait2"] }],
  "scenes": [{ "lines": [{ "speaker": "Name", "text": "Dialog" }] }]
}

WICHTIG zu gender:
- child_m = männliches Kind/Junge, child_f = weibliches Kind/Mädchen
- adult_m = erwachsener Mann, adult_f = erwachsene Frau
- elder_m = älterer Mann, elder_f = ältere Frau
- creature = Fabelwesen, Tiere, Drachen, etc.
- Der Erzähler hat IMMER gender "adult_m" (wird automatisch zugewiesen)
- KEINE SFX — lasse das "sfx" Feld komplett weg

WICHTIG zu traits (1-3 pro Charakter):
Wähle aus: mutig, neugierig, schüchtern, lustig, albern, fröhlich, warm, liebevoll, streng, arrogant, verschmitzt, gerissen, verrückt, cool, ruhig, dominant, sarkastisch, durchtrieben, sanft, märchenhaft
Die traits beschreiben die PERSÖNLICHKEIT des Charakters und werden für die Stimmzuordnung genutzt.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content: `Schreibe ein Hörspiel basierend auf diesem Prompt:\n\n${prompt}` }],
        system: systemPrompt,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    // Parse JSON, handle potential markdown wrapping
    const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    const script = JSON.parse(jsonStr);
    
    // Return both the script and the system prompt used
    return {
      script,
      systemPrompt
    };
  }
}