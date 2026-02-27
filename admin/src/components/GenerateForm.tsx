import { useState, useEffect, useRef } from 'react';
import { Wand2, Loader2, Check, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchVoices, updateStoryStatus } from '../api';
import { TwemojiIcon } from '../charEmoji';
import { VoicePicker } from './VoicePicker';
import { PipelineLog } from './PipelineLog';
import { getAuth } from '../utils/auth';

export function GenerateForm({ story, onDone }: { story: any; onDone: () => void }) {
  const [heroName] = useState((story as any).heroName || story.title?.replace(/(s|es) Hörspiel$/, '') || '');
  const [targetAge, setTargetAge] = useState(story.age || '6');
  const [prompt, setPrompt] = useState(story.prompt || '');
  const [characters, setCharacters] = useState<{ name: string; role: string; age: string }[]>(
    heroName ? [{ name: heroName, role: 'Hauptfigur', age: '' }] : []
  );
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
  const [pipelineSteps, setPipelineSteps] = useState<any[]>([]);
  const [activeStep, setActiveStep] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [allVoices, setAllVoices] = useState<any[]>([]);
  const [pickerChar, setPickerChar] = useState<string | null>(null);
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const pollRef = useRef<any>(null);

  // Load all voices when voiceMap is available
  useEffect(() => {
    if (!voiceMap) return;
    fetchVoices().then(setAllVoices).catch(() => {});
  }, [voiceMap]);

  const getVoicePreviewUrl = (charName: string) => {
    const voiceId = voiceMap?.[charName];
    if (!voiceId) return null;
    return allVoices.find((v: any) => v.voice_id === voiceId)?.preview_url || null;
  };

  const getVoiceName = (charName: string) => {
    const voiceId = voiceMap?.[charName];
    if (!voiceId) return null;
    return allVoices.find((v: any) => v.voice_id === voiceId)?.name || null;
  };

  const playVoicePreview = (charName: string) => {
    if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; }
    if (playingVoice === charName) { setPlayingVoice(null); return; }
    const url = getVoicePreviewUrl(charName);
    if (!url) return;
    const audio = new Audio(url);
    audio.onended = () => setPlayingVoice(null);
    audio.play();
    previewAudioRef.current = audio;
    setPlayingVoice(charName);
  };

  const handleVoiceChange = (charName: string, voiceId: string) => {
    setVoiceMap((prev: any) => ({ ...prev, [charName]: voiceId }));
    setPickerChar(null);
  };

  const addCharacter = () => setCharacters([...characters, { name: '', role: '', age: '' }]);
  const updateCharacter = (i: number, field: string, val: string) => {
    const copy = [...characters];
    copy[i] = { ...copy[i], [field]: val };
    setCharacters(copy);
  };
  const removeCharacter = (i: number) => setCharacters(characters.filter((_, idx) => idx !== i));

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
          if (data.pipelineSteps) setPipelineSteps(data.pipelineSteps);
          if (data.activeStep !== undefined) setActiveStep(data.activeStep);
        }
      } catch {
        // retry
      }
    }, 2000);
  };

  // Resume polling if story is actively generating (e.g. after page refresh)
  useEffect(() => {
    if (story?.status === 'requested') {
      // Check if generation is active
      fetch(`/api/generate/status/${story.id}`, { headers: { Authorization: getAuth() } })
        .then(r => r.json())
        .then(data => {
          if (data.status === 'waiting_for_script' || data.status === 'generating_audio') {
            setPhase('generating');
            setProgress(data.progress || 'Generierung läuft...');
            if (data.pipelineSteps) setPipelineSteps(data.pipelineSteps);
            if (data.activeStep !== undefined) setActiveStep(data.activeStep);
            setJobId(story.id);
            pollStatus(story.id);
          }
        })
        .catch(() => {});
    }
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleGenerate = async () => {
    setPhase('generating');
    setProgress('Skript wird geschrieben...');
    try {
      const namedChars = characters.filter(c => c.name.trim());
      const heroChar = namedChars.find(c => c.role === 'Hauptfigur') || namedChars[0];
      const otherChars = namedChars.filter(c => c !== heroChar);
      
      // Build prompt with character info
      let fullPrompt = prompt;
      if (namedChars.length > 0) {
        const charDesc = namedChars.map(c => 
          `${c.name}${c.role ? ` (${c.role})` : ''}${c.age ? `, ${c.age} Jahre` : ''}`
        ).join('; ');
        fullPrompt = `Charaktere: ${charDesc}. ${prompt}`;
      }

      const body: any = {
        storyId: story.id,
        prompt: fullPrompt,
        age: parseFloat(targetAge) || 6,
        ...(systemPrompt.trim() && defaultPromptLoaded && { systemPromptOverride: systemPrompt.trim() }),
        characters: {
          ...(heroChar && { hero: { name: heroChar.name, age: heroChar.age || undefined } }),
          sideCharacters: otherChars.map(c => ({ name: c.name, role: c.role || c.name })),
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
        
        <div>
          <label className="block text-sm text-text-muted mb-1">Zielalter (Zuhörer)</label>
          <div className="flex items-center gap-3">
            <input 
              value={targetAge} 
              onChange={e => setTargetAge(e.target.value)} 
              className="w-24 px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand" 
              placeholder="6"
            />
            <span className="text-sm text-text-muted">Jahre</span>
          </div>
        </div>

        <div>
          <label className="block text-sm text-text-muted mb-1">Prompt</label>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            rows={4}
            placeholder="Beschreibe die Geschichte frei — Thema, Setting, Stimmung, was passieren soll..."
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
            <label className="block text-sm text-text-muted">Charaktere (optional)</label>
            <button onClick={addCharacter} className="text-xs text-brand hover:text-brand-light">+ Hinzufügen</button>
          </div>
          {characters.map((c, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                placeholder="Name"
                value={c.name}
                onChange={e => updateCharacter(i, 'name', e.target.value)}
                className="flex-[2] px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
              />
              <input
                placeholder="Rolle (z.B. Hauptfigur, Schwester)"
                value={c.role}
                onChange={e => updateCharacter(i, 'role', e.target.value)}
                className="flex-[2] px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
              />
              <input
                placeholder="Alter"
                value={c.age}
                onChange={e => updateCharacter(i, 'age', e.target.value)}
                className="w-20 px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
              />
              <button onClick={() => removeCharacter(i)} className="text-red-400 hover:text-red-300 px-2">✕</button>
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
      <div className="space-y-4">
        <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-3">
          <Loader2 size={32} className="animate-spin text-brand mx-auto" />
          <p className="text-sm font-medium">{progress}</p>
          <p className="text-xs text-text-muted">{phase === 'generating' ? 'Claude schreibt das Skript...' : 'ElevenLabs generiert Audio...'}</p>
        </div>
        {(pipelineSteps.length > 0 || activeStep) && (
          <PipelineLog pipeline={{ steps: pipelineSteps, totalTokens: pipelineSteps.reduce((t: any, s: any) => ({ input: t.input + (s.tokens?.input || 0), output: t.output + (s.tokens?.output || 0) }), { input: 0, output: 0 }) }} activeStep={activeStep} />
        )}
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
            <h4 className="text-sm font-medium mb-2">Charaktere & Stimmen <span className="text-text-muted">(klicken zum Ändern)</span></h4>
            <div className="flex gap-2 flex-wrap">
              {script.characters?.map((c: any) => (
                <button
                  key={c.name}
                  onClick={() => setPickerChar(c.name)}
                  className={`px-3 py-1.5 bg-gray-800 border rounded-full text-xs flex items-center gap-1.5 transition-colors border-border hover:border-brand/50 cursor-pointer`}
                >
                  <TwemojiIcon emoji={c.emoji || '✨'} size={16} />
                  <span>{c.name}</span>
                  {getVoiceName(c.name) && <span className="text-text-muted">({getVoiceName(c.name)})</span>}
                  <Volume2 size={12} className="text-text-muted" />
                </button>
              ))}
            </div>
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
                  <div key={li} className="mb-1">
                    <span className="text-brand font-medium text-sm"><TwemojiIcon emoji={script.characters?.find((c: any) => c.name === line.speaker)?.emoji || '✨'} size={14} /> {line.speaker}:</span>{' '}
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
