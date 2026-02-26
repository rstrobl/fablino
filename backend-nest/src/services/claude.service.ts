import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

const DATA_DIR = path.join(__dirname, '../../data');
const CLAUDE_SETTINGS_PATH = path.join(DATA_DIR, 'claude-settings.json');
const DEFAULT_CLAUDE_SETTINGS = {
  model: 'claude-opus-4-20250514',
  reviewerModel: 'claude-sonnet-4-20250514',
  ttsModel: 'claude-sonnet-4-20250514',
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

function loadPromptFile(filename: string): string {
  try {
    return fs.readFileSync(path.join(DATA_DIR, filename), 'utf-8');
  } catch {
    return '';
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
  pipeline?: PipelineLog;
  usage?: { input_tokens: number; output_tokens: number; thinking_tokens: number };
}

export interface PipelineLog {
  steps: PipelineStep[];
  totalTokens: { input: number; output: number };
}

export interface PipelineStep {
  agent: 'author' | 'reviewer' | 'revision' | 'tts';
  model: string;
  durationMs: number;
  tokens: { input: number; output: number };
  reviewResult?: ReviewResult;
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

export interface ReviewIssue {
  scene: number;
  line: number;
  type: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  suggestion: string;
}

export interface ReviewResult {
  approved: boolean;
  issues: ReviewIssue[];
  summary: string;
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

@Injectable()
export class ClaudeService {
  constructor(private configService: ConfigService) {}

  private getApiKey(): string {
    const key = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (!key) throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');
    return key;
  }

  private buildAgeRules(age: number): string {
    if (age <= 5) return `REGELN FÜR JÜNGERE KINDER (${age} Jahre):
- Kurze Sätze. Wiederholungen ("Klopf, klopf, klopf!"). Klangwörter nur im Erzählertext.
- KEINE Zahlen, Maßeinheiten, Zeitangaben, abstrakte Konzepte
- Emotionen benennen: "Da wurde der Igel ganz traurig"
- Max 6 Charaktere (inkl. Erzähler)
- Klare Gut/Böse-Struktur, aber Böse wird nie bestraft — sondern versteht es am Ende
- Happy End ist Pflicht
- LÄNGE: MINDESTENS 40 Zeilen, besser 50–60. MINDESTENS 6 Minuten.
- Erzähler führt stark
- Keine Ironie, kein Sarkasmus`;

    if (age <= 8) return `REGELN FÜR MITTLERE KINDER (${age} Jahre):
- Komplexere Plots: Wendungen, Geheimnisse
- Humor: Wortspiele, absurde Situationen, Slapstick
- Einfache Zahlen/Fakten OK
- Bis 6 Charaktere, Nebenfiguren möglich
- Moral darf subtil sein
- LÄNGE: MINDESTENS 60 Zeilen, besser 70–80. MINDESTENS 10 Minuten.
- Dialog trägt die Handlung
- Leichte Grusel-Elemente OK`;

    return `REGELN FÜR ÄLTERE KINDER (${age} Jahre):
- Anspruchsvolle Plots: Mehrere Handlungsstränge, echte Spannung
- Humor: Ironie, Wortspiele, situationsbedingte Komik
- Bis 8 Charaktere, komplexere Beziehungen
- Cliffhanger erlaubt
- LÄNGE: MINDESTENS 70 Zeilen, besser 80–100. MINDESTENS 12 Minuten.
- Dialog und Handlung tragen die Story
- Echte Spannung und leichter Grusel OK`;
  }

  private buildCharacterSpec(characters?: CharacterRequest): string {
    return `PERSONALISIERUNG:
${characters?.hero ? `Der HELD heißt "${characters.hero.name}"${characters.hero.age ? ` und ist ${characters.hero.age} Jahre alt` : ''}. Das Kind IST der Held.` : 'Erfinde einen passenden Helden.'}
${characters?.sideCharacters?.length ? `Folgende Personen sollen auch vorkommen:\n${characters.sideCharacters.map(c => `- ${c.role}: "${c.name}"`).join('\n')}` : ''}`;
  }

  private readonly JSON_FORMAT = `Antworte NUR mit validem JSON (kein Markdown, kein \`\`\`):
{
  "title": "Kreativer Titel",
  "summary": "Ein kurzer Teaser-Satz der neugierig macht. Maximal EIN Satz. Nicht spoilern!",
  "characters": [{ "name": "Name", "gender": "male|female", "age": 8, "type": "human|creature", "species": "human|owl|dragon|...", "voice_character": "kind|funny|evil|wise", "emoji": "🦊", "description": "kurze visuelle Beschreibung" }],
  "scenes": [{ "lines": [{ "speaker": "Name", "text": "Dialog", "emotion": "neutral" }] }]
}

WICHTIG zu emotion:
- Jede Sprechzeile MUSS ein "emotion"-Feld haben
- Die Emotion wird automatisch als Audio-Tag vorangestellt — KEINE Emotions-Tags im Text wiederholen!
- Im Text NUR Performance-Tags: [chuckles], [laughs], [sighs], [gasps], [whispering], [shouting], [sobbing] etc.
- JEDE Figur (außer Erzähler) MUSS eine passende Emotion haben — "neutral" ist fast nie richtig

WICHTIG zu Charakteren:
- type: "human" oder "creature" (Tiere, Fabelwesen, Monster, Roboter)
- species: konkrete Spezies auf Englisch (human, unicorn, owl, dragon, fox, badger...)
- emoji: EINZELNES Unicode-Emoji, KEINE ZWJ-Sequenzen (🐦‍⬛, 🐻‍❄️). Erzähler=📖
- voice_character: "kind"|"funny"|"evil"|"wise"
- Der Erzähler: gender "male", age 35, type "human", species "human", voice_character "kind"`;

  private async callClaude(opts: {
    model: string;
    systemPrompt: string;
    userMessage: string;
    maxTokens?: number;
    temperature?: number;
    thinking?: { budget: number };
  }): Promise<{ text: string; usage: { input_tokens: number; output_tokens: number } }> {
    const body: any = {
      model: opts.model,
      max_tokens: opts.maxTokens || 16000,
      temperature: opts.temperature || 1.0,
      messages: [{ role: 'user', content: opts.userMessage }],
      system: opts.systemPrompt,
    };

    if (opts.thinking) {
      body.thinking = { type: 'enabled', budget_tokens: opts.thinking.budget };
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': this.getApiKey(),
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const textBlock = data.content.find((b: any) => b.type === 'text');
    if (!textBlock) throw new Error('No text block in Claude response');

    return {
      text: textBlock.text.trim(),
      usage: {
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
      },
    };
  }

  private parseJson(text: string): any {
    const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      const fixed = jsonStr.replace(/,\s*([\]}])/g, '$1');
      try {
        return JSON.parse(fixed);
      } catch {
        // Try to extract JSON from text
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw e;
      }
    }
  }

  /**
   * Multi-agent pipeline: Author → Reviewer → Revision → TTS
   */
  async generateScript(
    prompt: string,
    age: number = 6,
    characters?: CharacterRequest,
    systemPromptOverride?: string,
    onProgress?: (step: string) => void,
  ): Promise<GeneratedScript> {
    const cs = loadClaudeSettings();
    const pipeline: PipelineLog = { steps: [], totalTokens: { input: 0, output: 0 } };

    // === STEP 1: Author writes the story ===
    console.log('🖊️ Agent 1/4: Author writing story...');
    onProgress?.('Autor schreibt Story...');
    const authorStart = Date.now();

    const authorPrompt = loadPromptFile('agent-author.txt') || loadPromptFile('system-prompt.txt');
    const sfxPrompt = cs.sfxEnabled ? this.buildSfxPrompt() : '';
    
    const fullAuthorPrompt = [
      systemPromptOverride ? `${authorPrompt}\n\n--- Zusätzliche Anweisungen ---\n${systemPromptOverride}` : authorPrompt,
      `\nZIELALTER: ${age} Jahre.\n${this.buildAgeRules(age)}`,
      this.buildCharacterSpec(characters),
      sfxPrompt,
      this.JSON_FORMAT,
    ].join('\n\n');

    const authorResult = await this.callClaude({
      model: cs.model,
      systemPrompt: fullAuthorPrompt,
      userMessage: `Schreibe ein Hörspiel basierend auf diesem Prompt:\n\n${prompt}\n\nDenke zuerst gründlich nach. Dann schreibe das finale JSON.`,
      maxTokens: cs.max_tokens,
      temperature: cs.temperature,
      thinking: { budget: cs.thinking_budget },
    });

    let script = this.parseJson(authorResult.text) as Script;
    pipeline.steps.push({
      agent: 'author',
      model: cs.model,
      durationMs: Date.now() - authorStart,
      tokens: { input: authorResult.usage.input_tokens, output: authorResult.usage.output_tokens },
    });
    pipeline.totalTokens.input += authorResult.usage.input_tokens;
    pipeline.totalTokens.output += authorResult.usage.output_tokens;

    console.log(`✅ Author done: "${script.title}" (${script.scenes?.length} scenes, ${authorResult.usage.output_tokens} tokens, ${Date.now() - authorStart}ms)`);

    // === STEP 2: Reviewer checks the story ===
    console.log('🔍 Agent 2/4: Reviewer checking...');
      onProgress?.('Lektor prüft Story...');
    const reviewerStart = Date.now();

    const reviewerPrompt = loadPromptFile('agent-reviewer.txt');
    if (reviewerPrompt) {
      const reviewResult = await this.callClaude({
        model: cs.reviewerModel || cs.model,
        systemPrompt: reviewerPrompt,
        userMessage: `Prüfe dieses Kinderhörspiel (Zielalter: ${age} Jahre):\n\n${JSON.stringify(script, null, 2)}`,
        maxTokens: 4096,
        temperature: 0.3,
      });

      let review: ReviewResult;
      try {
        review = this.parseJson(reviewResult.text) as ReviewResult;
      } catch {
        console.warn('⚠️ Could not parse review result, skipping revision');
        review = { approved: true, issues: [], summary: 'Review parse error' };
      }

      pipeline.steps.push({
        agent: 'reviewer',
        model: cs.reviewerModel || cs.model,
        durationMs: Date.now() - reviewerStart,
        tokens: { input: reviewResult.usage.input_tokens, output: reviewResult.usage.output_tokens },
        reviewResult: review,
      });
      pipeline.totalTokens.input += reviewResult.usage.input_tokens;
      pipeline.totalTokens.output += reviewResult.usage.output_tokens;

      const criticalCount = review.issues.filter(i => i.severity === 'critical').length;
      const majorCount = review.issues.filter(i => i.severity === 'major').length;
      console.log(`✅ Review done: ${review.approved ? 'APPROVED' : 'NEEDS REVISION'} (${criticalCount} critical, ${majorCount} major, ${review.issues.length} total, ${Date.now() - reviewerStart}ms)`);

      // === STEP 3: Author revises if needed ===
      if (!review.approved && review.issues.length > 0) {
        console.log('✏️ Agent 3/4: Author revising...');
        onProgress?.('Autor überarbeitet Story...');
        const revisionStart = Date.now();

        const issueList = review.issues
          .filter(i => i.severity !== 'minor')
          .map(i => `- [${i.severity}] Szene ${i.scene}, Zeile ${i.line}: ${i.description} → ${i.suggestion}`)
          .join('\n');

        const revisionResult = await this.callClaude({
          model: cs.model,
          systemPrompt: fullAuthorPrompt,
          userMessage: `Hier ist dein Hörspiel-Skript:\n\n${JSON.stringify(script, null, 2)}\n\nEin Lektor hat folgende Probleme gefunden:\n\n${issueList}\n\nLektor-Zusammenfassung: ${review.summary}\n\nÜberarbeite das Skript und behebe ALLE genannten Probleme. Gib das KOMPLETTE überarbeitete Skript als JSON zurück.`,
          maxTokens: cs.max_tokens,
          temperature: cs.temperature,
          thinking: { budget: cs.thinking_budget },
        });

        try {
          script = this.parseJson(revisionResult.text) as Script;
          console.log(`✅ Revision done (${Date.now() - revisionStart}ms)`);
        } catch (e) {
          console.warn('⚠️ Could not parse revision, keeping original script');
        }

        pipeline.steps.push({
          agent: 'revision',
          model: cs.model,
          durationMs: Date.now() - revisionStart,
          tokens: { input: revisionResult.usage.input_tokens, output: revisionResult.usage.output_tokens },
        });
        pipeline.totalTokens.input += revisionResult.usage.input_tokens;
        pipeline.totalTokens.output += revisionResult.usage.output_tokens;
      } else {
        console.log('⏭️ Skipping revision — reviewer approved');
      }
    } else {
      console.log('⏭️ Skipping review — no agent-reviewer.txt');
    }

    // === STEP 4: TTS optimization ===
    console.log('🎙️ Agent 4/4: TTS optimizing...');
    onProgress?.('TTS-Optimierung...');
    const ttsStart = Date.now();

    const ttsPrompt = loadPromptFile('agent-tts.txt');
    if (ttsPrompt) {
      const ttsResult = await this.callClaude({
        model: cs.ttsModel || cs.model,
        systemPrompt: ttsPrompt,
        userMessage: `Optimiere dieses Hörspiel-Skript für TTS:\n\n${JSON.stringify(script, null, 2)}`,
        maxTokens: cs.max_tokens,
        temperature: 0.5,
      });

      try {
        script = this.parseJson(ttsResult.text) as Script;
        console.log(`✅ TTS optimization done (${Date.now() - ttsStart}ms)`);
      } catch (e) {
        console.warn('⚠️ Could not parse TTS result, keeping previous script');
      }

      pipeline.steps.push({
        agent: 'tts',
        model: cs.ttsModel || cs.model,
        durationMs: Date.now() - ttsStart,
        tokens: { input: ttsResult.usage.input_tokens, output: ttsResult.usage.output_tokens },
      });
      pipeline.totalTokens.input += ttsResult.usage.input_tokens;
      pipeline.totalTokens.output += ttsResult.usage.output_tokens;
    } else {
      console.log('⏭️ Skipping TTS — no agent-tts.txt');
    }

    const totalDuration = pipeline.steps.reduce((t, s) => t + s.durationMs, 0);
    console.log(`🏁 Pipeline complete: ${pipeline.steps.length} steps, ${pipeline.totalTokens.input + pipeline.totalTokens.output} total tokens, ${Math.round(totalDuration / 1000)}s`);

    return {
      script,
      systemPrompt: fullAuthorPrompt,
      pipeline,
    };
  }

  private buildSfxPrompt(): string {
    try {
      const sfxPromptTemplate = fs.readFileSync(path.join(DATA_DIR, 'sfx-prompt.txt'), 'utf-8');
      const sfxLibrary = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'sfx-library.json'), 'utf-8'));
      const activeSfx = sfxLibrary.filter((s: any) => s.active);
      if (activeSfx.length === 0) return '';

      const sfxList = activeSfx.map((s: any) => `- "${s.id}": ${s.name} (${s.category})`).join('\n');
      return sfxPromptTemplate.replace('{{SFX_LIST}}', sfxList);
    } catch {
      return '';
    }
  }

  /**
   * Legacy review method (used by admin "Überprüfen" button)
   */
  async reviewScript(script: Script, age: number): Promise<any> {
    const cs = loadClaudeSettings();
    const reviewerPrompt = loadPromptFile('agent-reviewer.txt');
    
    const result = await this.callClaude({
      model: cs.reviewerModel || cs.model,
      systemPrompt: reviewerPrompt || 'Du bist ein Lektor für Kinderhörspiele. Prüfe das Skript und antworte als JSON.',
      userMessage: `Prüfe dieses Kinderhörspiel (Zielalter: ${age} Jahre):\n\n${JSON.stringify(script, null, 2)}`,
      maxTokens: 4096,
      temperature: 0.3,
    });

    return this.parseJson(result.text);
  }
}
