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
    <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50">
      <div className="flex items-center px-3 md:px-5 gap-2 md:gap-4 h-14 md:h-16">
        <button onClick={togglePlay} className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-brand flex items-center justify-center hover:bg-brand-light transition-colors shrink-0">
          {isPlaying ? <Pause size={16} className="text-white" /> : <Play size={16} className="text-white ml-0.5" />}
        </button>
        <div className="min-w-0 flex-1 md:flex-none md:w-48">
          <p className="text-xs md:text-sm font-medium truncate">{title}</p>
        </div>
        <span className="text-xs text-text-muted w-8 md:w-10 text-right hidden sm:block">{fmt(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          className="flex-1 h-1 accent-brand hidden sm:block"
        />
        <span className="text-xs text-text-muted w-8 md:w-10 hidden sm:block">{fmt(duration)}</span>
        <div className="hidden md:flex items-center gap-2">
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
      </div>
      {/* Mobile progress bar */}
      <div className="sm:hidden px-3 pb-2 flex items-center gap-2">
        <span className="text-[10px] text-text-muted w-8">{fmt(currentTime)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={currentTime}
          onChange={(e) => seek(Number(e.target.value))}
          className="flex-1 h-1 accent-brand"
        />
        <span className="text-[10px] text-text-muted w-8">{fmt(duration)}</span>
      </div>
    </div>
  );
}
