import type { Story } from './types'

export const RANDOM_PROMPTS = [
  'Ein magisches Abenteuer im verzauberten Wald',
  'Eine Reise zum Mond mit einem sprechenden Raumschiff',
  'Ein Tag im verrückten Spielzeugladen',
  'Die Suche nach dem verlorenen Piratenschatz',
  'Ein geheimnisvolles Ei im Garten',
  'Eine Nacht im Museum, wo alles lebendig wird',
  'Der mutigste Drache der Welt hat Angst vor Mäusen',
  'Eine Unterwasser-Party mit singenden Fischen',
  'Der fliegende Teppich, der nicht bremsen kann',
  'Ein Wettrennen durch die Wolken',
]

export const BASE_URL = 'https://fablino.de'

export function storyUrl(id: string) {
  return `${BASE_URL}/story/${id}`
}

export function fmt(s: number) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function generateWaveHeights(count: number, seed: string): number[] {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
  }
  const heights: number[] = []
  for (let i = 0; i < count; i++) {
    hash = ((hash << 5) - hash + i * 7) | 0
    const normalized = (Math.abs(hash) % 80 + 20) / 100
    heights.push(normalized)
  }
  return heights
}

export const GENERIC_LOADING = [
  'Die Charaktere werden erfunden...',
  'Die Stimmen werden eingesprochen...',
  'Sound-Effekte werden gemischt...',
  'Das Hörspiel wird zusammengesetzt...',
  'Noch ein bisschen Magie...',
]

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

export function shareStory(story: Story) {
  const url = storyUrl(story.id)
  const title = `${story.title} — Fablino`
  const text = `Hör dir "${story.title}" an! ${story.summary || story.prompt}`
  
  if (typeof navigator.share === 'function') {
    return navigator.share({ title, text, url })
  } else {
    return copyToClipboard(url)
  }
}