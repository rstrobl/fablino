import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import {
  Headphones, Sparkles, Wand2, BookOpen, Play, Pause, Download,
  Share2, ChevronLeft, Heart, Clock, Music, Package, Link2, Check,
  Smile, Ghost, Sword, Moon, Shuffle, AlertCircle
} from 'lucide-react'
import './App.css'

interface Story {
  id: string
  title: string
  characters: { name: string; gender: string }[]
  voiceMap: Record<string, string>
  prompt: string
  ageGroup: string
  mood: string
  createdAt: string
  audioUrl: string
}

interface ScriptLine {
  speaker: string
  text: string
  sfx?: string
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

type View = 'home' | 'loading' | 'preview' | 'player'

const MOODS = [
  { key: 'witzig', icon: Smile, label: 'Lustig' },
  { key: 'abenteuerlich', icon: Sword, label: 'Abenteuer' },
  { key: 'gutenacht', icon: Moon, label: 'Zum Einschlafen' },
  { key: 'gruselig', icon: Ghost, label: 'Gruselig' },
] as const

const MOOD_LOADING_MESSAGES: Record<string, string[]> = {
  witzig: ['Die Pointen werden geschärft...', 'Die Lachmuskeln werden aufgewärmt...'],
  gruselig: ['Die Schatten werden länger...', 'Mysteriöse Geräusche werden gesammelt...'],
  abenteuerlich: ['Die Schatzkarte wird gezeichnet...', 'Mutige Helden werden rekrutiert...'],
  gutenacht: ['Die Sterne werden angezündet...', 'Das Mondlicht wird sanft gedimmt...'],
}

const GENERIC_LOADING = [
  'Die Charaktere werden erfunden...',
  'Die Stimmen werden eingesprochen...',
  'Sound-Effekte werden gemischt...',
  'Das Hörspiel wird zusammengesetzt...',
  'Noch ein bisschen Magie...',
]

const MOOD_COLORS: Record<string, { bg: string; color: string }> = {
  witzig: { bg: '#FFF8E1', color: '#FFB300' },
  gruselig: { bg: '#F3E5F5', color: '#AB47BC' },
  abenteuerlich: { bg: '#FBE9E7', color: '#FF7043' },
  gutenacht: { bg: '#E3F2FD', color: '#7986CB' },
}

function getMoodInfo(moodKey: string) {
  return MOODS.find(m => m.key === moodKey) || MOODS[0]
}

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
  const [view, setView] = useState<View>('home')
  const [prompt, setPrompt] = useState('')
  const [heroName, setHeroName] = useState('')
  const [heroAge, setHeroAge] = useState('')
  const [sideCharacters, setSideCharacters] = useState<SideCharacter[]>([])
  const [mood, setMood] = useState('witzig')
  const [currentStory, setCurrentStory] = useState<Story | null>(null)
  const [stories, setStories] = useState<Story[]>([])
  const [loadingMsg, setLoadingMsg] = useState(0)
  const [loadingMessages, setLoadingMessages] = useState<string[]>(GENERIC_LOADING)
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [showTonieModal, setShowTonieModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [storyDurations, setStoryDurations] = useState<Record<string, number>>({})
  const [previewScript, setPreviewScript] = useState<ScriptPreview | null>(null)
  const [previewJobId, setPreviewJobId] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const WAVE_COUNT = 40
  const waveHeights = useMemo(
    () => generateWaveHeights(WAVE_COUNT, currentStory?.id || 'default'),
    [currentStory?.id]
  )

  const navigateFromUrl = useCallback((storiesList?: Story[]) => {
    const list = storiesList || stories
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
    }
    setView('home')
    setCurrentStory(null)
  }, [stories])

  useEffect(() => {
    fetch('/api/stories').then(r => r.json()).then((data: Story[]) => {
      setStories(data)
      navigateFromUrl(data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const onPopState = () => navigateFromUrl()
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [navigateFromUrl])

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
  }, [stories, storyDurations])

  useEffect(() => {
    if (view !== 'loading') return
    const iv = setInterval(() => setLoadingMsg(m => (m + 1) % loadingMessages.length), 3000)
    return () => clearInterval(iv)
  }, [view, loadingMessages])

  const addSideCharacter = () => {
    setSideCharacters(prev => [...prev, { role: 'mama', name: '' }])
  }

  const removeSideCharacter = (index: number) => {
    setSideCharacters(prev => prev.filter((_, i) => i !== index))
  }

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

  const randomPrompt = () => {
    const p = RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)]
    setPrompt(p)
  }

