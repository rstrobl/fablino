import { useState, useEffect } from 'react';
import { Loader2, Check, Volume2, Trash2 } from 'lucide-react';
import { fetchVoices } from '../api';
import { TwemojiIcon } from '../charEmoji';
import { VoicePicker } from './VoicePicker';
import { PipelineLog } from './PipelineLog';
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

export function DraftPreview({ story, onDone, mode = 'draft', onDelete }: { story: any; onDone: () => void; mode?: 'draft' | 'readonly'; onDelete?: () => void }) {
  const [phase, setPhase] = useState<'preview' | 'reviewing' | 'reviewed' | 'producing' | 'done' | 'error' | 'lector' | 'lector-result' | 'lector-revising' | 'tts-optimizing'>('preview');
  const [progress, setProgress] = useState('');
  const [livePipelineSteps, setLivePipelineSteps] = useState<any[]>([]);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [review, setReview] = useState<ReviewResult | null>(null);
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [lectorReview, setLectorReview] = useState<any>(null);
  const [lectorInstructions, setLectorInstructions] = useState('');
  const { script, voiceMap } = (story as any).scriptData || {};
  const [allVoices, setAllVoices] = useState<any[]>([]);
  const [pickerChar, setPickerChar] = useState<string | null>(null);
  const [_showRegenModal, _setShowRegenModal] = useState(false);
  const [regenPrompt, setRegenPrompt] = useState(story.prompt || '');
  const [regenSideChars, setRegenSideChars] = useState<Array<{ name: string; role: string }>>(() => {
    const userChars = (story as any).scriptData?.userCharacters?.sideCharacters;
    if (userChars?.length) return userChars;
    // Fallback: extract from script characters (exclude Erzähler)
    const scriptChars = (story as any).scriptData?.script?.characters || [];
    return scriptChars
      .filter((c: any) => c.name !== 'Erzähler')
      .map((c: any) => ({ name: c.name, role: c.description || '' }));
  });

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
      if (data.status === 'error') throw new Error(data.error || 'Fehler beim Vertonen');
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

  const handleLectorReview = async () => {
    setPhase('lector');
    setProgress('Claude führt Lektorat durch...');
    try {
      const res = await fetch(`/api/generate/${story.id}/lector`, { 
        method: 'POST', 
        headers: { Authorization: getAuth() } 
      });
      if (!res.ok) throw new Error('Lektorat fehlgeschlagen');
      const data = await res.json();
      setLectorReview(data.review);
      setPhase('lector-result');
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handleLectorRevision = async () => {
    if (!lectorInstructions.trim()) {
      setError('Bitte geben Sie Anweisungen für die Überarbeitung ein.');
      return;
    }
    setPhase('lector-revising');
    setProgress('Skript wird überarbeitet...');
    try {
      const res = await fetch(`/api/generate/${story.id}/lector-revise`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: getAuth() 
        },
        body: JSON.stringify({ instructions: lectorInstructions }),
      });
      if (!res.ok) throw new Error('Überarbeitung fehlgeschlagen');
      setLectorReview(null);
      setLectorInstructions('');
      setPhase('preview');
      onDone(); // Refresh to show updated script
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handleTtsOptimization = async () => {
    setPhase('tts-optimizing');
    setProgress('TTS-Optimierung läuft...');
    try {
      const res = await fetch(`/api/generate/${story.id}/tts-optimize`, { 
        method: 'POST', 
        headers: { Authorization: getAuth() } 
      });
      if (!res.ok) throw new Error('TTS-Optimierung fehlgeschlagen');
      setPhase('preview');
      onDone(); // Refresh to show updated script
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handleConfirm = async () => {
    setPhase('producing');
    setProgress('Wird vertont...');
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

  if (phase === 'lector') {
    return (
      <div className="bg-surface border border-blue-500/30 rounded-xl p-8 text-center space-y-3">
        <Loader2 size={24} className="animate-spin mx-auto text-blue-400" />
        <p className="text-sm">📝 Claude führt Lektorat durch...</p>
        <p className="text-xs text-text-muted">Das kann 15-30 Sekunden dauern</p>
      </div>
    );
  }

  if (phase === 'lector-revising') {
    return (
      <div className="bg-surface border border-blue-500/30 rounded-xl p-8 text-center space-y-3">
        <Loader2 size={24} className="animate-spin mx-auto text-blue-400" />
        <p className="text-sm">✏️ Skript wird überarbeitet...</p>
        <p className="text-xs text-text-muted">Das kann 30-60 Sekunden dauern</p>
      </div>
    );
  }

  if (phase === 'tts-optimizing') {
    return (
      <div className="bg-surface border border-green-500/30 rounded-xl p-8 text-center space-y-3">
        <Loader2 size={24} className="animate-spin mx-auto text-green-400" />
        <p className="text-sm">🎙️ TTS-Optimierung läuft...</p>
        <p className="text-xs text-text-muted">Audio-Tags und Emotionen werden optimiert...</p>
      </div>
    );
  }

  if (phase === 'lector-result' && lectorReview) {
    const ratingColors: Record<string, string> = {
      'true': 'bg-green-500/20 text-green-400 border-green-500/30',
      'false': 'bg-red-500/20 text-red-400 border-red-500/30',
    };

    return (
      <div className="bg-surface border border-blue-500/30 rounded-xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">📝 Lektorat-Ergebnis</h3>
          <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${ratingColors[String(lectorReview.approved)] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'}`}>
            {lectorReview.approved ? '✅ Freigegeben' : '❌ Überarbeitung empfohlen'}
          </span>
        </div>

        {lectorReview.severity && (
          <div className={`text-xs px-2 py-1 rounded ${lectorReview.severity === 'critical' ? 'bg-red-500/20 text-red-400' : lectorReview.severity === 'major' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
            Schweregrad: {lectorReview.severity}
          </div>
        )}

        <div className="bg-gray-900/50 rounded-lg p-4 max-h-96 overflow-y-auto">
          <h4 className="text-sm font-medium mb-2">Feedback:</h4>
          <p className="text-sm whitespace-pre-wrap">{lectorReview.feedback}</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Anweisungen für die Überarbeitung:</label>
          <textarea
            value={lectorInstructions}
            onChange={(e) => setLectorInstructions(e.target.value)}
            rows={4}
            placeholder="z.B. 'Mache die Geschichte lustiger' oder 'Füge mehr Dialog hinzu' oder 'Behebe die im Feedback genannten Probleme'"
            className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleLectorRevision}
            disabled={!lectorInstructions.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
          >
            ✏️ Überarbeiten
          </button>
          <button
            onClick={() => { setPhase('preview'); setLectorReview(null); setLectorInstructions(''); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

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
      <div className="space-y-4">
        <div className="bg-surface border border-brand/30 rounded-xl p-8 text-center space-y-3">
          <Loader2 size={24} className="animate-spin mx-auto text-brand" />
          <p className="text-sm font-medium">{progress}</p>
        </div>
        {(livePipelineSteps.length > 0 || activeStep) && (
          <PipelineLog pipeline={{ steps: livePipelineSteps, totalTokens: livePipelineSteps.reduce((t: any, s: any) => ({ input: t.input + (s.tokens?.input || 0), output: t.output + (s.tokens?.output || 0) }), { input: 0, output: 0 }) }} activeStep={activeStep} />
        )}
      </div>
    );
  }

  if (phase === 'done') {
    return (
      <div className="bg-surface border border-green-500/30 rounded-xl p-8 text-center space-y-3">
        <Check size={32} className="text-green-500 mx-auto" />
        <p className="font-medium">Hörbuch erfolgreich vertont!</p>
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

  // Helper function to get pipeline status from scriptData
  const getPipelineStatus = () => {
    const pipeline = (story as any).scriptData?.pipeline;
    const steps = pipeline?.steps || [];
    
    // Extract completed step types
    const completedSteps = new Set(steps.map((step: any) => step.agent));
    
    return {
      author: completedSteps.has('author') || completedSteps.has('adapter'),
      lector: completedSteps.has('lector') || completedSteps.has('reviewer'),
      tts: completedSteps.has('tts'),
      produced: story.status === 'produced' || story.status === 'published'
    };
  };

  const pipelineStatus = getPipelineStatus();

  if (!script) return null;

  return (
    <div className="bg-surface border border-brand/30 rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">📝 {mode === 'draft' ? 'Skript-Vorschau' : 'Skript'}</h3>
        {mode === 'draft' && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Entwurf</span>}
      </div>

      {/* Pipeline Status */}
      {mode === 'draft' && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-text-muted">Pipeline:</span>
          <div className="flex items-center gap-1">
            <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${pipelineStatus.author ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {pipelineStatus.author ? '✅' : '⬜'} Autor
            </span>
            <span className="text-gray-400">→</span>
            <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${pipelineStatus.lector ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {pipelineStatus.lector ? '✅' : '⬜'} Lektorat
            </span>
            <span className="text-gray-400">→</span>
            <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${pipelineStatus.tts ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {pipelineStatus.tts ? '✅' : '⬜'} TTS
            </span>
            <span className="text-gray-400">→</span>
            <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${pipelineStatus.produced ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
              {pipelineStatus.produced ? '✅' : '⬜'} Vertont
            </span>
          </div>
        </div>
      )}

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
                  <TwemojiIcon emoji="🔊" size={14} />
                  <span>{line.sfx}</span>
                </div>
              ) : (
                <div key={li} className="mb-1">
                  <span className="text-brand font-medium text-sm"><TwemojiIcon emoji={script.characters?.find((c: any) => c.name === line.speaker)?.emoji || '✨'} size={14} /> {line.speaker}:</span>{' '}
                  {line.emotion && line.emotion !== 'neutral' && (
                    <span className="text-[10px] bg-purple-500/20 text-purple-300 rounded px-1 py-0.5 mr-1">{line.emotion}</span>
                  )}
                  <span className="text-sm">{line.text.split(/(\[[^\]]+\])/).map((part: string, i: number) =>
                    /^\[.+\]$/.test(part)
                      ? <span key={i} className="text-[10px] bg-blue-500/20 text-blue-300 rounded px-1 py-0.5 mx-0.5">{part.slice(1, -1)}</span>
                      : part
                  )}</span>
                </div>
              )
            ))}
          </div>
        ))}
      </div>

      {mode === 'draft' && (
        <div className="flex gap-3 pt-2">
          <button
            onClick={async () => {
              if (!confirm('Skript verwerfen und neu generieren?')) return;
              await fetch(`/api/stories/${story.id}/reset-script`, {
                method: 'PATCH',
                headers: { Authorization: getAuth() },
              });
              onDone();
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-surface border border-border hover:bg-surface-hover rounded-lg text-sm font-medium transition-colors"
          >
            🔄 Neu generieren
          </button>
          <button
            onClick={handleLectorReview}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            📝 Lektorat
          </button>
          <button
            onClick={handleTtsOptimization}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            🎙️ TTS-Optimierung
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Check size={16} /> Skript bestätigen & vertonen
          </button>
          {onDelete && (
            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400 hover:bg-red-900/50 transition-colors font-medium ml-auto"
            >
              <Trash2 size={16} /> Löschen
            </button>
          )}
        </div>
      )}
    </div>
  );
}
