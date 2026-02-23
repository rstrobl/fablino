import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchStory, deleteStory, toggleFeatured, updateStoryStatus } from '../api';
import { useAudio } from '../audioContext';
import { ArrowLeft, Play, Pause, Star, Trash2, Wand2, Loader2, Check, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useEffect, useRef } from 'react';
import { charEmoji, TwemojiIcon } from '../charEmoji';

function getAuth(): string {
  return sessionStorage.getItem('fablino_auth') || '';
}

function GenerateForm({ story, onDone }: { story: any; onDone: () => void }) {
  const [heroName] = useState((story as any).heroName || story.title?.replace(/(s|es) Hörspiel$/, '') || '');
  const [heroAge, setHeroAge] = useState(story.age || '');
  const [prompt, setPrompt] = useState(story.interests || story.prompt || '');
  const [useHeroName, setUseHeroName] = useState(true);
  const [sideChars, setSideChars] = useState<{ name: string; role: string }[]>([]);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [defaultPromptLoaded, setDefaultPromptLoaded] = useState(false);
  const [phase, setPhase] = useState<'form' | 'generating' | 'preview' | 'producing' | 'done' | 'error'>('form');
  const [jobId, setJobId] = useState<string | null>(null);
  const [script, setScript] = useState<any>(null);
  const [voiceMap, setVoiceMap] = useState<any>(null);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const pollRef = useRef<any>(null);

  const addSideChar = () => setSideChars([...sideChars, { name: '', role: '' }]);
  const updateSideChar = (i: number, field: string, val: string) => {
    const copy = [...sideChars];
    copy[i] = { ...copy[i], [field]: val };
    setSideChars(copy);
  };
  const removeSideChar = (i: number) => setSideChars(sideChars.filter((_, idx) => idx !== i));

  const pollStatus = (id: string) => {
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/generate/status/${id}`);
        const data = await res.json();
        if (data.status === 'preview') {
          clearInterval(pollRef.current);
          setScript(data.script);
          setVoiceMap(data.voiceMap);
          setPhase('preview');
        } else if (data.status === 'complete') {
          clearInterval(pollRef.current);
          setPhase('done');
          toast.success('Hörbuch fertig!');
          onDone();
        } else if (data.status === 'error') {
          clearInterval(pollRef.current);
          setError(data.error || 'Fehler bei der Generierung');
          setPhase('error');
        } else {
          setProgress(data.progress || 'Arbeite...');
        }
      } catch {
        // retry
      }
    }, 2000);
  };

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleGenerate = async () => {
    setPhase('generating');
    setProgress('Skript wird geschrieben...');
    try {
      const body: any = {
        storyId: story.id,
        prompt: useHeroName
          ? `Name: ${heroName}, Alter: ${heroAge} Jahre. Interessen/Thema: ${prompt}`
          : `Alter des Kindes: ${heroAge} Jahre. Interessen/Thema: ${prompt}. Der Held soll NICHT das Kind selbst sein, sondern eine fiktive Figur.`,
        age: parseFloat(heroAge) || 6,
        ...(systemPrompt.trim() && defaultPromptLoaded && { systemPromptOverride: systemPrompt.trim() }),
        characters: {
          ...(useHeroName && { hero: { name: heroName, age: heroAge } }),
          sideCharacters: sideChars.filter(c => c.name),
        },
      };
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: getAuth() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setJobId(data.id);
      pollStatus(data.id);
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  const handleConfirm = async () => {
    if (!jobId) return;
    setPhase('producing');
    setProgress('Audio wird generiert...');
    try {
      // Update story status to draft
      await updateStoryStatus(story.id, 'draft');
      
      const res = await fetch(`/api/generate/${jobId}/confirm`, {
        method: 'POST',
        headers: { Authorization: getAuth() },
      });
      pollStatus(jobId);
    } catch (err: any) {
      setError(err.message);
      setPhase('error');
    }
  };

  if (phase === 'form') {
    return (
      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2"><Wand2 size={18} /> Hörspiel generieren</h3>
        
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={useHeroName} onChange={e => setUseHeroName(e.target.checked)} className="rounded" />
            Kind als Held (Name im Hörspiel verwenden)
          </label>
          {(story as any).testGroup && (
            <span className="text-xs text-text-muted">
              Gruppe {(story as any).testGroup}: {(story as any).testGroup === 'A' ? 'Voll personalisiert' : (story as any).testGroup === 'B' ? 'Nur Name' : 'Fiktiver Held'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Held/in</label>
            <input value={useHeroName ? heroName : '(fiktive Figur)'} readOnly className={`w-full px-3 py-2 border border-border rounded-lg text-sm ${useHeroName ? 'bg-gray-800' : 'bg-gray-800/50 text-text-muted italic'}`} />
          </div>
          <div>
            <label className="block text-sm text-text-muted mb-1">Alter</label>
            <input value={heroAge} onChange={e => setHeroAge(e.target.value)} className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Interessen / Thema</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
          />
        </div>

        {story.requesterName && (
          <div className="text-xs text-text-muted">
            Anfrage von: <strong>{story.requesterName}</strong>
            {story.requesterSource && <span> ({story.requesterSource})</span>}
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm text-text-muted">Nebencharaktere</label>
            <button onClick={addSideChar} className="text-xs text-brand hover:text-brand-light">+ Hinzufügen</button>
          </div>
          {sideChars.map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                placeholder="Name"
                value={c.name}
                onChange={e => updateSideChar(i, 'name', e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
              />
              <input
                placeholder="Rolle (z.B. Schwester, Hund)"
                value={c.role}
                onChange={e => updateSideChar(i, 'role', e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
              />
              <button onClick={() => removeSideChar(i)} className="text-red-400 hover:text-red-300 px-2">✕</button>
            </div>
          ))}
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            className="text-xs text-text-muted hover:text-text transition-colors mb-2"
          >
            {showSystemPrompt ? '▾ Zusätzliche Anweisungen ausblenden' : '▸ Zusätzliche Anweisungen (optional)'}
          </button>
          {showSystemPrompt && (
            <textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={4}
              placeholder="z.B. 'Die Geschichte soll besonders lustig sein' oder 'Bitte langsameres Erzähltempo für kleine Kinder'"
              className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-xs font-mono focus:outline-none focus:border-brand leading-relaxed"
            />
          )}
        </div>

        <button
          onClick={handleGenerate}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Wand2 size={16} /> Skript generieren
        </button>
      </div>
    );
  }

  if (phase === 'generating' || phase === 'producing') {
    return (
      <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-3">
        <Loader2 size={32} className="animate-spin text-brand mx-auto" />
        <p className="text-sm">{progress}</p>
        <p className="text-xs text-text-muted">{phase === 'generating' ? 'Claude schreibt das Skript...' : 'ElevenLabs generiert Audio...'}</p>
      </div>
    );
  }

  if (phase === 'preview' && script) {
    return (
      <div className="space-y-4">
        <div className="bg-surface border border-brand/30 rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold flex items-center gap-2">📝 Skript-Vorschau</h3>
            <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Entwurf</span>
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Charaktere</h4>
            <div className="flex gap-2 flex-wrap">
              {script.characters?.map((c: any) => (
                <span key={c.name} className="px-3 py-1 bg-gray-800 border border-border rounded-full text-xs">
                  <TwemojiIcon emoji={charEmoji(c.name, c.gender)} size={16} /> {c.name}
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-4 text-xs text-text-muted">
            <span>{script.scenes?.length} Szenen</span>
            <span>{script.scenes?.reduce((t: number, s: any) => t + (s.lines?.length || 0), 0)} Zeilen</span>
            <span>{script.characters?.length} Charaktere</span>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {script.scenes?.map((scene: any, si: number) => (
              <div key={si} className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-text-muted mb-2">Szene {si + 1}</p>
                {scene.lines?.map((line: any, li: number) => (
                  <div key={li} className="mb-1">
                    <span className="text-brand font-medium text-sm"><TwemojiIcon emoji={charEmoji(line.speaker, script.characters?.find((c: any) => c.name === line.speaker)?.gender || '')} size={14} /> {line.speaker}:</span>{' '}
                    <span className="text-sm">{line.text}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleConfirm}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Check size={16} /> Skript bestätigen & Audio generieren
            </button>
            <button
              onClick={() => { setPhase('form'); setScript(null); }}
              className="px-4 py-2.5 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors"
            >
              Zurück zum Formular
            </button>
          </div>
        </div>
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
        <button onClick={() => setPhase('form')} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover">
          Nochmal versuchen
        </button>
      </div>
    );
  }

  return null;
}

function DraftPreview({ story, onDone }: { story: any; onDone: () => void }) {
  const [phase, setPhase] = useState<'preview' | 'producing' | 'done' | 'error'>('preview');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const { script, voiceMap } = (story as any).scriptData || {};

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
        <h3 className="text-lg font-semibold flex items-center gap-2">📝 Skript-Vorschau</h3>
        <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">Entwurf</span>
      </div>

      <div>
        <h4 className="text-sm font-medium mb-2">Charaktere</h4>
        <div className="flex gap-2 flex-wrap">
          {script.characters?.map((c: any) => (
            <span key={c.name} className="px-3 py-1 bg-gray-800 border border-border rounded-full text-xs">
              <TwemojiIcon emoji={charEmoji(c.name, c.gender)} size={16} /> {c.name}
            </span>
          ))}
        </div>
      </div>

      <div className="flex gap-4 text-xs text-text-muted">
        <span>{script.scenes?.length} Szenen</span>
        <span>{script.scenes?.reduce((t: number, s: any) => t + (s.lines?.length || 0), 0)} Zeilen</span>
        <span>{script.characters?.length} Charaktere</span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {script.scenes?.map((scene: any, si: number) => (
          <div key={si} className="bg-gray-900/50 rounded-lg p-3">
            <p className="text-xs text-text-muted mb-2">Szene {si + 1}</p>
            {scene.lines?.map((line: any, li: number) => (
              <div key={li} className="mb-1">
                <span className="text-brand font-medium text-sm"><TwemojiIcon emoji={charEmoji(line.speaker, script.characters?.find((c: any) => c.name === line.speaker)?.gender || '')} size={14} /> {line.speaker}:</span>{' '}
                <span className="text-sm">{line.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleConfirm}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Check size={16} /> Skript bestätigen & Audio generieren
        </button>
      </div>
    </div>
  );
}

// Global audio ref so only one line plays at a time
let globalLineAudio: HTMLAudioElement | null = null;
let globalLineStop: (() => void) | null = null;

function ScriptLine({ line, story, onUpdated }: { line: any; story: any; onUpdated: () => void }) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [regenerating, setRegenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [stability, setStability] = useState(0.45);
  const [similarity, setSimilarity] = useState(0.8);
  const [style, setStyle] = useState(0.7);
  const [cachedUrl, setCachedUrl] = useState<string | null>(null);

  const matchChar = story.characters?.find((c: any) => c.name === line.speaker || c.name?.includes(line.speaker) || line.speaker?.includes(c.name));
  const voiceId = matchChar?.voiceId || '';
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
    try {
      stopGlobal();
      setState('loading');
      const res = await fetch('/api/generate/preview-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: line.text, voiceId,
          voiceSettings: { stability, similarity_boost: similarity, style, use_speaker_boost: true },
        }),
      });
      if (!res.ok) throw new Error('Fehler');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setCachedUrl(url);
      playAudio(url);
    } catch {
      setState('idle');
    }
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
          voiceSettings: { stability, similarity_boost: similarity, style, use_speaker_boost: true },
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
          <TwemojiIcon emoji={charEmoji(line.speaker || '', gender)} size={14} /> {line.speaker}:
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
          <button
            onClick={regenerate}
            disabled={regenerating}
            className="w-full flex items-center justify-center gap-2 px-3 py-1.5 bg-brand hover:bg-green-700 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
          >
            {regenerating ? <Loader2 size={12} className="animate-spin" /> : <Wand2 size={12} />}
            Neu generieren
          </button>
        </div>
      )}
    </div>
  );
}

export function StoryDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { play } = useAudio();
  const { data: story, isLoading } = useQuery({ queryKey: ['story', id], queryFn: () => fetchStory(id!) });

  const delMut = useMutation({
    mutationFn: deleteStory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Gelöscht'); nav('/stories'); },
  });
  const featMut = useMutation({
    mutationFn: toggleFeatured,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['story', id] }); toast.success('Featured aktualisiert'); },
  });

  if (isLoading || !story) return <p className="p-6 text-text-muted">Laden…</p>;

  const isRequested = (story as any).status === 'requested';
  const isDraft = (story as any).status === 'draft';

  const grouped: Record<number, typeof story.lines> = {};
  story.lines?.forEach((l) => {
    (grouped[l.sceneIdx] ??= []).push(l);
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <button onClick={() => nav('/stories')} className="flex items-center gap-1 text-text-muted hover:text-text text-sm">
        <ArrowLeft size={16} /> Zurück
      </button>

      <div className="flex gap-6">
        {story.coverUrl ? (
          <img src={story.coverUrl} alt="" className="w-48 h-48 rounded-xl object-cover" />
        ) : (
          <div className="w-48 h-48 rounded-xl bg-surface-alt flex items-center justify-center text-5xl">📖</div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{story.title}</h2>
            {(story as any).testGroup && (
              <span title={
                (story as any).testGroup === 'A' ? 'Kind als Held + Bezugspersonen' :
                (story as any).testGroup === 'B' ? 'Kind als Held, keine Bezugspersonen' :
                'Fiktiver Held, nur Interessen'
              } className={`px-2 py-0.5 rounded text-xs font-bold cursor-help ${
                (story as any).testGroup === 'A' ? 'bg-green-900 text-green-300' :
                (story as any).testGroup === 'B' ? 'bg-blue-900 text-blue-300' :
                'bg-orange-900 text-orange-300'
              }`}>
                Gruppe {(story as any).testGroup}
              </span>
            )}
          </div>
          <p className="text-text-muted text-sm">
            {(story as any).age ? `${(story as any).age} J.` : ''} · {new Date(story.createdAt).toLocaleDateString('de-DE')}
          </p>
          {(story as any).requesterName && (
            <p className="text-sm">Anfrage von: <strong>{(story as any).requesterName}</strong>
              {(story as any).requesterSource && <span className="text-text-muted"> ({(story as any).requesterSource})</span>}
            </p>
          )}
          {(story as any).interests && (
            <p className="text-sm">Interessen: <span className="text-text-muted">{(story as any).interests}</span></p>
          )}
          {story.summary && !story.summary.startsWith('{') && <p className="text-sm">{story.summary}</p>}
          <div className="flex gap-2 mt-3 flex-wrap">
            {(story as any).audioUrl && (
              <button onClick={() => play(story.id, story.title)} className="flex items-center gap-2 px-4 py-2 bg-brand rounded-lg text-sm text-white hover:bg-green-700 transition-colors">
                <Play size={16} /> Abspielen
              </button>
            )}
            {!isRequested && !isDraft && (
              <>
                <button onClick={() => featMut.mutate(story.id)} className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors">
                  <Star size={16} className={story.featured ? 'text-yellow-400 fill-yellow-400' : ''} />
                  {story.featured ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  onClick={() => { if (confirm('Wirklich löschen?')) delMut.mutate(story.id); }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400 hover:bg-red-900/50 transition-colors"
                >
                  <Trash2 size={16} /> Löschen
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Generation form for requested stories */}
      {isRequested && (
        <GenerateForm
          story={story}
          onDone={() => qc.invalidateQueries({ queryKey: ['story', id] })}
        />
      )}

      {/* Draft: show script preview with confirm/regenerate */}
      {isDraft && (story as any).scriptData && (
        <DraftPreview
          story={story}
          onDone={() => qc.invalidateQueries({ queryKey: ['story', id] })}
        />
      )}

      {/* Draft without script: show generate form */}
      {isDraft && !(story as any).scriptData && (
        <GenerateForm
          story={story}
          onDone={() => qc.invalidateQueries({ queryKey: ['story', id] })}
        />
      )}

      {/* Characters */}
      {story.characters?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Charaktere</h3>
          <div className="flex gap-2 flex-wrap">
            {story.characters.map((c) => (
              <span key={c.id} className="px-3 py-1 bg-surface border border-border rounded-full text-sm">
                <TwemojiIcon emoji={charEmoji(c.name, c.gender)} size={16} /> {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Script */}
      {Object.keys(grouped).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Skript</h3>
          <div className="space-y-4">
            {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([scene, lines]) => (
              <div key={scene} className="bg-surface border border-border rounded-lg p-4">
                <p className="text-xs text-text-muted mb-2">Szene {Number(scene) + 1}</p>
                <div className="space-y-2">
                  {lines.sort((a, b) => a.lineIdx - b.lineIdx).map((l) => (
                    <ScriptLine key={l.id} line={l} story={story} onUpdated={() => qc.invalidateQueries({ queryKey: ['story', id] })} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
