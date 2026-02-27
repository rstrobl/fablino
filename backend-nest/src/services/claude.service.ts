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
  adapterModel: 'claude-opus-4-20250514',
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
  agent: 'author' | 'adapter' | 'reviewer' | 'lector' | 'revision' | 'reviewer2' | 'revision2' | 'tts';
  model: string;
  durationMs: number;
  tokens: { input: number; output: number };
  reviewResult?: ReviewResult;
  scriptSnapshot?: Script;
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
  feedback: string;
  severity?: 'critical' | 'major' | 'minor';
  // Legacy fields for old pipeline logs
  issues?: ReviewIssue[];
  summary?: string;
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
- Kurze Sätze. Wiederholungen. Klangwörter nur im Erzählertext.
- KEINE Zahlen, Maßeinheiten, abstrakte Konzepte
- Max 6 Charaktere (inkl. Erzähler)
- Happy End ist Pflicht
- LÄNGE: MINDESTENS 40 Zeilen, besser 50–60. MINDESTENS 6 Minuten.
- Erzähler führt stark
- Keine Ironie, kein Sarkasmus`;

    if (age <= 8) return `REGELN FÜR MITTLERE KINDER (${age} Jahre):
- Komplexere Plots: Wendungen, Geheimnisse
- Humor: Wortspiele, absurde Situationen, Slapstick
- Bis 6 Charaktere, Nebenfiguren möglich
- LÄNGE: MINDESTENS 60 Zeilen, besser 70–80. MINDESTENS 10 Minuten.
- Dialog trägt die Handlung
- Leichte Grusel-Elemente OK`;

    return `REGELN FÜR ÄLTERE KINDER (${age} Jahre):
- Anspruchsvolle Plots: Mehrere Handlungsstränge, echte Spannung
- Humor: Ironie, Wortspiele, situationsbedingte Komik
- Bis 8 Charaktere, komplexere Beziehungen
- LÄNGE: MINDESTENS 70 Zeilen, besser 80–100. MINDESTENS 12 Minuten.
- Dialog und Handlung tragen die Story
- Echte Spannung und leichter Grusel OK`;
  }

  private buildCharacterSpec(characters?: CharacterRequest): string {
    return `PERSONALISIERUNG:
${characters?.hero ? `Die Hauptfigur heißt "${characters.hero.name}"${characters.hero.age ? ` und ist ${characters.hero.age} Jahre alt` : ''}.` : 'Erfinde eine passende Hauptfigur.'}
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
- JEDE Figur (außer Erzähler) MUSS eine passende Emotion haben — "neutral" ist fast nie richtig
- KEINE Audio-Tags oder Performance-Tags im Text (kein [chuckles], [whispering] etc.) — das macht der TTS-Agent später
- Schreibe NUR den gesprochenen Text, natürlich und sauber

