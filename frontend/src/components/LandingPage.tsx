import { useState, useEffect, useRef } from 'react'
import { 
  Headphones, Sparkles, Wand2, Music, Heart, 
  Shuffle, ChevronLeft 
} from 'lucide-react'
import { StoryCard } from './StoryCard'
import { RANDOM_PROMPTS } from '../utils'
import type { Story, View } from '../types'

interface LandingPageProps {
  prompt: string
  setPrompt: (prompt: string) => void
  heroName: string
  setHeroName: (name: string) => void
  heroAge: string
  setHeroAge: (age: string) => void
  stories: Story[]
  storyDurations: Record<string, number>
  onGenerate: () => void
  onPlayStory: (story: Story) => void
  setView: (view: View) => void
}

export function LandingPage({
  prompt, setPrompt, heroName, setHeroName, heroAge, setHeroAge,
  stories, storyDurations, onGenerate, onPlayStory, setView
}: LandingPageProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const heroInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (showAdvanced && heroInputRef.current) {
      heroInputRef.current.focus()
    }
  }, [showAdvanced])

  const randomizePrompt = () => {
    setPrompt(RANDOM_PROMPTS[Math.floor(Math.random() * RANDOM_PROMPTS.length)])
  }

  const canGenerate = prompt.length >= 10

  return (
    <>
      <header onClick={() => setView('home')}>
        <div className="logo">
          <Headphones size={40} />
          <h1>Fablino</h1>
        </div>
        <p className="tagline">Personalisierte Hörspiele, in denen dein Kind die Hauptrolle spielt</p>
      </header>

      <main className="home">
        <div className="generator-card">
          <div className="input-group">
            <label htmlFor="prompt">Worum soll es in deinem Hörspiel gehen?</label>
            <div className="input-with-shuffle">
              <textarea
                id="prompt"
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                placeholder="z.B. Ein magisches Abenteuer im verzauberten Wald..."
                rows={3}
              />
              <button
                className="shuffle-btn"
                onClick={randomizePrompt}
                title="Zufällige Idee"
                type="button"
              >
                <Shuffle size={18} />
              </button>
            </div>
          </div>

          {!showAdvanced ? (
            <button 
              className="advanced-btn" 
              onClick={() => setShowAdvanced(true)}
              type="button"
            >
              Namen und Alter hinzufügen (optional)
            </button>
          ) : (
            <div className="advanced-section">
              <button 
                className="back-btn-inline" 
                onClick={() => setShowAdvanced(false)}
                type="button"
              >
                <ChevronLeft size={16} /> Weniger Optionen
              </button>
              
              <div className="input-row">
                <div className="input-group">
                  <label htmlFor="heroName">Name deines kleinen Helden</label>
                  <input
                    ref={heroInputRef}
                    id="heroName"
                    type="text"
                    value={heroName}
                    onChange={e => setHeroName(e.target.value)}
                    placeholder="z.B. Emma"
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="heroAge">Alter</label>
                  <input
                    id="heroAge"
                    type="number"
                    min="3"
                    max="12"
                    value={heroAge}
                    onChange={e => setHeroAge(e.target.value)}
                    placeholder="5"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            className="generate-btn"
            onClick={onGenerate}
            disabled={!canGenerate}
          >
            <Wand2 size={20} />
            Hörspiel erstellen!
          </button>
          
          <p className="generate-hint">
            {!canGenerate ? 
              'Mindestens 10 Zeichen für eine gute Geschichte' : 
              'Dauert nur ein paar Minuten'
            }
          </p>
        </div>

        {stories.length > 0 && (
          <div className="featured-stories">
            <div className="featured-header">
              <Music size={24} />
              <h2>Beispiel-Hörspiele</h2>
            </div>
            <div className="story-grid">
              {stories.map(s => (
                <StoryCard
                  key={s.id}
                  story={s}
                  duration={storyDurations[s.id]}
                  onPlay={onPlayStory}
                />
              ))}
            </div>
          </div>
        )}

        <div className="footer">
          <span style={{display:'flex',alignItems:'center',gap:'0.3rem'}}>
            Fablino — Magische Hörspiele mit <Heart size={14} /> gemacht
          </span>
          <div className="footer-links">
            <a onClick={() => setView('impressum')}>Impressum</a>
            <a onClick={() => setView('datenschutz')}>Datenschutz</a>
          </div>
        </div>
      </main>
    </>
  )
}