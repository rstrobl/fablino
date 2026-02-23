import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchStory, deleteStory, toggleFeatured, updateStoryStatus } from '../api';
import { useAudio } from '../audioContext';
import { ArrowLeft, Play, Star, Trash2, Wand2, Loader2, Check, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { useState, useEffect, useRef } from 'react';

function getAuth(): string {
  return sessionStorage.getItem('fablino_auth') || '';
}

function GenerateForm({ story, onDone }: { story: any; onDone: () => void }) {
  const [heroName] = useState(story.title?.replace(/(s|es) Hörspiel$/, '') || '');
  const [heroAge, setHeroAge] = useState(story.ageGroup || '');
  const [prompt, setPrompt] = useState(story.interests || story.prompt || '');
  const [sideChars, setSideChars] = useState<{ name: string; role: string }[]>([]);
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
        prompt: `Name: ${heroName}, Alter: ${heroAge} Jahre. ${prompt}`,
        ageGroup: heroAge,
        characters: {
          hero: { name: heroName, age: heroAge },
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
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Held/in</label>
            <input value={heroName} readOnly className="w-full px-3 py-2 bg-gray-800 border border-border rounded-lg text-sm" />
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
                  {c.name} <span className="text-text-muted">({c.gender})</span>
                  {voiceMap?.[c.name] && <span className="text-brand ml-1">🎤</span>}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {script.scenes?.map((scene: any, si: number) => (
              <div key={si} className="bg-gray-900/50 rounded-lg p-3">
                <p className="text-xs text-text-muted mb-2">Szene {si + 1}</p>
                {scene.lines?.map((line: any, li: number) => (
                  <div key={li} className="mb-1">
                    <span className="text-brand font-medium text-sm">{line.speaker}:</span>{' '}
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
          <h2 className="text-2xl font-bold">{story.title}</h2>
          <p className="text-text-muted text-sm">
            {(story as any).ageGroup ? `${(story as any).ageGroup} J.` : ''} · {new Date(story.createdAt).toLocaleDateString('de-DE')}
          </p>
          {(story as any).requesterName && (
            <p className="text-sm">Anfrage von: <strong>{(story as any).requesterName}</strong>
              {(story as any).requesterSource && <span className="text-text-muted"> ({(story as any).requesterSource})</span>}
            </p>
          )}
          {(story as any).interests && (
            <p className="text-sm">Interessen: <span className="text-text-muted">{(story as any).interests}</span></p>
          )}
          {story.summary && <p className="text-sm">{story.summary}</p>}
          <div className="flex gap-2 mt-3 flex-wrap">
            {(story as any).audioUrl && (
              <button onClick={() => play(story.id, story.title)} className="flex items-center gap-2 px-4 py-2 bg-brand rounded-lg text-sm text-white hover:bg-green-700 transition-colors">
                <Play size={16} /> Abspielen
              </button>
            )}
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
          </div>
        </div>
      </div>

      {/* Generation form for requested stories */}
      {(isRequested || isDraft) && (
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
                {c.name} <span className="text-text-muted">({c.gender})</span>
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
                    <div key={l.id}>
                      <span className="text-brand font-medium text-sm">{l.speaker}:</span>{' '}
                      <span className="text-sm">{l.text}</span>
                      {l.sfx && <span className="text-xs text-text-muted ml-2">🎵 {l.sfx}</span>}
                    </div>
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
