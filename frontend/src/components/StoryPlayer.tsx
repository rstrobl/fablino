import { useRef, useState, useEffect } from 'react'
import { Play, Pause, Share2, Link2, Check, Wand2 } from 'lucide-react'
import { charEmoji, TwemojiIcon } from './CharacterEmoji'
import { fmt, generateWaveHeights, shareStory } from '../utils'
import type { Story } from '../types'

interface StoryPlayerProps {
  story: Story
  onGoHome: () => void
}

const WAVE_COUNT = 40

export function StoryPlayer({ story, onGoHome }: StoryPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [copied, setCopied] = useState(false)

  const waveHeights = generateWaveHeights(WAVE_COUNT, story.id)
  
  const progressPct = audioDuration > 0 ? progress / audioDuration : 0

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const updateTime = () => {
      setProgress(audio.currentTime)
      setAudioDuration(audio.duration || 0)
    }

    audio.addEventListener('timeupdate', updateTime)
    audio.addEventListener('loadedmetadata', updateTime)
    
    return () => {
      audio.removeEventListener('timeupdate', updateTime)
      audio.removeEventListener('loadedmetadata', updateTime)
    }
  }, [])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
    } else {
      audio.play()
    }
    setIsPlaying(!isPlaying)
  }

  const seekWave = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !audioDuration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    const seekTime = pct * audioDuration
    audio.currentTime = seekTime
    setProgress(seekTime)
  }

  const handleShare = async () => {
    try {
      await shareStory(story)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Handle error silently
    }
  }

  return (
    <div className="story-player">
      <div className="story-header">
        {story.coverUrl && (
          <img src={story.coverUrl} alt={story.title} className="story-cover" />
        )}
        <div className="story-header-info">
          <h2>{story.title}</h2>
          <p className="player-prompt">{story.summary || story.prompt}</p>
          <div className="characters">
            {story.characters.filter(c => c.name !== 'Erzähler').map((c, i) => (
              <span key={c.name} className="char-badge">
                <TwemojiIcon emoji={charEmoji(c.name, c.gender, i)} size={18} /> {c.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={story.audioUrl}
        onEnded={() => setIsPlaying(false)}
      />

      <div className="waveform-container">
        <button className="play-btn" onClick={togglePlay}>
          {isPlaying ? <Pause size={28} /> : <Play size={28} style={{ marginLeft: 3 }} />}
        </button>
        <div className="waveform" onClick={seekWave}>
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
          <button className="promo-cta" onClick={onGoHome}>
            <Wand2 size={16} /> Eigenes Hörspiel erstellen
          </button>
          <button className={`promo-share ${copied ? 'copied' : ''}`} onClick={handleShare}>
            {copied ? <><Check size={16} /> Kopiert!</> : 
             typeof navigator.share === 'function' ? <><Share2 size={16} /> Teilen</> : <><Link2 size={16} /> Teilen</>}
          </button>
        </div>
      </div>
    </div>
  )
}