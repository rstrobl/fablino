import { ChevronLeft } from 'lucide-react'
import { charEmoji, TwemojiIcon } from './CharacterEmoji'
import type { Story } from '../types'

interface ScriptViewProps {
  story: Story
  onBack: () => void
}

export function ScriptView({ story, onBack }: ScriptViewProps) {
  const lines = story.lines || []

  return (
    <main className="player">
      <button className="back-btn" onClick={onBack}>
        <ChevronLeft size={18} /> Zurück
      </button>

      <h2>{story.title}</h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        Skript — {lines.length} Zeilen
      </p>

      <div className="characters" style={{ marginBottom: '1.5rem' }}>
        {story.characters.filter(c => c.name !== 'Erzähler').map((c, i) => (
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

      <button className="back-btn" onClick={onBack} style={{ marginTop: '1.5rem' }}>
        <ChevronLeft size={18} /> Zurück zum Player
      </button>
    </main>
  )
}