import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Headphones, Sparkles, Wand2, BookOpen, Play, Pause,
  Share2, ChevronLeft, Heart, Clock, Music, Link2, Check,
  // @ts-ignore
  Shuffle, AlertCircle
} from 'lucide-react'
import './App.css'

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

function charEmoji(name: string, gender: string, _index: number): string {
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

function TwemojiIcon({ emoji, size = 20 }: { emoji: string; size?: number }) {
  return (
    <img
      src={emojiToTwemoji(emoji)}
      alt={emoji}
      style={{ width: size, height: size, verticalAlign: 'middle', display: 'inline-block' }}
      draggable={false}
    />
  )
}

interface Story {
  id: string
  title: string
  characters: { name: string; gender: string }[]
  voiceMap: Record<string, string>
  prompt: string
  summary?: string
  ageGroup: string
  createdAt: string
  audioUrl: string
  coverUrl?: string
  lines?: { speaker: string; text: string }[]
}

interface ScriptLine {
  speaker: string
  text: string
}

interface ScriptScene {
  lines: ScriptLine[]
}

interface ScriptPreview {
  title: string
  characters: { name: string; gender: string }[]
  scenes: ScriptScene[]
}

interface SideCharacter {
  role: string
  name: string
}

// @ts-ignore: kept for full app mode
const SIDE_ROLES = [
  { key: 'mama', label: '👩 Mama', icon: '👩' },
  { key: 'papa', label: '👨 Papa', icon: '👨' },
  { key: 'geschwister', label: '👧 Geschwister', icon: '👧' },
  { key: 'freund', label: '🧒 Freund/in', icon: '🧒' },
  { key: 'haustier', label: '🐕 Haustier', icon: '🐕' },
  { key: 'oma', label: '👵 Oma', icon: '👵' },
  { key: 'opa', label: '👴 Opa', icon: '👴' },
] as const

const RANDOM_PROMPTS = [
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

type View = 'home' | 'loading' | 'preview' | 'player' | 'waitlist' | 'script' | 'impressum' | 'datenschutz'

const GENERIC_LOADING = [
  'Die Charaktere werden erfunden...',
  'Die Stimmen werden eingesprochen...',
  'Sound-Effekte werden gemischt...',
  'Das Hörspiel wird zusammengesetzt...',
  'Noch ein bisschen Magie...',
]

const BASE_URL = 'https://fablino.de'

function storyUrl(id: string) {
  return `${BASE_URL}/story/${id}`
}

function fmt(s: number) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function generateWaveHeights(count: number, seed: string): number[] {
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

function App() {
  const [initialLoad, setInitialLoad] = useState(() => !!window.location.pathname.match(/\/(story|preview)\//))
  const [view, setView] = useState<View>(() => {
    if (window.location.pathname.match(/\/story\//)) return 'player'
    if (window.location.pathname.match(/\/preview\//)) return 'preview'
    return 'home'
  })
  const [prompt, setPrompt] = useState('')
  const [heroName, setHeroName] = useState('')
  const [heroAge, setHeroAge] = useState('')
  const [sideCharacters, setSideCharacters] = useState<SideCharacter[]>([])
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [loadingMessages, setLoadingMessages] = useState<string[]>(GENERIC_LOADING)
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [copied, setCopied] = useState(false)
  const [storyDurations, setStoryDurations] = useState<Record<string, number>>({})
  const [previewScript, setPreviewScript] = useState<ScriptPreview | null>(null)
  const [previewJobId, setPreviewJobId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false)
  const [waitlistMsg, setWaitlistMsg] = useState('')
  const [waitlistLoading, setWaitlistLoading] = useState(false)
  const [reservedStoryId, setReservedStoryId] = useState<string | null>(null)
  const [waitlistChecked, setWaitlistChecked] = useState<string | null>(null)
  const [miniPlaying, setMiniPlaying] = useState<string | null>(null)
  const miniAudioRef = useRef<HTMLAudioElement | null>(null)

  // Check waitlist registration for stories without audio
  useEffect(() => {
    if (!currentStory || currentStory.audioUrl || waitlistSubmitted) return;
    if (waitlistChecked === currentStory.id) return;
    setWaitlistChecked(currentStory.id);
    fetch(`/api/waitlist/${currentStory.id}`).then(r => r.json()).then(d => {
      if (d.registered) {
        setWaitlistSubmitted(true);
        setWaitlistMsg('Du bist bereits vorgemerkt! Wir melden uns, sobald dein Hörspiel bereit ist.');
      }
    }).catch(() => {});
  }, [currentStory, waitlistSubmitted, waitlistChecked])
  const audioRef = useRef<HTMLAudioElement>(null)

  const WAVE_COUNT = 40
  const waveHeights = useMemo(
    () => generateWaveHeights(WAVE_COUNT, currentStory?.id || 'default'),
    [currentStory?.id]
  )

  const navigateFromUrl = useCallback((storiesList?: Story[]) => {
    const list = storiesList || stories

    // Don't interfere with loading
    if (view === 'loading') return

    // Handle /preview/:jobId URLs
    const previewMatch = window.location.pathname.match(/\/preview\/([a-f0-9-]+)/)
    if (previewMatch) {
      const jobId = previewMatch[1]
      fetch(`${BASE_URL}/api/status/${jobId}`)
        .then(r => r.ok ? r.json() : { status: 'not_found' })
        .then(job => {
          if (job.status === 'preview') {
            setPreviewScript(job.script as ScriptPreview)
            setPreviewJobId(jobId)
            setView('preview')
          } else if (job.status === 'done') {
            const story = job.story as Story
            window.history.replaceState({}, '', `/story/${story.id}`)
            setCurrentStory(story)
            setStories(prev => prev.find(s => s.id === story.id) ? prev : [story, ...prev])
            setView('player')
            setIsPlaying(false)
            setProgress(0)
          } else {
            setError(job.status === 'error' ? ((job.error as string) || 'Fehler bei der Generierung') : 'Vorschau nicht gefunden')
            setView('home')
          }
        })
        .catch(() => { setError('Vorschau konnte nicht geladen werden'); setView('home') })
      return
    }

    // Handle /story/:id/script URLs
    const scriptMatch = window.location.pathname.match(/\/story\/([a-f0-9-]+)\/script/)
    if (scriptMatch) {
      const scriptStoryId = scriptMatch[1]
      const found = list.find(s => s.id === scriptStoryId)
      if (found) {
        // If we already have lines, show script directly
        if (found.lines && found.lines.length > 0) {
          setCurrentStory(found)
          setView('script')
          return
        }
      }
      // Fetch full story with lines
      fetch(`${BASE_URL}/api/stories/${scriptStoryId}`)
        .then(r => r.ok ? r.json() : null)
        .then(story => {
          if (story) {
            setCurrentStory(story)
            setView('script')
          } else {
            setView('home')
          }
        })
        .catch(() => { setView('home') })
      return
    }

    const pathMatch = window.location.pathname.match(/\/story\/([a-f0-9-]+)/)
    const storyId = pathMatch ? pathMatch[1] : new URLSearchParams(window.location.search).get('story')
    if (storyId) {
      const found = list.find(s => s.id === storyId)
      if (found) {
        setCurrentStory(found)
        setView('player')
        setIsPlaying(false)
        setProgress(0)
        return
      }
      // Story not in featured list — fetch directly by ID
      fetch(`${BASE_URL}/api/stories/${storyId}`)
        .then(r => r.ok ? r.json() : null)
        .then(story => {
          if (story) {
            setCurrentStory(story)
            setView('player')
            setIsPlaying(false)
            setProgress(0)
          } else {
            setView('home')
            setCurrentStory(null)
          }
        })
        .catch(() => { setView('home'); setCurrentStory(null) })
      return
    }
    // Only set home if we're not already in a user-initiated view
    setView(prev => (prev === 'loading' || prev === 'preview') ? prev : 'home')
    setCurrentStory(null)
  }, [stories])

  useEffect(() => {
    fetch('/api/stories').then(r => r.json()).then((data: Story[]) => {
      setStories(data)
      navigateFromUrl(data)
      setInitialLoad(false)
    }).catch(() => { setInitialLoad(false) })
  }, [])

  useEffect(() => {
    const onPopState = () => navigateFromUrl()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    stories.forEach(s => {
      if (storyDurations[s.id] !== undefined) return
      const a = new Audio()
      a.preload = 'metadata'
      a.src = s.audioUrl
      a.onloadedmetadata = () => {
        if (a.duration && isFinite(a.duration)) {
          setStoryDurations(prev => ({ ...prev, [s.id]: a.duration }))
        }
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stories])

  useEffect(() => {
    if (view !== 'loading') return
    const iv = setInterval(() => setLoadingMsg(m => (m + 1) % loadingMessages.length), 3000)
    return () => clearInterval(iv)
  }, [view, loadingMessages])

  // @ts-ignore: kept for full app mode
  const addSideCharacter = () => {
    setSideCharacters(prev => [...prev, { role: 'mama', name: '' }])
  }

  // @ts-ignore: kept for full app mode
  const removeSideCharacter = (index: number) => {
    setSideCharacters(prev => prev.filter((_, i) => i !== index))
  }

  // @ts-ignore: kept for full app mode
  const updateSideCharacter = (index: number, field: 'role' | 'name', value: string) => {
    setSideCharacters(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c))
  }

  const pollJob = async (id: string): Promise<Record<string, unknown>> => {
    while (true) {
      await new Promise(r => setTimeout(r, 2000))
      const statusRes = await fetch(`/api/status/${id}`)
      const job = await statusRes.json()
      if (job.progress) {
        setLoadingMessages([job.progress])
        setLoadingMsg(0)
      }
      if (job.status === 'preview' || job.status === 'done' || job.status === 'error') {
        return job
      }
    }
  }

  // @ts-ignore: kept for full app mode
  const randomPrompt = () => {
    const p = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)]
    setPrompt(p)
  }

  const submitWaitlist = async () => {
    if (!waitlistEmail.includes('@')) return
    setWaitlistLoading(true)
    const sid = reservedStoryId || currentStory?.id || null
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: waitlistEmail,
          heroName: heroName.trim() || currentStory?.title || undefined,
          heroAge: heroAge.trim() || undefined,
          prompt: prompt.trim() || currentStory?.prompt || undefined,
          storyId: sid
        })
      })
      const data = await res.json()
      if (res.ok) {
        setWaitlistSubmitted(true)
        setWaitlistMsg(data.message)
      } else {
        setError(data.error || 'Fehler')
      }
    } catch {
      setError('Verbindungsfehler. Bitte versuche es später noch mal.')
    } finally {
      setWaitlistLoading(false)
    }
  }

  // @ts-ignore: kept for when waitlist mode is disabled
  const generate = async () => {
    if (!heroName.trim()) return
    const finalPrompt = prompt.trim() || RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)]
    setError('')
    setLoadingMessages(GENERIC_LOADING)
    setLoadingMsg(0)
    setView('loading')
    const heroAgeNum = parseInt(heroAge) || 5
    const derivedAgeGroup = heroAgeNum <= 5 ? '3-5' : '6-9'
    const characters = {
      hero: { name: heroName.trim(), age: heroAge.trim() || undefined },
      sideCharacters: sideCharacters.filter(c => c.name.trim()).map(c => ({ role: c.role, name: c.name.trim() }))
    }
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: finalPrompt, ageGroup: derivedAgeGroup, characters })
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Fehler')
      }
      const { id } = await res.json()
      const job = await pollJob(id)

      if (job.status === 'preview') {
        setPreviewScript(job.script as ScriptPreview)
        setPreviewJobId(id)
        setView('preview')
      } else if (job.status === 'done') {
        setCurrentStory(job.story as Story)
        setStories(prev => [job.story as Story, ...prev])
        setView('player')
        setIsPlaying(false)
        setProgress(0)
      } else if (job.status === 'error') {
        throw new Error((job.error as string) || 'Generierung fehlgeschlagen')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setView('home')
    }
  }

  const playStory = (story: Story) => {
    setCurrentStory(story)
    setView('player')
    setIsPlaying(false)
    setProgress(0)
    window.history.pushState({}, '', `/story/${story.id}`)
  }

  const hasTrackedPlay = useRef(false)
  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause() } else {
      audioRef.current.play()
      if (!hasTrackedPlay.current && currentStory) {
        hasTrackedPlay.current = true
        fetch(`/api/plays/${currentStory.id}`, { method: 'POST' }).catch(() => {})
      }
    }
    setIsPlaying(!isPlaying)
  }

  const onTimeUpdate = () => {
    if (!audioRef.current) return
    setProgress(audioRef.current.currentTime)
    setAudioDuration(audioRef.current.duration || 0)
  }

  const seekWave = useCallback((e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if (!audioRef.current) return
    const dur = audioRef.current.duration
    if (!dur || isNaN(dur)) return
    const rect = e.currentTarget.getBoundingClientRect()
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    audioRef.current.currentTime = pct * dur
    setProgress(pct * dur)
  }, [])

  const confirmScript = async () => {
    if (!previewJobId) return
    setConfirming(true)
    setView('loading')
    setLoadingMessages(['Stimmen werden eingesprochen...', ...GENERIC_LOADING.slice(1)])
    setLoadingMsg(0)
    try {
      const res = await fetch(`/api/generate/${previewJobId}/confirm`, { method: 'POST' })
      if (!res.ok) throw new Error('Bestätigung fehlgeschlagen')

      const job = await pollJob(previewJobId)
      if (job.status === 'done') {
        const story = job.story as Story
        // Fetch full story with lines from API
        try {
          const fullResp = await fetch(`/api/stories/${story.id}`)
          if (fullResp.ok) {
            const fullStory = await fullResp.json()
            setCurrentStory(fullStory)
            setStories(prev => [fullStory, ...prev])
          } else {
            setCurrentStory(story)
            setStories(prev => [story, ...prev])
          }
        } catch {
          setCurrentStory(story)
          setStories(prev => [story, ...prev])
        }
        setView('player')
        setIsPlaying(false)
        setProgress(0)
        window.history.pushState({}, '', `/story/${story.id}`)
      } else if (job.status === 'error') {
        throw new Error((job.error as string) || 'Audio-Generierung fehlgeschlagen')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Unbekannter Fehler')
      setView('home')
    } finally {
      setConfirming(false)
      setPreviewScript(null)
      setPreviewJobId(null)
    }
  }

  const goHome = () => {
    setView('home')
    setError('')
    window.history.pushState({}, '', '/')
  }

  const shareNative = (story: Story) => {
    const url = storyUrl(story.id)
    const text = `Hör mal! "${story.title}" — ein magisches Hörspiel von Fablino!`
    if (navigator.share) {
      navigator.share({ title: story.title, text, url }).catch(() => {})
    }
  }

  const copyLink = (story: Story) => {
    navigator.clipboard.writeText(storyUrl(story.id))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const progressPct = audioDuration > 0 ? progress / audioDuration : 0

  return (
    <div className="app">
      <header onClick={goHome}>
        <div className="header-logo">
          <img src="/logo.png" alt="Fablino" className="logo" />
        </div>
{/* tagline removed — hero section covers it */}
      </header>

      {/* ===== HOME ===== */}
      {view === 'home' && !initialLoad && (
        <main>
          <div className="hero">
            <h2>
              <span className="highlight">Dein Kind wird zum Helden</span>
            </h2>
            <p>Dein Kind als Held in einem eigenen Hörspiel — mit echten Stimmen, einzigartig und persönlich.</p>
          </div>

          <div className="creator">
            <div className="creator-header">
              <Wand2 size={22} />
              <h2>Dein Hörspiel</h2>
            </div>

            {/* Hero character */}
            <div className="character-section">
              <label>Wie heißt dein Kind?</label>
              <div className="hero-fields">
                <input
                  type="text"
                  value={heroName}
                  onChange={e => setHeroName(e.target.value)}
                  placeholder="Name deines Helden"
                  className="hero-name-input"
                />
                <input
                  type="text"
                  value={heroAge}
                  onChange={e => setHeroAge(e.target.value)}
                  placeholder="Alter"
                  className="hero-age-input"
                />
              </div>
            </div>

            {/* About the child */}
            <label>Erzähl uns von deinem Kind</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Liebt Dinosaurier und Ritter, beste Freundin heißt Mila, und Hund Bello soll auch vorkommen..."
              rows={3}
            />

            <button
              className="generate-btn"
              onClick={async () => {
                if (!heroName.trim() || !heroAge.trim()) return;
                setWaitlistSubmitted(false); setWaitlistMsg(''); setError('');
                try {
                  const res = await fetch('/api/reserve', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ heroName: heroName.trim(), heroAge: heroAge.trim(), prompt: prompt.trim() || undefined })
                  });
                  const data = await res.json();
                  if (data.storyId) {
                    setReservedStoryId(data.storyId);
                    setCurrentStory({ id: data.storyId, title: `${heroName.trim()}s Hörspiel`, characters: [], voiceMap: {}, prompt: prompt.trim(), summary: JSON.stringify({ heroName: heroName.trim(), heroAge: heroAge.trim(), prompt: prompt.trim() || null }), ageGroup: (parseInt(heroAge) || 5) <= 5 ? '3-5' : '6-9', createdAt: new Date().toISOString(), audioUrl: '' } as Story);
                    window.history.pushState({}, '', `/story/${data.storyId}`);
                    setView('player');
                  }
                } catch { setError('Verbindungsfehler. Bitte versuche es später noch mal.'); }
              }}
              disabled={!heroName.trim() || !heroAge.trim()}
            >
              <Sparkles size={20} /> Hörspiel zaubern!
            </button>

            {error && <p className="error"><AlertCircle size={16} /> {error}</p>}
          </div>

          {stories.length > 0 && (
            <div className="gallery">
              <div className="gallery-header">
                <Headphones size={22} />
                <h2>Hörprobe</h2>
              </div>
              <div className="story-grid">
                {stories.map(s => {
                  const dur = storyDurations[s.id]
                  const isMiniPlaying = miniPlaying === s.id
                  return (
                    <div key={s.id} className="featured-card">
                      <div className="featured-clickable" onClick={() => playStory(s)}>
                        {s.coverUrl && (
                          <img src={s.coverUrl} alt={s.title} className="featured-cover" />
                        )}
                        <h3>{s.title}</h3>
                        {dur && <span className="story-meta"><Clock size={12} /> {fmt(dur)}</span>}
                      </div>
                      {s.audioUrl && (
                        <audio
                          ref={isMiniPlaying ? miniAudioRef : undefined}
                          src={isMiniPlaying ? s.audioUrl : undefined}
                          onEnded={() => { setMiniPlaying(null); fetch(`/api/plays/${s.id}/complete`, { method: 'POST' }).catch(() => {}) }}
                          style={{ display: 'none' }}
                        />
                      )}
                      <div className="featured-actions">
                        <button className="featured-icon-btn play" onClick={() => {
                          if (isMiniPlaying) {
                            miniAudioRef.current?.pause()
                            setMiniPlaying(null)
                          } else {
                            if (miniAudioRef.current) miniAudioRef.current.pause()
                            setMiniPlaying(s.id)
                            fetch(`/api/plays/${s.id}`, { method: 'POST' }).catch(() => {})
                            setTimeout(() => miniAudioRef.current?.play(), 50)
                          }
                        }}>
                          {isMiniPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
                        </button>
                        {typeof navigator.share === 'function' ? (
                          <button className="featured-icon-btn share" onClick={() => shareNative(s)}>
                            <Share2 size={18} />
                          </button>
                        ) : (
                          <button className={`featured-icon-btn share ${copied ? 'copied' : ''}`} onClick={() => copyLink(s)}>
                            {copied ? <Check size={18} /> : <Link2 size={18} />}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="footer">
            <span style={{display:'flex',alignItems:'center',gap:'0.3rem'}}>Fablino — Magische Hörspiele mit <Heart size={14} /> gemacht</span>
            <div className="footer-links">
              <a onClick={() => setView('impressum')}>Impressum</a>
              <a onClick={() => setView('datenschutz')}>Datenschutz</a>
            </div>
          </div>
        </main>
      )}

      {/* ===== LOADING ===== */}
      {view === 'loading' && (
        <main className="loading">
          <div className="loading-visual">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="loading-bar" />
            ))}
          </div>
          <p className="loading-text">{loadingMessages[loadingMsg]}</p>
          <p className="loading-sub">Nur ein paar Sekunden...</p>
        </main>
      )}

      {/* ===== PREVIEW ===== */}
      {view === 'preview' && previewScript && (() => {
        const totalLines = previewScript.scenes.reduce((sum, s) => sum + s.lines.length, 0)
        return (
          <main className="preview">
            <button className="back-btn" onClick={() => { setView('home'); setPreviewScript(null); setPreviewJobId(null) }}>
              <ChevronLeft size={18} /> Verwerfen
            </button>

            <div className="preview-header">
              <BookOpen size={24} />
              <h2>Skript-Vorschau</h2>
            </div>

            <h3 className="preview-title">{previewScript.title}</h3>

            <div className="preview-meta">
              <span className="preview-stat">{previewScript.characters.length} Charaktere</span>
              <span className="preview-stat">{previewScript.scenes.length} Szenen</span>
              <span className="preview-stat">{totalLines} Zeilen</span>
            </div>

            <div className="preview-characters">
              {previewScript.characters.filter(c => c.name !== 'Erzähler').map((c, i) => (
                <span key={c.name} className="char-badge">
                  <TwemojiIcon emoji={charEmoji(c.name, c.gender, i)} size={18} /> {c.name}
                </span>
              ))}
            </div>

            <div className="preview-scenes">
              {previewScript.scenes.map((scene, si) => (
                <div key={si} className="preview-scene">
                  <div className="scene-header">Szene {si + 1}</div>
                  {scene.lines.map((line, li) => (
                    <div key={li} className={`preview-line ${line.speaker === 'Erzähler' ? 'narrator' : ''}`}>
                      <span className="line-speaker">{line.speaker}</span>
                      <span className="line-text">{line.text}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="preview-actions">
              <button className="generate-btn" onClick={confirmScript} disabled={confirming}>
                <Sparkles size={20} /> Hörspiel generieren!
              </button>
              <button className="back-btn-secondary" onClick={() => { setView('home'); setPreviewScript(null); setPreviewJobId(null) }}>
                Verwerfen & neu schreiben
              </button>
            </div>
          </main>
        )
      })()}

      {/* waitlist view removed — integrated into player */}

      {/* ===== PLAYER ===== */}
      {view === 'player' && currentStory && (() => {
        const hasAudio = !!currentStory.audioUrl;

        // No audio = waitlist mode
        if (!hasAudio) {
          let meta: { heroName?: string; heroAge?: string; prompt?: string } = {};
          try {
            const parsed = currentStory.summary ? JSON.parse(currentStory.summary) : {};
            if (parsed && typeof parsed === 'object' && parsed.heroName) meta = parsed;
          } catch { /* summary is not JSON meta, ignore */ }
          return (
          <main className="player">
            <div className="waitlist-header">
              <Sparkles size={28} />
              <h2>Fast geschafft!</h2>
            </div>

            <div className="waitlist-summary-card">
              <div className="waitlist-summary-title">Dein Hörspiel-Wunsch</div>
              <div className="waitlist-summary-hero"><TwemojiIcon emoji="🦸" size={22} /> {meta.heroName || currentStory.title}{meta.heroAge ? `, ${meta.heroAge} Jahre` : ''}</div>
              {meta.prompt && <div className="waitlist-summary-prompt">„{meta.prompt}"</div>}
            </div>

            {!waitlistSubmitted ? (
              <div className="waitlist-inline">
                <p className="waitlist-page-desc">
                  Gib uns deine Email und wir schicken dir dein Hörspiel zu, sobald es fertig gezaubert ist.
                </p>
                <label className="waitlist-label">Deine Email-Adresse</label>
                <input
                  type="email"
                  value={waitlistEmail}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  placeholder="name@beispiel.de"
                  className="waitlist-email-input"
                  autoFocus
                  onKeyDown={e => { if (e.key === 'Enter' && waitlistEmail.includes('@')) submitWaitlist() }}
                />
                <button
                  className="generate-btn"
                  onClick={submitWaitlist}
                  disabled={!waitlistEmail.includes('@') || waitlistLoading}
                >
                  <Sparkles size={20} /> {waitlistLoading ? 'Wird gesendet...' : 'Benachrichtige mich!'}
                </button>
                {error && <p className="error"><AlertCircle size={16} /> {error}</p>}
              </div>
            ) : (
              <div className="waitlist-success">
                <TwemojiIcon emoji="🎉" size={40} />
                <h3>Du bist dabei!</h3>
                <p>{waitlistMsg}</p>
              </div>
            )}

          </main>
        );}

        return (
          <main className="player">
            <div className="story-header">
              {currentStory.coverUrl && (
                <img src={currentStory.coverUrl} alt={currentStory.title} className="story-cover" />
              )}
              <div className="story-header-info">
                <h2>{currentStory.title}</h2>
                <p className="player-prompt">{currentStory.summary || currentStory.prompt}</p>
                <div className="characters">
                  {currentStory.characters.filter(c => c.name !== 'Erzähler').map((c, i) => (
                    <span key={c.name} className="char-badge"><TwemojiIcon emoji={charEmoji(c.name, c.gender, i)} size={18} /> {c.name}</span>
                  ))}
                </div>
              </div>
            </div>

            <audio
              ref={audioRef}
              src={currentStory.audioUrl}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onTimeUpdate}
              onEnded={() => { setIsPlaying(false); if (currentStory) fetch(`/api/plays/${currentStory.id}/complete`, { method: 'POST' }).catch(() => {}) }}
            />

            <div className="waveform-container">
              <button className="play-btn" onClick={togglePlay}>
                {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 3 }} />}
              </button>
              <div className="waveform" onClick={seekWave} onTouchStart={seekWave}>
                {waveHeights.map((h, i) => {
                  const barPct = (i + 0.5) / WAVE_COUNT
                  const isPlayed = barPct <= progressPct
                  return (
                    <div
                      key={i}
                      className={`wave-bar ${isPlayed ? 'played' : 'unplayed'} ${isPlaying && isPlayed && barPct > progressPct - 0.05 ? 'playing' : ''}`}
                      style={{ height: `${h * 100}%` }}
                    />
                  )
                })}
              </div>
            </div>
            <div className="time-display">
              <span>{fmt(progress)}</span>
              <span>{fmt(audioDuration)}</span>
            </div>

            <div className="fablino-promo">
              <p><strong>Fablino</strong> erstellt personalisierte Hörspiele, in denen dein Kind die Hauptrolle spielt.</p>
              <div className="promo-buttons">
                <button className="promo-cta" onClick={() => { goHome(); setPrompt('') }}>
                  <Wand2 size={16} /> Eigenes Hörspiel erstellen
                </button>
                {typeof navigator.share === 'function' ? (
                  <button className="promo-share" onClick={() => shareNative(currentStory)}>
                    <Share2 size={16} /> Teilen
                  </button>
                ) : (
                  <button className={`promo-share ${copied ? 'copied' : ''}`} onClick={() => copyLink(currentStory)}>
                    {copied ? <><Check size={16} /> Kopiert!</> : <><Link2 size={16} /> Teilen</>}
                  </button>
                )}
              </div>
            </div>
          </main>
        )
      })()}

      {/* ===== SCRIPT ===== */}
      {view === 'script' && currentStory && (() => {
        const lines = currentStory.lines || []
        // Group lines into scenes: a scene break is when speaker is 'Erzähler' and text contains scene-like markers,
        // or we just show all lines as one flowing script
        return (
          <main className="player">
            <button className="back-btn" onClick={() => {
              window.history.pushState({}, '', `/story/${currentStory.id}`)
              setView('player')
            }}>
              <ChevronLeft size={18} /> Zurück
            </button>

            <h2>{currentStory.title}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Skript — {lines.length} Zeilen</p>

            <div className="characters" style={{ marginBottom: '1.5rem' }}>
              {currentStory.characters.filter(c => c.name !== 'Erzähler').map((c, i) => (
                <span key={c.name} className="char-badge">
                  <TwemojiIcon emoji={charEmoji(c.name, c.gender, i)} size={18} /> {c.name}
                </span>
              ))}
            </div>

            <div className="script-view" style={{ maxHeight: 'none' }}>
              {lines.map((line, i) => {
                const isNarrator = line.speaker === 'Erzähler'
                return (
                  <div key={i} className={`script-line ${isNarrator ? 'narrator' : 'character'}`}>
                    <span className="script-speaker">{line.speaker}</span>
                    <span className="script-text">{line.text}</span>
                  </div>
                )
              })}
            </div>

            <button className="back-btn" onClick={() => {
              window.history.pushState({}, '', `/story/${currentStory.id}`)
              setView('player')
            }} style={{ marginTop: '1.5rem' }}>
              <ChevronLeft size={18} /> Zurück zum Player
            </button>
          </main>
        )
      })()}

      {/* ===== IMPRESSUM ===== */}
      {view === 'impressum' && (
        <main className="legal-page">
          <button className="back-btn" onClick={() => setView('home')}><ChevronLeft size={18} /> Zurück</button>
          <h2>Impressum</h2>
          <h3>Angaben nach §5 TMG</h3>
          <p>Nomadiq Labs GmbH<br/>Korsörer Straße 2<br/>10437 Berlin</p>
          <h3>Vertreten durch</h3>
          <p>Robert Strobl</p>
          <h3>Registergericht</h3>
          <p>Handelsregister<br/>HRB 249 234 B<br/>Amtsgericht Charlottenburg</p>
          <h3>Umsatzsteuer ID</h3>
          <p>DE358933512</p>
          <h3>Kontakt</h3>
          <p>E-Mail: mail@rstrobl.com</p>
          <h3>Haftung für Inhalte</h3>
          <p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
          <h3>Haftung für Links</h3>
          <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen.</p>
        </main>
      )}

      {/* ===== DATENSCHUTZ ===== */}
      {view === 'datenschutz' && (
        <main className="legal-page">
          <button className="back-btn" onClick={() => setView('home')}><ChevronLeft size={18} /> Zurück</button>
          <h2>Datenschutzerklärung</h2>
          <h3>1. Verantwortlicher</h3>
          <p>Nomadiq Labs GmbH<br/>Korsörer Straße 2, 10437 Berlin<br/>E-Mail: mail@rstrobl.com</p>
          <h3>2. Erhebung und Speicherung personenbezogener Daten</h3>
          <p>Beim Besuch unserer Website werden automatisch Informationen an den Server übermittelt (IP-Adresse, Datum und Uhrzeit, aufgerufene Seite). Diese Daten werden nur zur Bereitstellung der Website benötigt und nach 7 Tagen gelöscht.</p>
          <h3>3. Warteliste / E-Mail-Erfassung</h3>
          <p>Wenn Sie sich auf unsere Warteliste eintragen, speichern wir Ihre E-Mail-Adresse, den Namen und das Alter des Kindes sowie Ihre Hörspiel-Wünsche. Diese Daten verwenden wir ausschließlich, um Ihr personalisiertes Hörspiel zu erstellen und Sie über die Fertigstellung zu informieren. Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (Einwilligung).</p>
          <h3>4. Weitergabe von Daten</h3>
          <p>Eine Weitergabe Ihrer Daten an Dritte erfolgt nicht, es sei denn, dies ist zur Erbringung unserer Dienstleistung erforderlich (z.B. Hosting-Provider). Wir nutzen Server in Deutschland (EU).</p>
          <h3>5. Ihre Rechte</h3>
          <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer Daten. Zur Ausübung Ihrer Rechte kontaktieren Sie uns unter mail@rstrobl.com.</p>
          <h3>6. Löschung</h3>
          <p>Ihre Daten werden gelöscht, sobald der Zweck der Speicherung entfällt oder Sie Ihre Einwilligung widerrufen.</p>
          <h3>7. Cookies</h3>
          <p>Diese Website verwendet keine Cookies und kein Tracking.</p>
        </main>
      )}

    </div>
  )
}

export default App
