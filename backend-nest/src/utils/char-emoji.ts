/**
 * Emoji mapping for story characters.
 * Uses structured data (species, gender, age) from Claude when available,
 * falls back to name-based matching for legacy stories.
 */

const SPECIES_EMOJI: Record<string, string> = {
  // Animals
  dragon: '🐉', drache: '🐉',
  fox: '🦊', fuchs: '🦊',
  bear: '🐻', bär: '🐻',
  wolf: '🐺',
  lion: '🦁', löwe: '🦁',
  frog: '🐸', frosch: '🐸',
  unicorn: '🦄', einhorn: '🦄',
  cat: '🐱', katze: '🐱',
  dog: '🐶', hund: '🐶',
  bird: '🐦', vogel: '🐦',
  owl: '🦉', eule: '🦉',
  rabbit: '🐰', hase: '🐰',
  mouse: '🐭', maus: '🐭',
  hedgehog: '🦔', igel: '🦔',
  snake: '🐍', schlange: '🐍',
  fish: '🐟', fisch: '🐟',
  parrot: '🦜', papagei: '🦜',
  starfish: '⭐', seestern: '⭐',
  crab: '🦀', krabbe: '🦀',
  turtle: '🐢', schildkröte: '🐢',
  octopus: '🐙', krake: '🐙', oktopus: '🐙',
  whale: '🐳', wal: '🐳',
  dolphin: '🐬', delfin: '🐬',
  penguin: '🐧', pinguin: '🐧',
  butterfly: '🦋', schmetterling: '🦋',
  bee: '🐝', biene: '🐝',
  spider: '🕷️', spinne: '🕷️',
  monkey: '🐒', affe: '🐒',
  elephant: '🐘', elefant: '🐘',
  squirrel: '🐿️', eichhörnchen: '🐿️',
  deer: '🦌', reh: '🦌', hirsch: '🦌',
  horse: '🐴', pferd: '🐴',
  pig: '🐷', schwein: '🐷',
  chicken: '🐔', huhn: '🐔',
  duck: '🦆', ente: '🦆',
  polarbear: '🐻‍❄️', eisbär: '🐻‍❄️',
  bat: '🦇', fledermaus: '🦇',
  shark: '🦈', hai: '🦈',
  snail: '🐌', schnecke: '🐌',
  ladybug: '🐞', marienkäfer: '🐞',
  ant: '🐜', ameise: '🐜',
  crocodile: '🐊', krokodil: '🐊',
  gorilla: '🦍',
  tiger: '🐯',
  leopard: '🐆',
  // Fantasy
  fairy: '🧚', fee: '🧚',
  goblin: '🧌', kobold: '🧌',
  troll: '🧌',
  dwarf: '⛏️', zwerg: '⛏️',
  giant: '🗻', riese: '🗻',
  ghost: '👻', geist: '👻',
  witch: '🧙‍♀️', hexe: '🧙‍♀️',
  wizard: '🧙', zauberer: '🧙', magier: '🧙',
  robot: '🤖', roboter: '🤖',
  alien: '👽',
  mermaid: '🧜‍♀️', meerjungfrau: '🧜‍♀️',
  pirate: '☠️', pirat: '☠️',
  elf: '🧝',
  vampire: '🧛', vampir: '🧛',
  phoenix: '🔥', phönix: '🔥',
  // Minecraft
  creeper: '💚',
  enderman: '🟣',
  enderdragon: '🐲', enderdrache: '🐲',
  slime: '🟢', schleim: '🟢',
  zombie: '🧟',
  skeleton: '💀', skelett: '💀',
  ghast: '👻',
  golem: '🗿',
  allay: '💙',
  wither: '☠️',
  blaze: '🔥',
  // Pokémon
  pikachu: '⚡',
  // Generic
  monster: '👹',
  creature: '🐾',
};

const ROLE_EMOJI: Record<string, string> = {
  king: '🤴', könig: '🤴',
  queen: '👸', königin: '👸',
  knight: '⚔️', ritter: '⚔️',
  captain: '⚓', kapitän: '⚓',
  prince: '🤴', prinz: '🤴',
  princess: '👸', prinzessin: '👸',
};

const GENDER_EMOJI: Record<string, string> = {
  child_m: '👦', child_f: '👧',
  adult_m: '👨', adult_f: '👩',
  elder_m: '👴', elder_f: '👵',
  creature_m: '🐾', creature_f: '🐾',
  male: '👦', female: '👧',
};

/** Derive voice category from structured character data */
function deriveCategory(gender?: string, age?: number, species?: string[]): string {
  if (species?.some(s => !['human', 'mensch'].includes(s.toLowerCase()))) {
    return gender === 'female' ? 'creature_f' : 'creature_m';
  }
  const g = gender === 'female' ? 'f' : 'm';
  if (age != null) {
    if (age <= 14) return `child_${g}`;
    if (age >= 60) return `elder_${g}`;
  }
  return `adult_${g}`;
}

export function charEmoji(
  name: string,
  gender: string,
  species?: string[],
  age?: number,
  traits?: string[],
): string {
  const n = name.toLowerCase();

  // Narrator is always 📖
  if (n === 'erzähler' || n === 'berättare' || n === 'narrator') return '📖';

  // 1. Try species array (most reliable — from Claude structured data)
  if (species?.length) {
    for (const s of species) {
      const key = s.toLowerCase();
      if (key === 'human' || key === 'mensch') continue;
      if (SPECIES_EMOJI[key]) return SPECIES_EMOJI[key];
      // Partial match for compound species like "polarbear"
      for (const [k, emoji] of Object.entries(SPECIES_EMOJI)) {
        if (key.includes(k) || k.includes(key)) return emoji;
      }
    }
  }

  // 2. Try traits for role-based emoji (e.g. traits: ["king", "wise"])
  if (traits?.length) {
    for (const t of traits) {
      const key = t.toLowerCase();
      if (ROLE_EMOJI[key]) return ROLE_EMOJI[key];
    }
  }

  // 3. Name-based fallback (for legacy stories without species data)
  for (const [key, emoji] of Object.entries(SPECIES_EMOJI)) {
    if (n.includes(key)) return emoji;
  }
  for (const [key, emoji] of Object.entries(ROLE_EMOJI)) {
    if (n.includes(key)) return emoji;
  }

  // 4. Gender/age-based fallback
  const cat = deriveCategory(gender, age, species);
  return GENDER_EMOJI[cat] || GENDER_EMOJI[gender] || '✨';
}