  const generate = async () => {
    if (!heroName.trim()) return
    const finalPrompt = prompt.trim() || RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)]
    setError('')
    const msgs = [...(MOOD_LOADING_MESSAGES[mood] || []), ...GENERIC_LOADING]
    setLoadingMessages(msgs)
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
        body: JSON.stringify({ prompt: finalPrompt, ageGroup: derivedAgeGroup, mood, characters })
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

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) { audioRef.current.pause() } else { audioRef.current.play() }
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
        setCurrentStory(job.story as Story)
        setStories(prev => [job.story as Story, ...prev])
        setView('player')
        setIsPlaying(false)
        setProgress(0)
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

  const shareWhatsApp = (story: Story) => {
    const url = storyUrl(story.id)
    const text = encodeURIComponent(`Hör mal! "${story.title}" — ein magisches Hörspiel von Fablino!\n${url}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  const shareTelegram = (story: Story) => {
    const url = storyUrl(story.id)
    const text = encodeURIComponent(`"${story.title}" — Fablino!`)
    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${text}`, '_blank')
  }

  const copyLink = (story: Story) => {
    navigator.clipboard.writeText(storyUrl(story.id))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadTonie = (story: Story) => {
    const a = document.createElement('a')
    a.href = story.audioUrl
    a.download = `${story.title}.mp3`
    a.click()
    setShowTonieModal(true)
  }

  const progressPct = audioDuration > 0 ? progress / audioDuration : 0

  return (
    <div className="app">
      <header onClick={goHome}>
        <div className="header-logo">
          <img src="/logo.png" alt="Fablino" className="logo" />
        </div>
        <p className="tagline">Personalisierte KI-Hörspiele für kleine Ohren</p>
      </header>

      {/* ===== HOME ===== */}
      {view === 'home' && (
        <main>
          <div className="hero">
            <h2>
              <span className="highlight">Dein Kind wird zum Helden</span>
            </h2>
            <p>Personalisierte KI-Hörspiele, in denen dein Kind die Hauptrolle spielt — in wenigen Minuten gezaubert.</p>
          </div>

          <div className="creator">
            <div className="creator-header">
              <Wand2 size={22} />
              <h2>Neues Hörspiel erstellen</h2>
            </div>

            {/* Hero character */}
            <div className="character-section">
              <label>👤 Dein Held</label>
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

            {/* Side characters */}
            <div className="character-section">
              {sideCharacters.length > 0 && (
                <div className="side-characters">
                  {sideCharacters.map((sc, i) => (
                    <div key={i} className="side-char-row">
                      <select value={sc.role} onChange={e => updateSideCharacter(i, 'role', e.target.value)}>
                        {SIDE_ROLES.map(r => (
                          <option key={r.key} value={r.key}>{r.label}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        value={sc.name}
                        onChange={e => updateSideCharacter(i, 'name', e.target.value)}
                        placeholder="Name"
                      />
                      <button className="remove-char-btn" onClick={() => removeSideCharacter(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              <button className="add-char-btn" onClick={addSideCharacter}>
                + Noch jemand hinzufügen
              </button>
            </div>

            {/* Story prompt */}
            <label>Was soll passieren?</label>
            <div className="prompt-section">
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="Ein mutiger Hase, der einen Schatz im verzauberten Wald sucht..."
                rows={3}
              />
              <button className="random-btn" onClick={randomPrompt} title="Überrasch mich!">
                <Shuffle size={16} /> Überrasch mich!
              </button>
            </div>

            <div className="options">
              <div className="option-group">
                <label>Stimmung</label>
                <div className="mood-chips">
                  {MOODS.map(m => {
                    const Icon = m.icon
                    return (
                      <button
                        key={m.key}
                        className={`mood-chip ${mood === m.key ? 'active' : ''}`}
                        data-mood={m.key}
                        onClick={() => setMood(m.key)}
                      >
                        <Icon size={16} /> {m.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <button className="generate-btn" onClick={generate} disabled={!heroName.trim()}>
              <Sparkles size={20} /> Hörspiel zaubern!
            </button>

            {error && <p className="error"><AlertCircle size={16} /> {error}</p>}
          </div>

          {stories.length > 0 && (
            <div className="gallery">
              <div className="gallery-header">
                <BookOpen size={22} />
                <h2>Letzte Hörspiele</h2>
              </div>
              <div className="story-grid">
                {stories.map(s => {
                  const mi = getMoodInfo(s.mood)
                  const MoodIcon = mi.icon
                  const dur = storyDurations[s.id]
                  return (
                    <div key={s.id} className="story-card" data-mood={s.mood} onClick={() => playStory(s)}>
                      <div className="story-icon-row">
                        <Music size={20} />
                        <Headphones size={20} />
                      </div>
                      <h3>{s.title}</h3>
                      <p className="story-prompt">{s.prompt}</p>
                      <div className="story-meta-row">
                        {s.mood && (
                          <span className="mood-badge" data-mood={s.mood}>
                            <MoodIcon size={12} /> {mi.label}
                          </span>
                        )}
                        {dur && <span className="story-meta"><Clock size={12} /> {fmt(dur)}</span>}
                      </div>
                      <div className="card-actions">
                        <button onClick={e => { e.stopPropagation(); shareWhatsApp(s) }} title="WhatsApp">
                          <Share2 size={14} /> Teilen
                        </button>
                        <a href={s.audioUrl} download={`${s.title}.mp3`} onClick={e => e.stopPropagation()} title="Download">
                          <Download size={14} /> MP3
                        </a>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="footer">
            Fablino — Personalisierte KI-Hörspiele mit <Heart size={14} /> gemacht
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
        const mi = getMoodInfo(mood)
        const MoodIcon = mi.icon
        const moodColor = MOOD_COLORS[mood] || MOOD_COLORS.witzig
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
              <span className="player-mood" style={{ background: moodColor.bg, color: moodColor.color }}>
                <MoodIcon size={16} /> {mi.label}
              </span>
              <span className="preview-stat">{previewScript.characters.length} Charaktere</span>
              <span className="preview-stat">{previewScript.scenes.length} Szenen</span>
              <span className="preview-stat">{totalLines} Zeilen</span>
            </div>

            <div className="preview-characters">
              {previewScript.characters.map(c => (
                <span key={c.name} className="char-badge">
                  {c.gender === 'female' || c.gender === 'weiblich' ? '👩' : c.gender === 'creature' ? '🐾' : '👨'} {c.name}
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
                      {line.sfx && <span className="line-sfx">🔊 {line.sfx}</span>}
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

      {/* ===== PLAYER ===== */}
      {view === 'player' && currentStory && (() => {
        const mi = getMoodInfo(currentStory.mood)
        const MoodIcon = mi.icon
        const moodColor = MOOD_COLORS[currentStory.mood] || MOOD_COLORS.witzig
        return (
          <main className="player">
            <button className="back-btn" onClick={() => { goHome(); setPrompt('') }}>
              <ChevronLeft size={18} /> Zurück
            </button>

            <h2>{currentStory.title}</h2>
            <p className="player-prompt">„{currentStory.prompt}"</p>
            {currentStory.mood && (
              <div className="player-mood" style={{ background: moodColor.bg, color: moodColor.color }}>
                <MoodIcon size={16} /> {mi.label}
              </div>
            )}
            <div className="characters">
              {currentStory.characters.map(c => (
                <span key={c.name} className="char-badge">{c.name}</span>
              ))}
            </div>

            <audio
              ref={audioRef}
              src={currentStory.audioUrl}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onTimeUpdate}
              onEnded={() => setIsPlaying(false)}
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

            <div className="action-row">
              <button className="action-btn tonie" onClick={() => downloadTonie(currentStory)}>
                <Package size={16} /> Für Toniebox
              </button>
              <a className="action-btn dl" href={currentStory.audioUrl} download={`${currentStory.title}.mp3`}>
                <Download size={16} /> MP3
              </a>
            </div>

            <div className="divider" />

            <div className="action-row">
              {typeof navigator.share === 'function' && (
                <button className="action-btn share" onClick={() => shareNative(currentStory)}>
                  <Share2 size={16} /> Teilen
                </button>
              )}
              <button className="action-btn wa" onClick={() => shareWhatsApp(currentStory)}>
                WhatsApp
              </button>
              <button className="action-btn tg" onClick={() => shareTelegram(currentStory)}>
                Telegram
              </button>
              <button className={`action-btn copy ${copied ? 'copied' : ''}`} onClick={() => copyLink(currentStory)}>
                {copied ? <><Check size={16} /> Kopiert!</> : <><Link2 size={16} /> Link</>}
              </button>
            </div>

            <button className="new-btn" onClick={() => { goHome(); setPrompt('') }}>
              <Wand2 size={18} /> Neues Hörspiel
            </button>
          </main>
        )
      })()}

      {/* ===== Toniebox Modal ===== */}
      {showTonieModal && (
        <div className="modal-overlay" onClick={() => setShowTonieModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <Package size={24} />
              <h3>Toniebox-Anleitung</h3>
            </div>
            <ul className="modal-steps">
              <li><span className="step-num">1</span> Öffne die <strong>mytonies App</strong> auf deinem Handy</li>
              <li><span className="step-num">2</span> Wähle deinen <strong>Kreativ-Tonie</strong> aus</li>
              <li><span className="step-num">3</span> Lade die heruntergeladene <strong>MP3-Datei</strong> hoch</li>
              <li><span className="step-num">4</span> Stelle den Tonie auf die Box — <strong>fertig!</strong></li>
            </ul>
            <button className="modal-close" onClick={() => setShowTonieModal(false)}>
              <Check size={18} /> Verstanden!
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
