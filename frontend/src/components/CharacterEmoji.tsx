const CHAR_EMOJI: Record<string, string> = {
  child_m: '👦',
  child_f: '👧',
  adult_m: '👨',
  adult_f: '👩',
  elder_m: '👴',
  elder_f: '👵',
  creature: '🐾',
  male: '👨',
  female: '👩',
  männlich: '👨',
  weiblich: '👩',
}

export function charEmoji(name: string, gender: string, _index: number): string {
  const n = name.toLowerCase()
  if (n === 'erzähler' || n === 'berättare') return '📖'
  // Name-based overrides
  if (n === 'elsa') return '👑'
  if (n.includes('schneebär')) return '🐻‍❄️'
  if (n.includes('schneeball') || n.includes('schnee')) return '❄️'
  if (gender === 'creature') {
    const n = name.toLowerCase()
    if (n.includes('drach') || n.includes('dragon')) return '🐉'
    if (n.includes('fuchs') || n.includes('fox')) return '🦊'
    if (n.includes('bär') || n.includes('bear')) return '🐻'
    if (n.includes('wolf')) return '🐺'
    if (n.includes('löwe') || n.includes('lion')) return '🦁'
    if (n.includes('frosch') || n.includes('frog')) return '🐸'
    if (n.includes('einhorn') || n.includes('unicorn')) return '🦄'
    if (n.includes('katze') || n.includes('cat')) return '🐱'
    if (n.includes('hund') || n.includes('dog')) return '🐶'
    if (n.includes('vogel') || n.includes('bird')) return '🐦'
    if (n.includes('eule') || n.includes('owl')) return '🦉'
    if (n.includes('hase') || n.includes('rabbit')) return '🐰'
    if (n.includes('maus') || n.includes('mouse')) return '🐭'
    if (n.includes('igel')) return '🦔'
    if (n.includes('schlange') || n.includes('snake')) return '🐍'
    if (n.includes('fisch') || n.includes('fish')) return '🐟'
    return '🐉'
  }
  return CHAR_EMOJI[gender] || '✨'
}

// Convert emoji to Twemoji CDN URL
function emojiToTwemoji(emoji: string): string {
  const codepoints = [...emoji]
    .map(c => c.codePointAt(0)!.toString(16))
    .filter(cp => cp !== 'fe0f') // remove variation selector
    .join('-')
  return `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codepoints}.svg`
}

export function TwemojiIcon({ emoji, size = 20 }: { emoji: string; size?: number }) {
  return (
    <img
      src={emojiToTwemoji(emoji)}
      alt={emoji}
      style={{ width: size, height: size, verticalAlign: 'middle', display: 'inline-block' }}
      draggable={false}
    />
  )
}