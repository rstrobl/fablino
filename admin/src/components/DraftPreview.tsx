import { useState, useEffect } from 'react';
import { Loader2, Check, Volume2 } from 'lucide-react';
import { fetchVoices } from '../api';
import { TwemojiIcon } from '../charEmoji';
import { VoicePicker } from './VoicePicker';
import { getAuth } from '../utils/auth';

interface ReviewSuggestion {
  type: 'replace' | 'delete' | 'insert';
  scene: number;
  lineIndex: number;
  reason: string;
  original?: string;
  replacement?: string;
  speaker?: string;
}

interface ReviewResult {
  overallRating: 'gut' | 'okay' | 'überarbeiten';
  summary: string;
  suggestions: ReviewSuggestion[];
}

export function DraftPreview({ story, onDone, mode = 'draft' }: { story: any; onDone: () => void; mode?: 'draft' | 'readonly' }) {
  const [phase, setPhase] = useState<'preview' | 'reviewing' | 'reviewed' | 'producing' | 'done' | 'error'>('preview');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const { script, voiceMap } = (story as any).scriptData || {};
  const [allVoices, setAllVoices] = useState<any[]>([]);
  const [pickerChar, setPickerChar] = useState<string | null>(null);
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState(story.prompt || '');
  const [regenSideChars, setRegenSideChars] = useState<Array<{ name: string; role: string }>>(
    (story as any).scriptData?.userCharacters?.sideCharacters || []
  );

  const getSideChars = () => {
    return (story as any).scriptData?.userCharacters?.sideCharacters || [];
  };
  const [coverUrl, setCoverUrl] = useState(story.coverUrl || '');
  const [coverLoading, setCoverLoading] = useState(false);

  useEffect(() => {
    if (!voiceMap) return;
    fetchVoices().then(setAllVoices).catch(() => {});
  }, [voiceMap]);

  const getVoiceName = (charName: string) => {
    const voiceId = voiceMap?.[charName];
    if (!voiceId) return null;
    return allVoices.find((v: any) => v.voice_id === voiceId)?.name || null;
  };

  const handleVoiceChange = async (charName: string, voiceId: string) => {
    const newMap = { ...voiceMap, [charName]: voiceId };
    // Update in DB
    try {
      await fetch(`/api/stories/${story.id}/voice-map`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceMap: newMap }),
      });
      // Update local scriptData
      (story as any).scriptData.voiceMap = newMap;
    } catch {}
    setPickerChar(null);
  };

  const pollStatus = async (jobId: string) => {
    for (;;) {
      await new Promise(r => setTimeout(r, 2000));
      const res = await fetch(`/api/generate/status/${jobId}`, { headers: { Authorization: getAuth() } });
      const data = await res.json();
      if (data.progress) setProgress(data.progress);
      if (data.status === 'done') return data;
      if (data.status === 'error') throw new Error(data.error || 'Fehler bei der Audio-Generierung');
    }
  };

  const handleReview = async () => {
    setPhase('reviewing');
    try {
      const res = await fetch(`/api/generate/${story.id}/review`, { method: 'POST', headers: { Authorization: getAuth() } });
      if (!res.ok) throw new Error('Review fehlgeschlagen');
      const data = await res.json();
      setReview(data);
      setAccepted(new Set(data.suggestions.map((_: any, i: number) => i)));
      setPhase('reviewed');
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handleApplyReview = async () => {
    if (!review) return;
    const selected = review.suggestions.filter((_, i) => accepted.has(i));
    if (selected.length === 0) { setPhase('preview'); setReview(null); return; }
    setPhase('producing');
    setProgress('Änderungen werden übernommen...');
    try {
      const res = await fetch(`/api/generate/${story.id}/apply-review`, {
        method: 'POST',
        headers: { Authorization: getAuth(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions: selected }),
      });
      if (!res.ok) throw new Error('Änderungen konnten nicht übernommen werden');
      setReview(null);
      setPhase('preview');
      onDone();
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handleConfirm = async () => {
    setPhase('producing');
    setProgress('Audio wird generiert...');
    try {
      const res = await fetch(`/api/generate/${story.id}/confirm`, { method: 'POST', headers: { Authorization: getAuth() } });
      if (!res.ok) throw new Error('Bestätigung fehlgeschlagen');
      await pollStatus(story.id);
      setPhase('done');
      onDone();
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  const toggleSuggestion = (i: number) => {
    setAccepted(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  if (phase === 'reviewing') {
    return (
      <div className="bg-surface border border-blue-500/30 rounded-xl p-8 text-center space-y-3">
        <Loader2 size={24} className="animate-spin mx-auto text-blue-400" />
        <p className="text-sm">Claude überprüft das Skript...</p>
        <p className="text-xs text-text-muted">Das kann 15-30 Sekunden dauern</p>
      </div>
    );
  }

  if (phase === 'reviewed' && review) {
    const ratingColors: Record<string, string> = {
      'gut': 'bg-green-500/20 text-green-400',
      'okay': 'bg-yellow-500/20 text-yellow-400',
      'überarbeiten': 'bg-red-500/20 text-red-400',
    };
    const typeLabels: Record<string, { label: string; color: string }> = {
      'replace': { label: 'Ersetzen', color: 'bg-blue-500/20 text-blue-400' },
      'delete': { label: 'Löschen', color: 'bg-red-500/20 text-red-400' },
      'insert': { label: 'Einfügen', color: 'bg-green-500/20 text-green-400' },
    };

    return (
      <div className="bg-surface border border-blue-500/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">🔍 Skript-Review</h3>
          <span className={`text-xs px-2 py-1 rounded font-medium ${ratingColors[review.overallRating] || ''}`}>
            {review.overallRating === 'gut' ? '✅ Gut' : review.overallRating === 'okay' ? '⚠️ Okay' : '🔄 Überarbeiten'}
          </span>
        </div>

        <p className="text-sm text-text-muted">{review.summary}</p>

        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {review.suggestions.map((s, i) => (
            <div
              key={i}
              className={`rounded-lg p-3 border cursor-pointer transition-colors ${accepted.has(i) ? 'bg-blue-500/5 border-blue-500/30' : 'bg-gray-900/30 border-border opacity-60'}`}
              onClick={() => toggleSuggestion(i)}
            >
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={accepted.has(i)} onChange={() => toggleSuggestion(i)} className="mt-1 accent-blue-500" />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${typeLabels[s.type]?.color || ''}`}>{typeLabels[s.type]?.label}</span>
                    <span className="text-xs text-text-muted">Szene {s.scene + 1}, Zeile {s.lineIndex + 1}</span>
                  </div>
                  <p className="text-xs text-text-muted">{s.reason}</p>
                  {s.original && (
                    <div className="text-sm">
                      <span className="text-red-400 line-through">{s.original}</span>
                    </div>
                  )}
                  {s.replacement && (
                    <div className="text-sm">
                      <span className="text-green-400">{s.speaker ? `${s.speaker}: ` : ''}{s.replacement}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleApplyReview}
            disabled={accepted.size === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Check size={16} /> {accepted.size} Änderung{accepted.size !== 1 ? 'en' : ''} übernehmen
          </button>
          <button
            onClick={() => { setPhase('preview'); setReview(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors"
          >
            Verwerfen
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'producing') {
    return (
      <div className="bg-surface border border-brand/30 rounded-xl p-8 text-center space-y-3">
        <Loader2 size={24} className="animate-spin mx-auto text-brand" />
        <p className="text-sm">{progress}</p>
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="bg-surface border border-green-500/30 rounded-xl p-8 text-center space-y-3">
        <Check size={32} className="text-green-500 mx-auto" />
        <p className="font-medium">Hörbuch erfolgreich generiert!</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="bg-surface border border-red-500/30 rounded-xl p-6 space-y-3">
        <p className="text-red-400 font-medium">Fehler</p>
        <p className="text-sm text-text-muted">{error}</p>
        <button onClick={() => setPhase('preview')} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover">
          Nochmal versuchen
        </button>
      </div>
    );
  }

  if (!script) return null;

  return (
    <div className="bg-surface border border-brand/30 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">📝 {mode === 'draft' ? 'Skript-Vorschau' : 'Skript'}</h3>
        {mode === 'draft' && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Entwurf</span>}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <h4 className="text-sm font-medium mb-2">Charaktere & Stimmen {mode === 'draft' && <span className="text-text-muted">(klicken zum Ändern)</span>}</h4>
        <div className="flex gap-2 flex-wrap">
          {script.characters?.map((c: any) => (
            <button
              key={c.name}
              onClick={() => mode === 'draft' && setPickerChar(c.name)}
              className={`px-3 py-1.5 bg-gray-800 border border-border rounded-full text-xs flex items-center gap-1.5 transition-colors ${mode === 'draft' ? 'hover:border-brand/50 cursor-pointer' : 'cursor-default'}`}
            >
              <TwemojiIcon emoji={c.emoji || '✨'} size={16} />
              <span>{c.name}</span>
              {getVoiceName(c.name) && <span className="text-text-muted">({getVoiceName(c.name)})</span>}
              <Volume2 size={12} className="text-text-muted" />
            </button>
          ))}
        </div>

        {pickerChar && voiceMap && (
          <VoicePicker
            characterName={pickerChar}
            currentVoiceId={voiceMap[pickerChar] || ''}
            category={(() => {
              const c = script.characters?.find((c: any) => c.name === pickerChar);
              if (!c) return 'adult_m';
              const g = c.gender === 'female' ? 'f' : 'm';
              if (c.species === 'animal' || c.species === 'creature') return `creature_${g}`;
              if (c.age <= 12) return `child_${g}`;
              if (c.age >= 60) return `elder_${g}`;
              return `adult_${g}`;
            })()}
            voices={allVoices}
            onSelect={(voiceId) => handleVoiceChange(pickerChar, voiceId)}
            onClose={() => setPickerChar(null)}
          />
        )}
        </div>
      </div>

      {mode === 'draft' && (story.prompt || story.interests) && (
        <div className="bg-gray-900/50 rounded-lg p-3">
          <p className="text-xs text-text-muted mb-1">Prompt</p>
          <p className="text-sm">{story.prompt}</p>
          {story.interests && story.interests !== story.prompt && (
            <>
              <p className="text-xs text-text-muted mb-1 mt-2">Interessen</p>
              <p className="text-sm">{story.interests}</p>
            </>
          )}
        </div>
      )}

      <div className="flex gap-4 text-xs text-text-muted">
        <span>{script.scenes?.length} Szenen</span>
        <span>{script.scenes?.reduce((t: number, s: any) => t + (s.lines?.length || 0), 0)} Zeilen</span>
        <span>{script.characters?.filter((c: any) => c.name !== 'Erzähler').length} Charaktere</span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {script.scenes?.map((scene: any, si: number) => (
          <div key={si} className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-xs text-text-muted mb-2">Szene {si + 1}</p>
            {scene.lines?.map((line: any, li: number) => (
              line.sfx ? (
                <div key={li} className="mb-1 flex items-center gap-1.5 text-xs text-yellow-400/80 italic">
                  <span>🔊</span>
                  <span>{line.sfx}</span>
                  <span className="text-text-muted">({line.duration}s)</span>
                </div>
              ) : (
                <div key={li} className="mb-1">
                  <span className="text-brand font-medium text-sm"><TwemojiIcon emoji={script.characters?.find((c: any) => c.name === line.speaker)?.emoji || '✨'} size={14} /> {line.speaker}:</span>{' '}
                  {line.emotion && line.emotion !== 'neutral' && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 rounded px-1 py-0.5 mr-1">{line.emotion}</span>
                  )}
                  <span className="text-sm">{line.text}</span>
                </div>
              )
            ))}
          </div>
        ))}
      </div>

      {mode === 'draft' && showRegenModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowRegenModal(false)}>
          <div className="bg-surface border border-border rounded-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">🔄 Neu generieren</h3>
            <label className="text-sm text-text-muted mb-1 block">Interessen / Prompt</label>
            <textarea
              value={regenPrompt}
              onChange={e => setRegenPrompt(e.target.value)}
              rows={3}
              className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-brand"
              placeholder="z.B. Minecraft, Zeitreisen, Technik"
            />
            <label className="text-sm text-text-muted mb-1 block">Nebencharaktere</label>
            <div className="space-y-2 mb-3">
              {regenSideChars.map((c, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input
                    value={c.name}
                    onChange={e => { const next = [...regenSideChars]; next[i] = { ...next[i], name: e.target.value }; setRegenSideChars(next); }}
                    placeholder="Name"
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand"
                  />
                  <input
                    value={c.role}
                    onChange={e => { const next = [...regenSideChars]; next[i] = { ...next[i], role: e.target.value }; setRegenSideChars(next); }}
                    placeholder="Rolle (z.B. große Schwester, Hund)"
                    className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand"
                  />
                  <button
                    onClick={() => setRegenSideChars(regenSideChars.filter((_, j) => j !== i))}
                    className="text-red-400 hover:text-red-300 text-sm px-2"
                  >✕</button>
                </div>
              ))}
              <button
                onClick={() => setRegenSideChars([...regenSideChars, { name: '', role: '' }])}
                className="text-xs text-brand hover:text-green-400 transition-colors"
              >+ Charakter hinzufügen</button>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowRegenModal(false)}
                className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-surface-hover transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={async () => {
                  setShowRegenModal(false);
                  setPhase('producing');
                  setProgress('Skript wird neu generiert...');
                  try {
                    const res = await fetch(`/api/generate/${story.id}/regenerate`, {
                      method: 'POST',
                      headers: { Authorization: getAuth(), 'Content-Type': 'application/json' },
                      body: JSON.stringify({ 
                        prompt: regenPrompt || undefined,
                        characters: {
                          sideCharacters: regenSideChars.filter(c => c.name.trim()),
                        },
                      }),
                    });
                    if (!res.ok) throw new Error('Neu-Generierung fehlgeschlagen');
                    for (;;) {
                      await new Promise(r => setTimeout(r, 2000));
                      const s = await fetch(`/api/generate/status/${story.id}`, { headers: { Authorization: getAuth() } });
                      const data = await s.json();
                      if (data.progress) setProgress(data.progress);
                      if (data.status === 'preview') { onDone(); setPhase('preview'); break; }
                      if (data.status === 'error') throw new Error(data.error || 'Fehler bei der Generierung');
                    }
                  } catch (err: any) {
                    setError(err.message);
                    setPhase('error');
                  }
                }}
                className="px-4 py-2 text-sm rounded-lg bg-brand hover:bg-green-700 text-white font-medium transition-colors"
              >
                Generieren
              </button>
            </div>
          </div>
        </div>
      )}
      {mode === 'draft' && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={() => { 
              setRegenPrompt(story.interests || story.prompt || ''); 
              setRegenSideChars(getSideChars());
              setShowRegenModal(true); 
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border hover:bg-surface-hover rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Neu generieren
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Check size={16} /> Skript bestätigen & Audio generieren
          </button>
        </div>
      )}
    </div>
  );
}
