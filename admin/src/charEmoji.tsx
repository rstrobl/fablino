import React from 'react';

/**
 * Emoji mapping — mirrors backend char-emoji.ts logic.
 * Characters should already have emoji from the backend,
 * this is the fallback for display in admin.
 */

const SPECIES_EMOJI: Record<string, string> = {
  dragon: '🐉', drache: '🐉', fox: '🦊', fuchs: '🦊', bear: '🐻', bär: '🐻',
  wolf: '🐺', lion: '🦁', löwe: '🦁', frog: '🐸', frosch: '🐸',
  unicorn: '🦄', einhorn: '🦄', cat: '🐱', katze: '🐱', dog: '🐶', hund: '🐶',
  bird: '🐦', vogel: '🐦', owl: '🦉', eule: '🦉', rabbit: '🐰', hase: '🐰',
  mouse: '🐭', maus: '🐭', hedgehog: '🦔', igel: '🦔', snake: '🐍', schlange: '🐍',
  fish: '🐟', fisch: '🐟', parrot: '🦜', papagei: '🦜', turtle: '🐢', schildkröte: '🐢',
  octopus: '🐙', krake: '🐙', whale: '🐳', wal: '🐳', dolphin: '🐬', delfin: '🐬',
  penguin: '🐧', pinguin: '🐧', butterfly: '🦋', schmetterling: '🦋',
  bee: '🐝', biene: '🐝', spider: '🕷️', spinne: '🕷️', monkey: '🐒', affe: '🐒',
  elephant: '🐘', elefant: '🐘', squirrel: '🐿️', eichhörnchen: '🐿️',
  deer: '🦌', reh: '🦌', horse: '🐴', pferd: '🐴', pig: '🐷', schwein: '🐷',
  duck: '🦆', ente: '🦆', polarbear: '🐻‍❄️', eisbär: '🐻‍❄️',
  bat: '🦇', fledermaus: '🦇', shark: '🦈', hai: '🦈', snail: '🐌', schnecke: '🐌',
  crab: '🦀', krabbe: '🦀', crocodile: '🐊', krokodil: '🐊', tiger: '🐯',
  fairy: '🧚', fee: '🧚', goblin: '🧌', kobold: '🧌', troll: '🧌',
  dwarf: '⛏️', zwerg: '⛏️', giant: '🗻', riese: '🗻', ghost: '👻', geist: '👻',
  witch: '🧙‍♀️', hexe: '🧙‍♀️', wizard: '🧙', zauberer: '🧙', magier: '🧙',
  robot: '🤖', roboter: '🤖', alien: '👽', mermaid: '🧜‍♀️', meerjungfrau: '🧜‍♀️',
  pirate: '☠️', pirat: '☠️', elf: '🧝', vampire: '🧛', vampir: '🧛',
  phoenix: '🔥', phönix: '🔥', monster: '👹',
  creeper: '💚', enderman: '🟣', enderdragon: '🐲', enderdrache: '🐲',
  slime: '🟢', schleim: '🟢', zombie: '🧟', skeleton: '💀', skelett: '💀',
  ghast: '👻', golem: '🗿', allay: '💙', wither: '☠️', blaze: '🔥', pikachu: '⚡',
};

const ROLE_EMOJI: Record<string, string> = {
  king: '🤴', könig: '🤴', queen: '👸', königin: '👸',
  knight: '⚔️', ritter: '⚔️', captain: '⚓', kapitän: '⚓',
  prince: '🤴', prinz: '🤴', princess: '👸', prinzessin: '👸',
};

const GENDER_EMOJI: Record<string, string> = {
  child_m: '👦', child_f: '👧', adult_m: '👨', adult_f: '👩',
  elder_m: '👴', elder_f: '👵', creature_m: '🐾', creature_f: '🐾',
  male: '👦', female: '👧',
};

export function charEmoji(name: string, gender: string, species?: string[], age?: number, traits?: string[]): string {
  const n = name.toLowerCase();
  if (n === 'erzähler' || n === 'narrator') return '📖';

  // 1. Species array (structured data from Claude)
  if (species?.length) {
    for (const s of species) {
      const key = s.toLowerCase();
      if (key === 'human' || key === 'mensch') continue;
      if (SPECIES_EMOJI[key]) return SPECIES_EMOJI[key];
      for (const [k, emoji] of Object.entries(SPECIES_EMOJI)) {
        if (key.includes(k) || k.includes(key)) return emoji;
      }
    }
  }

  // 2. Traits for roles
  if (traits?.length) {
    for (const t of traits) {
      if (ROLE_EMOJI[t.toLowerCase()]) return ROLE_EMOJI[t.toLowerCase()];
    }
  }

  // 3. Name-based fallback
  for (const [key, emoji] of Object.entries(SPECIES_EMOJI)) {
    if (n.includes(key)) return emoji;
  }
  for (const [key, emoji] of Object.entries(ROLE_EMOJI)) {
    if (n.includes(key)) return emoji;
  }

  // 4. Gender/age
  if (age != null && species?.every(s => ['human', 'mensch'].includes(s.toLowerCase()))) {
    const g = gender === 'female' ? 'f' : 'm';
    if (age <= 14) return GENDER_EMOJI[`child_${g}`];
    if (age >= 60) return GENDER_EMOJI[`elder_${g}`];
  }

  return GENDER_EMOJI[gender] || '✨';
}

function emojiToTwemoji(emoji: string): string {
  const codepoints = [...emoji]
    .map(c => c.codePointAt(0)!.toString(16))
    .filter(cp => cp !== 'fe0f')
    .join('-');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
}

export function TwemojiIcon({ emoji, size = 20 }: { emoji: string; size?: number }) {
  const [failed, setFailed] = React.useState(false);
  if (failed) {
    return <span style={{ fontSize: size, lineHeight: 1, verticalAlign: 'middle' }}>{emoji}</span>;
  }
  return (
    <img
      src={emojiToTwemoji(emoji)}
      alt={emoji}
      style={{ width: size, height: size, verticalAlign: 'middle', display: 'inline-block' }}
      draggable={false}
      onError={() => setFailed(true)}
    />
  );
}
