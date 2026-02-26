import { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Check, X } from 'lucide-react';

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  preview_url?: string;
  traits?: string[];
}

interface Props {
  characterName: string;
  currentVoiceId: string;
  category: string; // gender/category to filter
  voices: Voice[];
  onSelect: (voiceId: string) => void;
  onClose: () => void;
}

const CATEGORY_MAP: Record<string, string[]> = {
  child_m: ['child_m'],
  child_f: ['child_f'],
  adult_m: ['adult_m'],
  adult_f: ['adult_f'],
  elder_m: ['elder_m'],
  elder_f: ['elder_f'],
  creature_m: ['creature_m'],
  creature_f: ['creature_f'],
  // Legacy support
  creature: ['creature_m', 'creature_f'],
};

export function VoicePicker({ characterName, currentVoiceId, category, voices, onSelect, onClose }: Props) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Show matching category first, then all others
  const matchingCategories = CATEGORY_MAP[category] || [category];
  const matching = voices.filter(v => matchingCategories.includes(v.category));
  const others = voices.filter(v => !matchingCategories.includes(v.category));
  const filtered = [...matching, ...others];
  const matchingCount = matching.length;

  const playPreview = async (voice: Voice) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    if (playingId === voice.voice_id) { setPlayingId(null); return; }
    setPlayingId(voice.voice_id);
    try {
      // Use backend preview endpoint (generates on-demand via ElevenLabs)
      const res = await fetch(`/api/voices/${voice.voice_id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: sessionStorage.getItem('fablino_auth') || '' },
        body: JSON.stringify({ text: `Hallo! Ich bin ${voice.name}. Ich erzähle dir eine Geschichte!` }),
      });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setPlayingId(null);
      audio.play();
      audioRef.current = audio;
    } catch {
      setPlayingId(null);
    }
  };

  useEffect(() => {
    return () => { if (audioRef.current) audioRef.current.pause(); };
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-surface border border-border rounded-xl p-4 max-w-md w-full max-h-[70vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Stimme für {characterName}</h3>
          <button onClick={onClose} className="p-1 hover:bg-surface-hover rounded"><X size={16} /></button>
        </div>
        
        <div className="overflow-y-auto space-y-1 flex-1">
          {filtered.map((voice, idx) => (
            <>{idx === matchingCount && matchingCount > 0 && others.length > 0 && (
              <div className="border-t border-border my-2 pt-2">
                <span className="text-xs text-text-muted">Weitere Stimmen</span>
              </div>
            )}
            <div
              key={voice.voice_id}
              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                voice.voice_id === currentVoiceId ? 'bg-brand/20 border border-brand/40' : 'hover:bg-surface-hover'
              }`}
              onClick={() => onSelect(voice.voice_id)}
            >
              <button
                onClick={(e) => { e.stopPropagation(); playPreview(voice); }}
                className={`p-1.5 rounded-full transition-colors ${
                  playingId === voice.voice_id ? 'bg-brand text-white animate-pulse' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                {playingId === voice.voice_id ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{voice.name}</div>
                {voice.traits && voice.traits.length > 0 && (
                  <div className="text-xs text-text-muted truncate">{voice.traits.join(', ')}</div>
                )}
              </div>
              
              {voice.voice_id === currentVoiceId && (
                <Check size={16} className="text-brand flex-shrink-0" />
              )}
            </div>
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
