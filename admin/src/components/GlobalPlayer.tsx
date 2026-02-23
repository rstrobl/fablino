import { Play, Pause, Volume2 } from 'lucide-react';
import { useAudio } from '../audioContext';

function fmt(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function GlobalPlayer() {
  const { storyId, title, isPlaying, currentTime, duration, togglePlay, seek, volume, setVolume } = useAudio();
  if (!storyId) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center px-5 gap-4 z-50">
      <button onClick={togglePlay} className="w-10 h-10 rounded-full bg-brand flex items-center justify-center hover:bg-brand-light transition-colors">
        {isPlaying ? <Pause size={18} className="text-white" /> : <Play size={18} className="text-white ml-0.5" />}
      </button>
      <div className="min-w-0 w-48">
        <p className="text-sm font-medium truncate">{title}</p>
      </div>
      <span className="text-xs text-text-muted w-10 text-right">{fmt(currentTime)}</span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        value={currentTime}
        onChange={(e) => seek(Number(e.target.value))}
        className="flex-1 h-1 accent-brand"
      />
      <span className="text-xs text-text-muted w-10">{fmt(duration)}</span>
      <Volume2 size={16} className="text-text-muted" />
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="w-20 h-1 accent-brand"
      />
    </div>
  );
}
