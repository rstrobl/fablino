"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClaudeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
let ClaudeService = class ClaudeService {
    constructor(configService) {
        this.configService = configService;
    }
    async generateScript(prompt, ageGroup = '5-7', characters, systemPromptOverride) {
        const ANTHROPIC_API_KEY = this.configService.get('ANTHROPIC_API_KEY');
        if (!ANTHROPIC_API_KEY) {
            throw new Error('ANTHROPIC_API_KEY nicht konfiguriert');
        }
        const ageRules = ageGroup === '3-5' ? `
KLEINE OHREN (3–5 Jahre):
- Kurze Sätze. Wiederholungen ("Klopf, klopf, klopf!"). Klangwörter nur im Erzählertext.
- KEINE Zahlen, Maßeinheiten, Zeitangaben, abstrakte Konzepte
- Emotionen benennen: "Da wurde der Igel ganz traurig" (Kinder lernen Gefühle einzuordnen)
- Max 6 Charaktere (inkl. Erzähler)
- Klare Gut/Böse-Struktur, aber Böse wird nie bestraft — sondern versteht es am Ende
- Happy End ist Pflicht
- LÄNGE: MINDESTENS 40 Zeilen, besser 50–60. Das Hörspiel MUSS mindestens 6 Minuten dauern. Schreibe ausführliche Szenen mit vielen Dialogen. Nicht abkürzen! Jede Szene braucht mehrere Hin-und-Her-Dialoge zwischen den Charakteren.
- Erzähler führt stark — bindet Szenen zusammen, beschreibt Bilder, leitet Dialoge ein
- Keine Ironie, kein Sarkasmus — wird nicht verstanden` : `
GROSSE OHREN (6–9 Jahre):
- Komplexere Plots: Rätsel, Wendungen, Geheimnisse
- Humor: Wortspiele, absurde Situationen, Slapstick
- Einfache Zahlen/Fakten OK wenn sie der Story dienen
- Bis 6 Charaktere, Nebenfiguren möglich
- Moral darf subtil sein — nicht mit dem Holzhammer
- Offene Enden möglich (Cliffhanger für Fortsetzungen!)
- LÄNGE: MINDESTENS 60 Zeilen, besser 70–80. Das Hörspiel MUSS mindestens 10 Minuten dauern. Schreibe ausführliche Szenen mit vielen Dialogen, Wendungen und Details. Nicht abkürzen!
- Erzähler als Rahmen: Intro, Szenenwechsel, Atmosphäre, Outro — aber Dialog trägt die Handlung
- Leichte Grusel-Elemente OK (aber immer aufgelöst)`;
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
        const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
        const script = JSON.parse(jsonStr);
        return {
            script,
            systemPrompt
        };
    }
};
exports.ClaudeService = ClaudeService;
exports.ClaudeService = ClaudeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ClaudeService);
//# sourceMappingURL=claude.service.js.map