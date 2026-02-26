/**
 * Fallback emoji for story characters.
 * Claude now outputs emoji directly — this is only for legacy stories
 * or edge cases where Claude doesn't provide one.
 */

export function charEmoji(
  name: string,
  gender: string,
  species?: string[],
  age?: number,
): string {
  const n = name.toLowerCase();

  // Narrator is always 📖
  if (n === 'erzähler' || n === 'narrator') return '📖';

  // Non-human creature fallback
  if (species?.some(s => !['human', 'mensch'].includes(s.toLowerCase()))) {
    return '🐾';
  }

  // Human: gender + age based
  const g = gender === 'female' ? 'f' : 'm';
  if (age != null) {
    if (age <= 14) return g === 'f' ? '👧' : '👦';
    if (age >= 60) return g === 'f' ? '👵' : '👴';
  }
  return g === 'f' ? '👩' : '👨';
}
