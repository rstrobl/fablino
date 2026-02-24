const CHAR_EMOJI: Record<string, string> = {
  child_m: '👦', child_f: '👧', adult_m: '👨', adult_f: '👩',
  elder_m: '👴', elder_f: '👵', creature: '🐾',
};

export function charEmoji(name: string, gender: string): string {
  const n = name.toLowerCase();
  if (n === 'erzähler' || n === 'berättare') return '📖';
  if (n.includes('schneebär')) return '🐻‍❄️';
  if (n.includes('schneeball') || n.includes('schnee')) return '❄️';
  if (gender === 'creature') {
    // Minecraft
    if (n.includes('creeper')) return '💚';
    if (n.includes('enderman') || n.includes('grimmstein')) return '🟣';
    if (n.includes('enderdrach') || n.includes('violetta')) return '🐲';
    if (n.includes('schleim') || n.includes('slime') || n.includes('kleo')) return '🟢';
    if (n.includes('magma') || n.includes('funki')) return '🔥';
    if (n.includes('zombie')) return '🧟';
    if (n.includes('skelett') || n.includes('skeleton')) return '💀';
    if (n.includes('ghast')) return '👻';
    if (n.includes('golem')) return '🗿';
    if (n.includes('allay')) return '💙';
    if (n.includes('wither')) return '☠️';
    if (n.includes('blocky')) return '🐰';
    // Animals
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
    if (n.includes('geist') || n.includes('ghost')) return '👻';
    if (n.includes('troll')) return '🧌';
    if (n.includes('zwerg') || n.includes('dwarf')) return '⛏️';
    if (n.includes('riese') || n.includes('giant')) return '🗻';
    if (n.includes('roboter') || n.includes('robot')) return '🤖';
    if (n.includes('alien')) return '👽';
    if (n.includes('wuschel') || n.includes('flausch')) return '🧶';
    return '🐾';
  }
  // Role-based
  if ((n.includes('kapitän') || n.includes('captain') || n.includes('pirat') || n.includes('pirate')) && (n.includes('grimm') || n.includes('böse') || n.includes('finster') || n.includes('schwarz'))) return '☠️';
  if (n.includes('kapitän') || n.includes('captain') || n.includes('pirat') || n.includes('pirate')) return '⚓';
  if (n.includes('könig') || n.includes('king')) return '🤴';
  if (n.includes('königin') || n.includes('queen')) return '👸';
  if (n.includes('ritter') || n.includes('knight')) return '⚔️';
  if (n.includes('zauberer') || n.includes('wizard') || n.includes('magier')) return '🧙';
  return CHAR_EMOJI[gender] || '✨';
}