WICHTIG zu Charakteren:
- type: "human" oder "creature"
- species: konkrete Spezies auf Englisch (human, unicorn, owl, dragon, fox, badger...)
- emoji: EINZELNES Unicode-Emoji, KEINE ZWJ-Sequenzen. Erzähler=📖
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
      body.temperature = 1; // required when thinking is enabled
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
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw e;
      }
    }
  }

  private addStep(pipeline: PipelineLog, step: PipelineStep) {
    pipeline.steps.push(step);
    pipeline.totalTokens.input += step.tokens.input;
    pipeline.totalTokens.output += step.tokens.output;
  }

  private async runReview(script: Script, age: number, cs: any, userPrompt?: string): Promise<{ review: ReviewResult; step: PipelineStep }> {
    const reviewerPrompt = loadPromptFile('agent-reviewer.txt');
    const start = Date.now();

    let userMessage = `Prüfe dieses Kinderhörspiel (Zielalter: ${age} Jahre):\n\n`;
    if (userPrompt) {
      userMessage += `NUTZER-PROMPT (das war die Vorgabe des Nutzers — bewerte die Umsetzung, nicht den Prompt selbst):\n${userPrompt}\n\n`;
    }
    userMessage += JSON.stringify(script, null, 2);

    const result = await this.callClaude({
      model: cs.reviewerModel || cs.model,
      systemPrompt: reviewerPrompt,
      userMessage,
      maxTokens: 4096,
      temperature: 0.3,
    });

    let review: ReviewResult;
    try {
      review = this.parseJson(result.text) as ReviewResult;
    } catch {
      console.warn('⚠️ Could not parse review result');
      review = { approved: true, feedback: 'Review parse error' };
    }

    console.log(`  Review: ${review.approved ? 'APPROVED' : 'REJECTED'} (${review.severity || 'n/a'}, ${Date.now() - start}ms)`);

    return {
      review,
      step: {
        agent: 'reviewer',
        model: cs.reviewerModel || cs.model,
        durationMs: Date.now() - start,
        tokens: { input: result.usage.input_tokens, output: result.usage.output_tokens },
        reviewResult: review,
      },
    };
  }

  /**
   * New two-mode pipeline: 
   * Mode "prompt": Author → TTS → STOP at Preview
   * Mode "story": Adapter → TTS → STOP at Preview
   * Manual lector can be triggered separately
   */
  async generateScript(
    prompt: string,
    age: number = 6,
    characters?: CharacterRequest,
    systemPromptOverride?: string,
    onProgress?: (step: string, pipeline?: PipelineLog, scriptSnapshot?: Script) => void,
    mode: 'prompt' | 'story' = 'prompt',
    storyText?: string,
  ): Promise<GeneratedScript> {
    const cs = loadClaudeSettings();
    const pipeline: PipelineLog = { steps: [], totalTokens: { input: 0, output: 0 } };

    let script: Script;
    let fullSystemPrompt: string;

    if (mode === 'story') {
      // === MODE "story": Adapter agent converts story to radio play format ===
      console.log('📖 Mode: Story - Adapter agent...');
      onProgress?.('Adapter konvertiert Geschichte...');
      const adapterStart = Date.now();

      const adapterPrompt = loadPromptFile('agent-adapter.txt');
      if (!adapterPrompt) {
        throw new Error('agent-adapter.txt prompt file not found');
      }

      fullSystemPrompt = [
        adapterPrompt,
        systemPromptOverride ? `\n\n--- Zusätzliche Anweisungen ---\n${systemPromptOverride}` : '',
        `\nZIELALTER: ${age} Jahre.\n${this.buildAgeRules(age)}`,
        this.buildCharacterSpec(characters),
        this.JSON_FORMAT,
      ].join('\n\n');

      const adapterResult = await this.callClaude({
        model: cs.adapterModel || cs.model,
        systemPrompt: fullSystemPrompt,
        userMessage: `Konvertiere diese Geschichte in ein Hörspiel (Zielalter: ${age} Jahre):\n\n${storyText}\n\nDenke zuerst gründlich nach. Dann schreibe das finale JSON.`,
        maxTokens: cs.max_tokens,
        temperature: cs.temperature,
        thinking: { budget: cs.thinking_budget },
      });

      script = this.parseJson(adapterResult.text) as Script;
      this.addStep(pipeline, {
        agent: 'adapter',
        model: cs.adapterModel || cs.model,
        durationMs: Date.now() - adapterStart,
        tokens: { input: adapterResult.usage.input_tokens, output: adapterResult.usage.output_tokens },
        scriptSnapshot: JSON.parse(JSON.stringify(script)),
      });
      console.log(`✅ Adapter: "${script.title}" (${script.scenes?.length} scenes, ${Date.now() - adapterStart}ms)`);
      onProgress?.('TTS-Optimierung...', pipeline, script);

    } else {
      // === MODE "prompt": Author agent creates original story ===
      console.log('🖊️ Mode: Prompt - Author agent...');
      onProgress?.('Autor schreibt Story...');
      const authorStart = Date.now();

      const authorPrompt = loadPromptFile('agent-author.txt') || loadPromptFile('system-prompt.txt');
      
      fullSystemPrompt = [
        systemPromptOverride ? `${authorPrompt}\n\n--- Zusätzliche Anweisungen ---\n${systemPromptOverride}` : authorPrompt,
        `\nZIELALTER: ${age} Jahre.\n${this.buildAgeRules(age)}`,
        this.buildCharacterSpec(characters),
        this.JSON_FORMAT,
      ].join('\n\n');

      const authorResult = await this.callClaude({
        model: cs.model,
        systemPrompt: fullSystemPrompt,
        userMessage: `Schreibe ein Hörspiel basierend auf diesem Prompt:\n\n${prompt}\n\nDenke zuerst gründlich nach. Dann schreibe das finale JSON.`,
        maxTokens: cs.max_tokens,
        temperature: cs.temperature,
        thinking: { budget: cs.thinking_budget },
      });

      script = this.parseJson(authorResult.text) as Script;
      this.addStep(pipeline, {
        agent: 'author',
        model: cs.model,
        durationMs: Date.now() - authorStart,
        tokens: { input: authorResult.usage.input_tokens, output: authorResult.usage.output_tokens },
        scriptSnapshot: JSON.parse(JSON.stringify(script)),
      });
      console.log(`✅ Author: "${script.title}" (${script.scenes?.length} scenes, ${Date.now() - authorStart}ms)`);
      onProgress?.('TTS-Optimierung...', pipeline, script);
    }

    // === TTS optimization (same for both modes) ===
    const ttsPrompt = loadPromptFile('agent-tts.txt');
    if (ttsPrompt) {
      console.log('🎙️ TTS optimization...');
      onProgress?.('TTS-Optimierung...');
      const ttsStart = Date.now();

      const sfxPrompt = cs.sfxEnabled ? this.buildSfxPrompt() : '';

      const ttsResult = await this.callClaude({
        model: cs.ttsModel || cs.model,
        systemPrompt: sfxPrompt ? `${ttsPrompt}\n\n${sfxPrompt}` : ttsPrompt,
        userMessage: `Optimiere dieses Hörspiel-Skript für TTS. Gib das KOMPLETTE Skript als JSON zurück:\n\n${JSON.stringify(script, null, 2)}`,
        maxTokens: cs.max_tokens,
        temperature: 0.3,
      });

      try {
        const optimized = this.parseJson(ttsResult.text) as Script;
        script = optimized;
        console.log(`✅ TTS done (${Date.now() - ttsStart}ms)`);
      } catch (e) {
        console.warn('⚠️ TTS parse failed, keeping previous version');
      }

      this.addStep(pipeline, {
        agent: 'tts',
        model: cs.ttsModel || cs.model,
        durationMs: Date.now() - ttsStart,
        tokens: { input: ttsResult.usage.input_tokens, output: ttsResult.usage.output_tokens },
        scriptSnapshot: JSON.parse(JSON.stringify(script)),
      });
    }

    // === STOP HERE for preview - no automatic review anymore ===
    const totalDuration = pipeline.steps.reduce((t, s) => t + s.durationMs, 0);
    console.log(`🏁 Pipeline: ${pipeline.steps.length} steps, ${pipeline.totalTokens.input + pipeline.totalTokens.output} tokens, ${Math.round(totalDuration / 1000)}s`);

    return {
      script,
      systemPrompt: fullSystemPrompt,
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
   * Manual lector review - returns structured review result
   */
  async runLectorReview(script: Script, age: number, userPrompt?: string): Promise<{ review: ReviewResult; step: PipelineStep }> {
    const cs = loadClaudeSettings();
    const reviewerPrompt = loadPromptFile('agent-reviewer.txt');
    const start = Date.now();

    let userMessage = `Prüfe dieses Kinderhörspiel (Zielalter: ${age} Jahre):\n\n`;
    if (userPrompt) {
      userMessage += `NUTZER-PROMPT (das war die Vorgabe des Nutzers — bewerte die Umsetzung, nicht den Prompt selbst):\n${userPrompt}\n\n`;
    }
    userMessage += JSON.stringify(script, null, 2);

    const result = await this.callClaude({
      model: cs.reviewerModel || cs.model,
      systemPrompt: reviewerPrompt,
      userMessage,
      maxTokens: 4096,
      temperature: 0.3,
    });

    let review: ReviewResult;
    try {
      review = this.parseJson(result.text) as ReviewResult;
    } catch {
      console.warn('⚠️ Could not parse lector review result');
      review = { approved: true, feedback: 'Review parse error' };
    }

    console.log(`  Lector Review: ${review.approved ? 'APPROVED' : 'REJECTED'} (${review.severity || 'n/a'}, ${Date.now() - start}ms)`);

    return {
      review,
      step: {
        agent: 'lector',
        model: cs.reviewerModel || cs.model,
        durationMs: Date.now() - start,
        tokens: { input: result.usage.input_tokens, output: result.usage.output_tokens },
        reviewResult: review,
      },
    };
  }

  /**
   * Manual lector revision with custom admin instructions
   */
  async runLectorRevision(
    script: Script, 
    lectorReview: ReviewResult, 
    adminInstructions: string,
    age: number
  ): Promise<{ script: Script; step: PipelineStep }> {
    const cs = loadClaudeSettings();
    const revisionPrompt = loadPromptFile('agent-revision.txt') || 'Du überarbeitest ein Kinderhörspiel-Skript basierend auf Lektor-Feedback und Admin-Anweisungen. Gib das KOMPLETTE überarbeitete Skript als JSON zurück.';
    const start = Date.now();

    const userMessage = [
      'AKTUELLES SKRIPT:',
      JSON.stringify(script, null, 2),
      '',
      'LEKTOR-REVIEW:',
      `Status: ${lectorReview.approved ? 'APPROVED' : 'REJECTED'}`,
      `Feedback: ${lectorReview.feedback}`,
      lectorReview.severity ? `Severity: ${lectorReview.severity}` : '',
      '',
      'ADMIN-ANWEISUNGEN:',
      adminInstructions,
      '',
      `Überarbeite das Skript entsprechend dem Lektorat und den Admin-Anweisungen. Zielalter: ${age} Jahre.`,
    ].filter(line => line !== '').join('\n');

    const revisionResult = await this.callClaude({
      model: cs.model,
      systemPrompt: `${revisionPrompt}\n\n${this.JSON_FORMAT}`,
      userMessage,
      maxTokens: cs.max_tokens,
      temperature: 0.7,
      thinking: { budget: cs.thinking_budget },
    });

    let revisedScript: Script;
    try {
      revisedScript = this.parseJson(revisionResult.text) as Script;
      console.log(`✅ Lector Revision done (${Date.now() - start}ms)`);
    } catch (e) {
      console.warn('⚠️ Lector revision parse failed, keeping original version');
      revisedScript = script;
    }

    return {
      script: revisedScript,
      step: {
        agent: 'revision',
        model: cs.model,
        durationMs: Date.now() - start,
        tokens: { input: revisionResult.usage.input_tokens, output: revisionResult.usage.output_tokens },
        scriptSnapshot: JSON.parse(JSON.stringify(revisedScript)),
      },
    };
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
