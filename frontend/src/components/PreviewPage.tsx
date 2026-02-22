import { BookOpen, ChevronLeft, Sparkles } from 'lucide-react'
import { charEmoji, TwemojiIcon } from './CharacterEmoji'
import type { ScriptPreview } from '../types'

interface PreviewPageProps {
  script: ScriptPreview
  onConfirm: () => void
  onCancel: () => void
  confirming: boolean
}

export function PreviewPage({ script, onConfirm, onCancel, confirming }: PreviewPageProps) {
  const totalLines = script.scenes.reduce((sum, s) => sum + s.lines.length, 0)

  return (
    <main className="preview">
      <button className="back-btn" onClick={onCancel}>
        <ChevronLeft size={18} /> Verwerfen
      </button>

      <div className="preview-header">
        <BookOpen size={24} />
        <h2>Skript-Vorschau</h2>
      </div>

      <h3 className="preview-title">{script.title}</h3>

      <div className="preview-meta">
        <span className="preview-stat">{script.characters.length} Charaktere</span>
        <span className="preview-stat">{script.scenes.length} Szenen</span>
        <span className="preview-stat">{totalLines} Zeilen</span>
      </div>

      <div className="preview-characters">
        {script.characters.filter(c => c.name !== 'Erzähler').map((c, i) => (
          <span key={c.name} className="char-badge">
            <TwemojiIcon emoji={charEmoji(c.name, c.gender, i)} size={18} /> {c.name}
          </span>
        ))}
      </div>

      <div className="preview-scenes">
        {script.scenes.map((scene, si) => (
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
        <button className="generate-btn" onClick={onConfirm} disabled={confirming}>
          <Sparkles size={20} /> Hörspiel generieren!
        </button>
        <button className="back-btn-secondary" onClick={onCancel}>
          Verwerfen & neu schreiben
        </button>
      </div>
    </main>
  )
}