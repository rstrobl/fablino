// --- Script generation via Claude API ---
async function generateScript(prompt, ageGroup, characters) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  
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

  const systemPrompt = `Du bist ein preisgekrönter deutscher Kinderhörspiel-Autor. Schreibe brillante, lustige, liebevolle Hörspiele für Kinder.

⛔ ABSOLUT VERBOTEN — LAUTMALEREI IM DIALOG:
Kein Charakter darf Lautmalerei sprechen. NIEMALS: Hihihi, Hahaha, Buhuhu, Ächz, Seufz, Grr, Brumm, Miau, Wuff, Wiehern, Schnurr, Piep, Kicher, Prust, Uff, Autsch, Hmpf, Pah, Tss, Juhu, Juchhu, Hurra.
Stattdessen beschreibt der ERZÄHLER die Emotion oder den Laut. Charaktere sprechen nur in normalen, ganzen Sätzen.
Dies gilt OHNE AUSNAHME für ALLE Charaktere, auch für Tiere und Kreaturen.

GRUNDTON: Abenteuerlich, witzig, kindgerecht. KEINE Gewalt. Immer ein gutes Ende.
${ageRules}

ALLGEMEINE REGELN:
- Ein "Erzähler" MUSS immer dabei sein — er ist die verbindende Stimme des Hörspiels
- Jede Zeile max 2 Sätze (für TTS-Qualität)
- Jeder Charakter hat ein subtiles Erkennungsmerkmal (Sprachstil, typische Redewendung) — aber nicht in jeder Zeile wiederholen
- Jeder genannte Charakter muss mindestens 2 Zeilen sprechen (sonst weglassen)
- BEVOR ein Charakter zum ersten Mal spricht, MUSS der Erzähler ihn in einer eigenen Zeile vorstellen (Name + wer er/sie ist). Erst Erzähler-Einführung, DANN die erste Sprechzeile des Charakters. Keine Ausnahme!
- Tiere sprechen nur wenn sie als "creature" getaggt sind — sonst beschreibt der Erzähler ihre Laute
- Die erste Zeile muss sofort fesseln — kein "Es war einmal" Langeweile
- KEINE Sound-Effekte (SFX) — nur Stimmen und Dialog
- Emotionen und Tierlaute werden vom ERZÄHLER beschrieben, nicht von den Charakteren selbst. (Siehe ABSOLUT VERBOTEN oben!)
- KEINE konkreten Zeitangaben (keine "eine Stunde später", "nach 30 Minuten", "um 3 Uhr"). Stattdessen: "Kurze Zeit später", "Als die Sonne unterging", "Nach einer langen Reise"
- Kinder sind die Helden, nicht Erwachsene — Kinder lösen das Problem
- Keine Belehrung, keine Moral-Keule — Story first
- Deutsche Settings/Kultur bevorzugt, aber Fantasie-Welten genauso OK
- Diversität natürlich einbauen — verschiedene Familienmodelle, Namen, Hintergründe — ohne es zu betonen
- KORREKTES DEUTSCH IST PFLICHT: Keine Grammatikfehler, keine falschen Deklinationen, keine Anglizismen. Charakternamen MÜSSEN korrekt deutsch sein (NICHT "Drachenfriend" sondern "Drachenfreund", NICHT "Kuchens" sondern "Kuchen"). Schreibe wie ein deutscher Muttersprachler. Im Zweifel einfacher formulieren.

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
- child_m = männliches Kind/Junge
- child_f = weibliches Kind/Mädchen
- adult_m = erwachsener Mann (Papa, König, Bäcker, etc.)
- adult_f = erwachsene Frau (Mama, Hexe, Lehrerin, etc.)
- elder_m = älterer Mann (Opa, alter Zauberer, weiser Mann)
- elder_f = ältere Frau (Oma, weise Frau, Hexe)
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
      model: 'claude-sonnet-4-20250514',
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
  return JSON.parse(jsonStr);
}

export { generateScript };