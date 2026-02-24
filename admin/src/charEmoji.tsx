const CHAR_EMOJI: Record<string, string> = {
  child_m: '👦', child_f: '👧', adult_m: '👨', adult_f: '👩',
  elder_m: '👴', elder_f: '👵', creature: '🐾',
  male: '👨', female: '👩', männlich: '👨', weiblich: '👩',
};

export function charEmoji(name: string, gender: string): string {
  const n = name.toLowerCase();
  if (n === 'erzähler' || n === 'berättare') return '📖';
  if (n.includes('schneebär')) return '🐻‍❄️';
  if (n.includes('schneeball') || n.includes('schnee')) return '❄️';
  if (gender === 'creature') {
    if (n.includes('drach') || n.includes('dragon')) return '🐉';
    if (n.includes('fuchs') || n.includes('fox')) return '🦊';
    if (n.includes('bär') || n.includes('bear')) return '🐻';
    if (n.includes('wolf')) return '🐺';
    if (n.includes('löwe') || n.includes('lion')) return '🦁';
    if (n.includes('frosch') || n.includes('frog')) return '🐸';
    if (n.includes('einhorn') || n.includes('unicorn')) return '🦄';
    if (n.includes('katze') || n.includes('cat')) return '🐱';
    if (n.includes('hund') || n.includes('dog')) return '🐶';
    if (n.includes('vogel') || n.includes('bird')) return '🐦';
    if (n.includes('eule') || n.includes('owl')) return '🦉';
    if (n.includes('hase') || n.includes('rabbit')) return '🐰';
    if (n.includes('maus') || n.includes('mouse')) return '🐭';
    if (n.includes('igel')) return '🦔';
    if (n.includes('schlange') || n.includes('snake')) return '🐍';
    if (n.includes('fisch') || n.includes('fish')) return '🐟';
    if (n.includes('papagei') || n.includes('parrot')) return '🦜';
    if (n.includes('seestern') || n.includes('starfish')) return '⭐';
    if (n.includes('krabbe') || n.includes('crab')) return '🦀';
    if (n.includes('schildkröte') || n.includes('turtle')) return '🐢';
    if (n.includes('oktopus') || n.includes('krake') || n.includes('octopus')) return '🐙';
    if (n.includes('wal') || n.includes('whale')) return '🐳';
    if (n.includes('delfin') || n.includes('dolphin')) return '🐬';
    if (n.includes('pinguin') || n.includes('penguin')) return '🐧';
    if (n.includes('schmetterling') || n.includes('butterfly')) return '🦋';
    if (n.includes('biene') || n.includes('bee')) return '🐝';
    if (n.includes('spinne') || n.includes('spider')) return '🕷️';
    if (n.includes('affe') || n.includes('monkey')) return '🐒';
    if (n.includes('elefant') || n.includes('elephant')) return '🐘';
    if (n.includes('kobold')) return '🧌';
    if (n.includes('fee') || n.includes('fairy')) return '🧚';
    if (n.includes('hexe') || n.includes('witch')) return '🧙‍♀️';
    return '🐾';
  }
  // Role-based icons (any gender)
  if ((n.includes('kapitän') || n.includes('captain') || n.includes('pirat') || n.includes('pirate')) && (n.includes('grimm') || n.includes('böse') || n.includes('finster') || n.includes('schwarz'))) return '☠️';
  if (n.includes('kapitän') || n.includes('captain') || n.includes('pirat') || n.includes('pirate')) return '⚓';
  if (n.includes('könig') || n.includes('king')) return '🤴';
  if (n.includes('königin') || n.includes('queen')) return '👸';
  if (n.includes('ritter') || n.includes('knight')) return '⚔️';
  if (n.includes('zauberer') || n.includes('wizard') || n.includes('magier')) return '🧙';
  return CHAR_EMOJI[gender] || '✨';
}

function emojiToTwemoji(emoji: string): string {
  const codepoints = [...emoji]
    .map(c => c.codePointAt(0)!.toString(16))
    .filter(cp => cp !== 'fe0f')
    .join('-');
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`;
}

export function TwemojiIcon({ emoji, size = 20 }: { emoji: string; size?: number }) {
  return (
    <img
      src={emojiToTwemoji(emoji)}
      alt={emoji}
      style={{ width: size, height: size, verticalAlign: 'middle', display: 'inline-block' }}
      draggable={false}
    />
  );
}
