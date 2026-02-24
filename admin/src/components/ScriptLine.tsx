import { useState, useEffect } from 'react';
import { Play, Pause, Wand2, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import { TwemojiIcon } from '../charEmoji';

// Global audio ref so only one line plays at a time
let globalLineAudio: HTMLAudioElement | null = null;
let globalLineStop: (() => void) | null = null;

export function ScriptLine({ line, story, voiceSettings, onUpdated }: { line: any; story: any; voiceSettings: Record<string, any>; onUpdated: () => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [regenerating, setRegenerating] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);

  const matchChar = story.characters?.find((c: any) => c.name === line.speaker || c.name?.includes(line.speaker) || line.speaker?.includes(c.name));
  const voiceId = matchChar?.voiceId || '';
  const vs = voiceSettings[voiceId] || { stability: 0.35, similarity_boost: 0.75, style: 0.6, use_speaker_boost: false };
  const [stability, setStability] = useState(vs.stability);
  const [similarity, setSimilarity] = useState(vs.similarity_boost);
  const [style, setStyle] = useState(vs.style);
  const [boost, setBoost] = useState(vs.use_speaker_boost);

  // Sync voice settings when voices finish loading (initial useState may use fallback)
  useEffect(() => {
    if (voiceSettings[voiceId]) {
      const v = voiceSettings[voiceId];
      setStability(v.stability);
      setSimilarity(v.similarity_boost);
      setStyle(v.style);
      setBoost(v.use_speaker_boost);
    }
  }, [voiceId, voiceSettings[voiceId]?.use_speaker_boost]);
  const gender = matchChar?.gender || '';

  const stopGlobal = () => {
    if (globalLineAudio) { globalLineAudio.pause(); globalLineAudio = null; }
    if (globalLineStop) { globalLineStop(); globalLineStop = null; }
  };

  const playAudio = (url: string) => {
    stopGlobal();
    const audio = new Audio(url);
    globalLineAudio = audio;
    globalLineStop = () => setState('idle');
    audio.onended = () => { setState('idle'); globalLineAudio = null; globalLineStop = null; };
    audio.play();
    setState('playing');
  };

  const playLine = async () => {
    if (state === 'playing') {
      stopGlobal();
      setState('idle');
      return;
    }
    if (cachedUrl) {
      playAudio(cachedUrl);
      return;
    }
    // Play the stored audio file (no re-generation)
    if (line.audioPath) {
      stopGlobal();
      setState('loading');
      // Extract line index from audioPath like "audio/lines/xxx/line_5.mp3"
      const match = line.audioPath.match(/line_(\d+)\.mp3/);
      const lineIdx = match?.[1] || '0';
      const url = `/api/audio/${story.id}/line/${lineIdx}?t=${Date.now()}`;
      playAudio(url);
      return;
    }
    setState('idle');
  };

  const regenerate = async () => {
    setRegenerating(true);
    try {
      stopGlobal();
      const res = await fetch('/api/generate/preview-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: line.text, voiceId,
          voiceSettings: { stability, similarity_boost: similarity, style, use_speaker_boost: boost },
        }),
      });
      if (!res.ok) throw new Error('Fehler');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (cachedUrl) URL.revokeObjectURL(cachedUrl);
      setCachedUrl(url);
      playAudio(url);
    } catch {
      // ignore
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="group relative flex items-start gap-2 hover:bg-gray-900/30 rounded px-2 py-1 -mx-2">
      <div className="flex-1">
        <span className="text-brand font-medium text-sm">
          <TwemojiIcon emoji={story.characters?.find((c: any) => c.name === line.speaker)?.emoji || '✨'} size={14} /> {line.speaker}:
        </span>{' '}
        <span className="text-sm">{line.text}</span>
      </div>
      <div className={`flex items-center gap-1 transition-opacity shrink-0 ${state !== 'idle' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <button
          onClick={playLine}
          className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-brand transition-colors"
          title="Vorhören"
        >
          {state === 'loading' ? <Loader2 size={14} className="animate-spin" /> : state === 'playing' ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-brand transition-colors"
          title="Voice Settings"
        >
          <Wand2 size={14} />
        </button>
      </div>
      {showSettings && (
        <div className="absolute right-0 top-full mt-1 bg-surface border border-border rounded-lg p-3 shadow-lg z-10 space-y-2 w-64">
          <div className="flex items-center justify-between text-xs">
            <span>Stability</span>
            <input type="range" min="0" max="1" step="0.05" value={stability} onChange={e => setStability(+e.target.value)} className="w-32" />
            <span className="w-8 text-right">{stability}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Similarity</span>
            <input type="range" min="0" max="1" step="0.05" value={similarity} onChange={e => setSimilarity(+e.target.value)} className="w-32" />
            <span className="w-8 text-right">{similarity}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>Style</span>
            <input type="range" min="0" max="1" step="0.05" value={style} onChange={e => setStyle(+e.target.value)} className="w-32" />
            <span className="w-8 text-right">{style}</span>
          </div>
          <label className="flex items-center gap-2 text-xs text-text-muted">
            <input type="checkbox" checked={boost} onChange={e => setBoost(e.target.checked)} />
            Speaker Boost
          </label>
          <div className="flex gap-2">
            <button
              onClick={regenerate}
              disabled={regenerating || replacing}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-surface-hover hover:bg-brand/15 border border-border text-text rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              {regenerating ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
              Vorhören
            </button>
            <button
              onClick={async () => {
                if (!line.id || !story.id) return;
                setReplacing(true);
                try {
                  const res = await fetch('/api/generate/replace-line', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      storyId: story.id,
                      lineId: line.id,
                      voiceId,
                      text: line.text,
                      voiceSettings: { stability, similarity_boost: similarity, style, use_speaker_boost: boost },
                    }),
                  });
                  if (!res.ok) throw new Error('Replace failed');
                  toast.success('Zeile ersetzt & Hörspiel neu gemischt');
                  // Bust audio cache
                  setCachedUrl(null);
                } catch { toast.error('Fehler beim Ersetzen'); }
                finally { setReplacing(false); }
              }}
              disabled={replacing || regenerating}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-brand hover:bg-green-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
            >
              {replacing ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
              Ersetzen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
