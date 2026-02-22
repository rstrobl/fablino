import { useState, useRef } from 'react'
import { Clock, Play, Pause, Share2, Link2, Check } from 'lucide-react'
import { charEmoji, TwemojiIcon } from './CharacterEmoji'
import { shareStory } from '../utils'
import type { Story } from '../types'

interface StoryCardProps {
  story: Story
  duration?: number
  onPlay: (story: Story) => void
}

export function StoryCard({ story, duration, onPlay }: StoryCardProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [copied, setCopied] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    if (isPlaying) {
      audioRef.current?.pause()
      setIsPlaying(false)
    } else {
      if (audioRef.current) audioRef.current.pause()
      setIsPlaying(true)
      
      // Create new audio element for mini preview
      const audio = new Audio(story.audioUrl)
      audioRef.current = audio
      
      audio.addEventListener('ended', () => setIsPlaying(false))
      audio.addEventListener('error', () => setIsPlaying(false))
      
      setTimeout(() => audio.play(), 50)
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    try {
      await shareStory(story)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Handle error silently
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '~5 Min'
    const m = Math.floor(seconds / 60)
    return m > 0 ? `${m} Min` : '<1 Min'
  }

  return (
    <div className="story-card" onClick={() => onPlay(story)}>
      {story.coverUrl ? (
        <img src={story.coverUrl} alt={story.title} className="story-image" />
      ) : (
        <div className="story-placeholder">
          <div className="story-chars">
            {story.characters.filter(c => c.name !== 'Erzähler').slice(0, 3).map((c, i) => (
              <TwemojiIcon key={c.name} emoji={charEmoji(c.name, c.gender, i)} size={24} />
            ))}
          </div>
        </div>
      )}
      
      <div className="story-content">
        <h3>{story.title}</h3>
        <p className="story-prompt">{story.summary || story.prompt}</p>
        
        <div className="story-meta">
          <div className="story-duration">
            <Clock size={14} /> {formatDuration(duration)}
          </div>
          <div className="story-age-group">{story.ageGroup}</div>
        </div>
        
        <div className="story-actions">
          <button className="featured-icon-btn play" onClick={handlePlayClick}>
            {isPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: 2 }} />}
          </button>
          <button className={`featured-icon-btn share ${copied ? 'copied' : ''}`} onClick={handleShare}>
            {copied ? <Check size={18} /> : 
             typeof navigator.share === 'function' ? <Share2 size={18} /> : <Link2 size={18} />}
          </button>
        </div>
      </div>
    </div>
  )
}