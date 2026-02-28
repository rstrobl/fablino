import { useState, useEffect } from 'react';
import { Loader2, Check, Volume2, Trash2 } from 'lucide-react';
import { fetchVoices } from '../api';
import { TwemojiIcon } from '../charEmoji';
import { VoicePicker } from './VoicePicker';
import { PipelineLog } from './PipelineLog';
import { getAuth } from '../utils/auth';

type Phase = 'idle' | 'lector' | 'lector-result' | 'lector-revising' | 'tts-optimizing' | 'producing' | 'done' | 'error';

export function DraftPreview({ story, onDone, mode = 'draft', onDelete }: { story: any; onDone: () => void; mode?: 'draft' | 'readonly'; onDelete?: () => void }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const [lectorReview, setLectorReview] = useState<any>(null);
  const [lectorInstructions, setLectorInstructions] = useState('');
  const { script, voiceMap, scriptConfirmed } = (story as any).scriptData || {};
  const [allVoices, setAllVoices] = useState<any[]>([]);
  const [pickerChar, setPickerChar] = useState<string | null>(null);
  const [ttsIncludeSfx, setTtsIncludeSfx] = useState<boolean>(true);

  // Load SFX default from settings
  useEffect(() => {
    fetch('/api/settings/claude', { headers: { Authorization: getAuth() } })
      .then(r => r.json())
      .then(s => { if (s.sfxEnabled !== undefined) setTtsIncludeSfx(s.sfxEnabled); })
      .catch(() => {});
  }, []);

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
    try {
      await fetch(`/api/stories/${story.id}/voice-map`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceMap: newMap }),
      });
      (story as any).scriptData.voiceMap = newMap;
    } catch {}
    setPickerChar(null);
  };

  // --- Pipeline state ---
  const isProduced = story.status === 'produced' || story.status === 'published';
  const isPublished = story.status === 'published';
  const isConfirmed = !!scriptConfirmed || isProduced;
  const isDraft = story.status === 'draft';

  // --- Agent actions ---

  const handleLectorReview = async () => {
    setPhase('lector');
    setProgress('Claude führt Lektorat durch...');
    try {
      const res = await fetch(`/api/generate/${story.id}/lector`, {
        method: 'POST',
        headers: { Authorization: getAuth() },
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
      setError('Bitte Anweisungen für die Überarbeitung eingeben.');
      return;
    }
    setPhase('lector-revising');
    setProgress('Skript wird überarbeitet...');
    try {
      const res = await fetch(`/api/generate/${story.id}/lector-revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: getAuth() },
        body: JSON.stringify({ instructions: lectorInstructions }),
      });
      if (!res.ok) throw new Error('Überarbeitung fehlgeschlagen');
      setLectorReview(null);
      setLectorInstructions('');
      setPhase('idle');
      onDone();
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handleConfirmScript = async () => {
    try {
      await fetch(`/api/stories/${story.id}/confirm-script`, {
        method: 'PATCH',
        headers: { Authorization: getAuth() },
      });
      onDone();
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handleUnconfirmScript = async () => {
    try {
      await fetch(`/api/stories/${story.id}/unconfirm-script`, {
        method: 'PATCH',
        headers: { Authorization: getAuth() },
      });
      onDone();
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
        headers: { 'Content-Type': 'application/json', Authorization: getAuth() },
        body: JSON.stringify({ includeSfx: ttsIncludeSfx }),
      });
      if (!res.ok) throw new Error('TTS-Optimierung fehlgeschlagen');
      setPhase('idle');
      onDone();
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handleProduce = async () => {
    setPhase('producing');
    setProgress('Wird vertont...');
    try {
      const res = await fetch(`/api/generate/${story.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: getAuth() },
      });
      if (!res.ok) throw new Error('Vertonung fehlgeschlagen');
      for (;;) {
        await new Promise(r => setTimeout(r, 2000));
        const s = await fetch(`/api/generate/status/${story.id}`, { headers: { Authorization: getAuth() } });
        const data = await s.json();
        if (data.progress) setProgress(data.progress);
        if (data.status === 'done') { setPhase('done'); onDone(); return; }
        if (data.status === 'error') throw new Error(data.error || 'Fehler beim Vertonen');
      }
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handleResetScript = async () => {
    if (!confirm('Skript verwerfen und neu generieren?')) return;
    await fetch(`/api/stories/${story.id}/reset-script`, {
      method: 'PATCH',
      headers: { Authorization: getAuth() },
    });
    onDone();
  };

  const isAgentBusy = ['lector', 'lector-revising', 'tts-optimizing', 'producing'].includes(phase);

  if (!script) return null;

  // --- Pipeline steps for status bar ---
  const pipelineSteps = [
    { label: 'Entwurf', done: true },
    { label: 'Bestätigt', done: isConfirmed },
    { label: 'Vertont', done: isProduced },
    { label: 'Veröffentlicht', done: isPublished },
  ];

  return (
    <div className="space-y-4">
      {/* Pipeline Status Bar */}
      <div className="bg-surface border border-border rounded-xl px-4 py-3">
        <div className="flex items-center gap-1 text-sm flex-wrap">
          {pipelineSteps.map((step, i) => (
            <span key={step.label} className="flex items-center gap-1">
              {i > 0 && <span className="text-gray-600 mx-1">→</span>}
              <span className={`px-2 py-1 rounded text-xs font-medium ${step.done ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                {step.done ? '✅' : '⬜'} {step.label}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Agent Loading Indicator */}
      {isAgentBusy && (
        <div className="bg-surface border border-brand/30 rounded-xl p-6 text-center space-y-2">
          <Loader2 size={24} className="animate-spin mx-auto text-brand" />
          <p className="text-sm font-medium">{progress}</p>
          {phase === 'lector' && <p className="text-xs text-text-muted">Das kann 15-30 Sekunden dauern</p>}
          {phase === 'lector-revising' && <p className="text-xs text-text-muted">Das kann 30-60 Sekunden dauern</p>}
          {phase === 'tts-optimizing' && <p className="text-xs text-text-muted">Audio-Tags und Emotionen werden optimiert...</p>}
          {phase === 'producing' && <p className="text-xs text-text-muted">ElevenLabs generiert Audio...</p>}
        </div>
      )}

      {/* Done: just reload, no success screen */}

      {/* Error Message */}
      {phase === 'error' && (
        <div className="bg-surface border border-red-500/30 rounded-xl p-4 space-y-2">
          <p className="text-red-400 font-medium text-sm">Fehler: {error}</p>
          <button onClick={() => { setPhase('idle'); setError(''); }} className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs hover:bg-surface-hover">
            Schließen
          </button>
        </div>
      )}

      {/* Lector Result */}
      {phase === 'lector-result' && lectorReview && (
        <div className="bg-surface border border-blue-500/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">📝 Lektorat-Ergebnis</h3>
            <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${lectorReview.approved ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>
              {lectorReview.approved ? '✅ Freigegeben' : '❌ Überarbeitung empfohlen'}
            </span>
          </div>

          {lectorReview.severity && (
            <div className={`text-xs px-2 py-1 rounded inline-block ${lectorReview.severity === 'critical' ? 'bg-red-500/20 text-red-400' : lectorReview.severity === 'major' ? 'bg-orange-500/20 text-orange-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
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
              placeholder="z.B. 'Mache die Geschichte lustiger' oder 'Behebe die im Feedback genannten Probleme'"
              className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleLectorRevision}
              disabled={!lectorInstructions.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
            >
              ✏️ Überarbeiten
            </button>
            <button
              onClick={() => { setPhase('idle'); setLectorReview(null); setLectorInstructions(''); }}
              className="px-4 py-2.5 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors"
            >
              Zurück
            </button>
          </div>
        </div>
      )}

      {/* Script Display — always visible except during lector-result */}
      {!isAgentBusy && phase !== 'lector-result' && (
        <div className="bg-surface border border-brand/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">📝 Skript</h3>
            {isDraft && !isConfirmed && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Entwurf</span>}
            {isDraft && isConfirmed && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Bestätigt</span>}
          </div>

          {/* Characters & Voices */}
          <div>
            <h4 className="text-sm font-medium mb-2">Charaktere & Stimmen {isDraft && <span className="text-text-muted">(klicken zum Ändern)</span>}</h4>
            <div className="flex gap-2 flex-wrap">
              {script.characters?.map((c: any) => (
                <button
                  key={c.name}
                  onClick={() => isDraft && setPickerChar(c.name)}
                  className={`px-3 py-1.5 bg-gray-800 border border-border rounded-full text-xs flex items-center gap-1.5 transition-colors ${isDraft ? 'hover:border-brand/50 cursor-pointer' : 'cursor-default'}`}
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
                  const c = script.characters?.find((ch: any) => ch.name === pickerChar);
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

          {/* Prompt */}
          {story.prompt && (
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-xs text-text-muted mb-1">Prompt</p>
              <p className="text-sm">{story.prompt}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex gap-4 text-xs text-text-muted">
            <span>{script.scenes?.length} Szenen</span>
            <span>{script.scenes?.reduce((t: number, s: any) => t + (s.lines?.length || 0), 0)} Zeilen</span>
            <span>{script.characters?.filter((c: any) => c.name !== 'Erzähler').length} Charaktere</span>
          </div>

          {/* Scenes */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {script.scenes?.map((scene: any, si: number) => (
              <div key={si} className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-text-muted mb-2">Szene {si + 1}</p>
                {scene.lines?.map((line: any, li: number) =>
                  line.sfx ? (
                    <div key={li} className="mb-1 flex items-center gap-1.5 text-xs text-yellow-400/80 italic">
                      <TwemojiIcon emoji="🔊" size={14} />
                      <span>{line.sfx}</span>
                    </div>
                  ) : (
                    <div key={li} className="mb-1">
                      <span className="text-brand font-medium text-sm">
                        <TwemojiIcon emoji={script.characters?.find((c: any) => c.name === line.speaker)?.emoji || '✨'} size={14} /> {line.speaker}:
                      </span>{' '}
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
                )}
              </div>
            ))}
          </div>

          {/* Action Buttons — gated by pipeline state */}
          {isDraft && (
            <div className="flex gap-3 pt-2 flex-wrap border-t border-border">
              {!isConfirmed ? (
                <>
                  {/* Phase: Skript entworfen */}
                  <button onClick={handleResetScript} className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:bg-surface-hover rounded-lg text-sm font-medium transition-colors">
                    🔄 Neu generieren
                  </button>
                  <button onClick={handleLectorReview} className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                    📝 Lektorat
                  </button>
                  <button onClick={handleConfirmScript} className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                    <Check size={16} /> Skript bestätigen
                  </button>
                </>
              ) : (
                <>
                  {/* Phase: Skript bestätigt */}
                  <button onClick={handleUnconfirmScript} className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border hover:bg-surface-hover rounded-lg text-sm font-medium transition-colors">
                    ← Zurück zu Entwurf
                  </button>
                  <div className="flex items-center gap-2">
                    <button onClick={handleTtsOptimization} className="flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition-colors">
                      🎙️ TTS-Optimierung
                    </button>
                    <label className="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer select-none">
                      <input type="checkbox" checked={ttsIncludeSfx} onChange={e => setTtsIncludeSfx(e.target.checked)} className="rounded" />
                      SFX
                    </label>
                  </div>
                  <button onClick={handleProduce} className="flex items-center gap-2 px-4 py-2.5 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                    🔊 Vertonen
                  </button>
                </>
              )}
              {onDelete && (
                <button onClick={onDelete} className="flex items-center gap-2 px-4 py-2.5 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400 hover:bg-red-900/50 transition-colors font-medium ml-auto">
                  <Trash2 size={16} /> Löschen
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Pipeline Log — ALWAYS visible */}
      {(story as any).scriptData?.pipeline && (
        <PipelineLog 
          pipeline={(story as any).scriptData.pipeline} 
          activeStep={
            phase === 'lector' ? 'Lektor prüft Story...' :
            phase === 'lector-revising' ? 'Autor überarbeitet Story...' :
            phase === 'tts-optimizing' ? 'TTS-Optimierung...' :
            phase === 'producing' ? progress :
            null
          }
        />
      )}
    </div>
  );
}
