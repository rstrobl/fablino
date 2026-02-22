import { useState } from 'react'
import { Sparkles, AlertCircle, Music, Headphones } from 'lucide-react'
import { TwemojiIcon } from './CharacterEmoji'
import type { Story } from '../types'

interface WaitlistFormProps {
  story: Story
  stories: Story[]
  onSubmitWaitlist: (email: string) => Promise<void>
  onPlayStory: (story: Story) => void
  waitlistSubmitted: boolean
  waitlistMsg: string
  error: string
}

export function WaitlistForm({ 
  story, 
  stories, 
  onSubmitWaitlist, 
  onPlayStory,
  waitlistSubmitted,
  waitlistMsg,
  error 
}: WaitlistFormProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  // Extract metadata from story summary if it's JSON
  let meta: { heroName?: string; heroAge?: string; prompt?: string } = {}
  try {
    const parsed = story.summary ? JSON.parse(story.summary) : {}
    if (parsed && typeof parsed === 'object' && parsed.heroName) {
      meta = parsed
    }
  } catch {
    // summary is not JSON meta, ignore
  }

  const handleSubmit = async () => {
    if (!email.includes('@')) return
    
    setLoading(true)
    try {
      await onSubmitWaitlist(email)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="player">
      <div className="waitlist-header">
        <Sparkles size={28} />
        <h2>Fast geschafft!</h2>
      </div>

      <div className="waitlist-summary-card">
        <div className="waitlist-summary-title">Dein Hörspiel-Wunsch</div>
        <div className="waitlist-summary-hero">
          <TwemojiIcon emoji="🦸" size={22} /> 
          {meta.heroName || story.title}
          {meta.heroAge ? `, ${meta.heroAge} Jahre` : ''}
        </div>
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
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="name@beispiel.de"
            className="waitlist-email-input"
            autoFocus
            onKeyDown={e => { 
              if (e.key === 'Enter' && email.includes('@')) {
                handleSubmit()
              }
            }}
          />
          <button
            className="generate-btn"
            onClick={handleSubmit}
            disabled={!email.includes('@') || loading}
          >
            <Sparkles size={20} /> 
            {loading ? 'Wird gesendet...' : 'Benachrichtige mich!'}
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

      {stories.length > 0 && (
        <div className="waitlist-stories-hint">
          <p>In der Zwischenzeit — hör doch mal rein:</p>
          <div className="story-grid">
            {stories.slice(0, 3).map(s => (
              <div key={s.id} className="story-card" onClick={() => onPlayStory(s)}>
                <div className="story-icon-row">
                  <Music size={20} />
                  <Headphones size={20} />
                </div>
                <h3>{s.title}</h3>
                <p className="story-prompt">{s.summary || s.prompt}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  )
}