import { useEffect, useState } from 'react';
import { Save, Loader2, RotateCcw, Volume2, PenTool, Search, Mic } from 'lucide-react';
import toast from 'react-hot-toast';

interface AudioSettings {
  scene_pause: number;
  sfx_pause: number;
  fade_in: number;
  fade_out: number;
}

const AUDIO_LABELS: Record<string, { label: string; desc: string; min: number; max: number; step: number; unit: string }> = {
  scene_pause:   { label: 'Pause zwischen Szenen', desc: 'Stille bei Szenenwechsel', min: 0, max: 5, step: 0.1, unit: 's' },
  sfx_pause:     { label: 'Pause um SFX', desc: 'Stille vor und nach Soundeffekten', min: 0, max: 3, step: 0.1, unit: 's' },
  fade_in:       { label: 'Fade-In', desc: 'Einblendung am Anfang', min: 0, max: 3, step: 0.1, unit: 's' },
  fade_out:      { label: 'Fade-Out', desc: 'Ausblendung am Ende', min: 0, max: 3, step: 0.1, unit: 's' },
};

const MODEL_OPTIONS = [
  { value: 'claude-opus-4-20250514', label: 'Claude Opus 4' },
  { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
];

const TABS = [
  { id: 'author', label: 'Autor', icon: PenTool },
  { id: 'adapter', label: 'Adapter', icon: PenTool },
  { id: 'reviewer', label: 'Lektor', icon: Search },
  { id: 'tts', label: 'TTS', icon: Mic },
  { id: 'audio', label: 'Audio', icon: Volume2 },
] as const;

type TabId = typeof TABS[number]['id'];

const AUTH = () => sessionStorage.getItem('fablino_auth') || '';

function ModelSelect({ value, onChange, label, desc }: { value: string; onChange: (v: string) => void; label: string; desc: string }) {
  return (
    <div className="space-y-1">
      <div>
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-text-muted ml-2">— {desc}</span>
      </div>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand">
        {MODEL_OPTIONS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
      </select>
    </div>
  );
}

function Slider({ value, onChange, label, desc, min, max, step, unit }: {
  value: number; onChange: (v: number) => void; label: string; desc: string;
  min: number; max: number; step: number; unit?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-text-muted ml-2">— {desc}</span>
        </div>
        <span className="text-sm font-mono text-brand">{typeof value === 'number' ? value.toLocaleString() : value}{unit || ''}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(+e.target.value)} className="w-full h-1.5 accent-brand" />
    </div>
  );
}

function SaveBar({ changed, saving, onSave, onReset }: { changed: boolean; saving: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="flex items-center gap-2">
      {changed && (
        <button onClick={onReset}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-orange-400 transition-colors">
          <RotateCcw size={14} /> Reset
        </button>
      )}
      <button onClick={onSave} disabled={!changed || saving}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          changed ? 'bg-brand hover:bg-green-700 text-white' : 'bg-surface-alt text-text-muted cursor-not-allowed'
        }`}>
        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
        Speichern
      </button>
    </div>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState<TabId>('author');
  const [claude, setClaude] = useState<any>(null);
  const [originalClaude, setOriginalClaude] = useState<any>(null);
  const [savingClaude, setSavingClaude] = useState(false);

  // Agent prompts
  const [agentPrompts, setAgentPrompts] = useState<Record<string, string>>({});
  const [originalAgentPrompts, setOriginalAgentPrompts] = useState<Record<string, string>>({});
  const [savingAgent, setSavingAgent] = useState<string | null>(null);

  // Audio
  const [audio, setAudio] = useState<AudioSettings | null>(null);
  const [originalAudio, setOriginalAudio] = useState<AudioSettings | null>(null);
  const [savingAudio, setSavingAudio] = useState(false);

  // SFX prompt
  const [sfxPrompt, setSfxPrompt] = useState('');
  const [originalSfxPrompt, setOriginalSfxPrompt] = useState('');

  useEffect(() => {
    // Load all settings
    fetch('/api/settings/claude', { headers: { Authorization: AUTH() } })
      .then(r => r.json()).then(d => { setClaude(d); setOriginalClaude({ ...d }); }).catch(() => {});
    fetch('/api/settings/audio', { headers: { Authorization: AUTH() } })
      .then(r => r.json()).then(d => { setAudio(d); setOriginalAudio({ ...d }); }).catch(() => {});
    fetch('/api/settings/sfx-prompt', { headers: { Authorization: AUTH() } })
      .then(r => r.json()).then(d => { setSfxPrompt(d.prompt || ''); setOriginalSfxPrompt(d.prompt || ''); }).catch(() => {});

    // Load agent prompts
    for (const name of ['author', 'adapter', 'reviewer', 'tts']) {
      fetch(`/api/settings/agent/${name}`, { headers: { Authorization: AUTH() } })
        .then(r => r.json())
        .then(d => {
          setAgentPrompts(prev => ({ ...prev, [name]: d.prompt || '' }));
          setOriginalAgentPrompts(prev => ({ ...prev, [name]: d.prompt || '' }));
        }).catch(() => {});
    }
  }, []);

  const saveClaudeSettings = async (updates: Record<string, any>) => {
    const updated = { ...claude, ...updates };
    setClaude(updated);
    setSavingClaude(true);
    try {
      await fetch('/api/settings/claude', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
        body: JSON.stringify(updated),
      });
      setOriginalClaude({ ...updated });
      toast.success('Gespeichert');
    } catch { toast.error('Fehler'); }
    finally { setSavingClaude(false); }
  };

  const saveAgentPrompt = async (name: string) => {
    setSavingAgent(name);
    try {
      await fetch(`/api/settings/agent/${name}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
        body: JSON.stringify({ prompt: agentPrompts[name] }),
      });
      setOriginalAgentPrompts(prev => ({ ...prev, [name]: agentPrompts[name] }));
      // Also save claude settings if changed
      if (claude && originalClaude && JSON.stringify(claude) !== JSON.stringify(originalClaude)) {
        await fetch('/api/settings/claude', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
          body: JSON.stringify(claude),
        });
        setOriginalClaude({ ...claude });
      }
      toast.success('Gespeichert');
    } catch { toast.error('Fehler'); }
    finally { setSavingAgent(null); }
  };

  const claudeChanged = claude && originalClaude && JSON.stringify(claude) !== JSON.stringify(originalClaude);
  const audioChanged = audio && originalAudio && JSON.stringify(audio) !== JSON.stringify(originalAudio);
  const sfxChanged = sfxPrompt !== originalSfxPrompt;

  const agentChanged = (name: string) =>
    (agentPrompts[name] || '') !== (originalAgentPrompts[name] || '') ||
    (name === 'author' && claudeChanged) ||
    (name === 'adapter' && claude?.adapterModel !== originalClaude?.adapterModel);

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-3xl">
      <h2 className="text-xl md:text-2xl font-bold">Settings</h2>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface border border-border rounded-xl p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active ? 'bg-brand/20 text-brand' : 'text-text-muted hover:text-text hover:bg-surface-alt'
              }`}>
              <Icon size={16} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ===== AUTOR TAB ===== */}
      {tab === 'author' && claude && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Autor-Agent</h3>
              <SaveBar
                changed={agentChanged('author')}
                saving={savingAgent === 'author'}
                onSave={() => saveAgentPrompt('author')}
                onReset={() => {
                  setAgentPrompts(prev => ({ ...prev, author: originalAgentPrompts.author || '' }));
                  setClaude({ ...originalClaude });
                }}
              />
            </div>
            <p className="text-xs text-text-muted">
              Schreibt die Story und überarbeitet sie nach Lektor-Feedback.
            </p>

            <ModelSelect value={claude.model} onChange={v => setClaude({ ...claude, model: v })}
              label="Modell" desc="Empfehlung: Opus für beste Qualität" />

            <Slider value={claude.temperature} onChange={v => setClaude({ ...claude, temperature: v })}
              label="Temperature" desc="Kreativität (0.5 = konsistent, 1.5 = wild)"
              min={0} max={2} step={0.1} />

            <Slider value={claude.max_tokens} onChange={v => setClaude({ ...claude, max_tokens: v })}
              label="Max Tokens" desc="Maximale Antwortlänge"
              min={4000} max={32000} step={1000} />

            <Slider value={claude.thinking_budget} onChange={v => setClaude({ ...claude, thinking_budget: v })}
              label="Thinking Budget" desc="Tokens für internes Nachdenken"
              min={1000} max={30000} step={1000} />

            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium">Prompt</label>
              <p className="text-xs text-text-muted mb-2">Basis-Anweisungen für die Story-Generierung</p>
              <textarea
                value={agentPrompts.author || ''}
                onChange={e => setAgentPrompts(prev => ({ ...prev, author: e.target.value }))}
                rows={18}
                className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-brand leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== ADAPTER TAB ===== */}
      {tab === 'adapter' && claude && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Adapter-Agent</h3>
              <SaveBar
                changed={agentChanged('adapter')}
                saving={savingAgent === 'adapter'}
                onSave={async () => {
                  setSavingAgent('adapter');
                  try {
                    await fetch('/api/settings/agent/adapter', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
                      body: JSON.stringify({ prompt: agentPrompts.adapter }),
                    });
                    setOriginalAgentPrompts(prev => ({ ...prev, adapter: agentPrompts.adapter }));
                    if (claude.adapterModel !== originalClaude?.adapterModel) {
                      await fetch('/api/settings/claude', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
                        body: JSON.stringify(claude),
                      });
                      setOriginalClaude({ ...claude });
                    }
                    toast.success('Gespeichert');
                  } catch { toast.error('Fehler'); }
                  finally { setSavingAgent(null); }
                }}
                onReset={() => {
                  setAgentPrompts(prev => ({ ...prev, adapter: originalAgentPrompts.adapter || '' }));
                  setClaude(prev => ({ ...prev, adapterModel: originalClaude?.adapterModel }));
                }}
              />
            </div>
            <p className="text-xs text-text-muted">
              Konvertiert vorgeschriebene Geschichten in Hörspiel-Format. Analysiert Text und erstellt Dialog, Charaktere und Atmosphäre.
            </p>

            <ModelSelect value={claude.adapterModel || claude.model} onChange={v => setClaude({ ...claude, adapterModel: v })}
              label="Modell" desc="Empfehlung: Opus für beste Adaptierungsqualität" />

            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium">Prompt</label>
              <p className="text-xs text-text-muted mb-2">Anweisungen für die Geschichte-zu-Hörspiel Konvertierung</p>
              <textarea
                value={agentPrompts.adapter || ''}
                onChange={e => setAgentPrompts(prev => ({ ...prev, adapter: e.target.value }))}
                rows={18}
                className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-brand leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* ===== LEKTOR TAB ===== */}
      {tab === 'reviewer' && claude && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Lektor-Agent</h3>
            <SaveBar
              changed={agentChanged('reviewer')}
              saving={savingAgent === 'reviewer'}
              onSave={async () => {
                setSavingAgent('reviewer');
                try {
                  await fetch('/api/settings/agent/reviewer', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
                    body: JSON.stringify({ prompt: agentPrompts.reviewer }),
                  });
                  setOriginalAgentPrompts(prev => ({ ...prev, reviewer: agentPrompts.reviewer }));
                  if (claude.reviewerModel !== originalClaude?.reviewerModel) {
                    await fetch('/api/settings/claude', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
                      body: JSON.stringify(claude),
                    });
                    setOriginalClaude({ ...claude });
                  }
                  toast.success('Gespeichert');
                } catch { toast.error('Fehler'); }
                finally { setSavingAgent(null); }
              }}
              onReset={() => {
                setAgentPrompts(prev => ({ ...prev, reviewer: originalAgentPrompts.reviewer || '' }));
                setClaude(prev => ({ ...prev, reviewerModel: originalClaude?.reviewerModel }));
              }}
            />
          </div>
          <p className="text-xs text-text-muted">
            Prüft die Story auf Plotlöcher, falsche Fakten und KI-Klischees. Gibt strukturiertes Feedback.
          </p>

          <ModelSelect value={claude.reviewerModel || claude.model} onChange={v => setClaude({ ...claude, reviewerModel: v })}
            label="Modell" desc="Empfehlung: Sonnet (schneller, reicht zum Prüfen)" />

          <div className="pt-4 border-t border-border">
            <label className="text-sm font-medium">Prompt</label>
            <p className="text-xs text-text-muted mb-2">Anweisungen für die Qualitätsprüfung</p>
            <textarea
              value={agentPrompts.reviewer || ''}
              onChange={e => setAgentPrompts(prev => ({ ...prev, reviewer: e.target.value }))}
              rows={18}
              className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-brand leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* ===== TTS TAB ===== */}
      {tab === 'tts' && claude && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">TTS-Agent</h3>
            <SaveBar
              changed={agentChanged('tts')}
              saving={savingAgent === 'tts'}
              onSave={async () => {
                setSavingAgent('tts');
                try {
                  await fetch('/api/settings/agent/tts', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
                    body: JSON.stringify({ prompt: agentPrompts.tts }),
                  });
                  setOriginalAgentPrompts(prev => ({ ...prev, tts: agentPrompts.tts }));
                  if (claude.ttsModel !== originalClaude?.ttsModel) {
                    await fetch('/api/settings/claude', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
                      body: JSON.stringify(claude),
                    });
                    setOriginalClaude({ ...claude });
                  }
                  toast.success('Gespeichert');
                } catch { toast.error('Fehler'); }
                finally { setSavingAgent(null); }
              }}
              onReset={() => {
                setAgentPrompts(prev => ({ ...prev, tts: originalAgentPrompts.tts || '' }));
                setClaude(prev => ({ ...prev, ttsModel: originalClaude?.ttsModel }));
              }}
            />
          </div>
          <p className="text-xs text-text-muted">
            Optimiert Audio-Tags, Emotions und Zahlen für die Sprachausgabe. Verändert keine Handlung.
          </p>

          <ModelSelect value={claude.ttsModel || claude.model} onChange={v => setClaude({ ...claude, ttsModel: v })}
            label="Modell" desc="Empfehlung: Sonnet (technische Aufgabe)" />

          <div className="pt-4 border-t border-border">
            <label className="text-sm font-medium">Prompt</label>
            <p className="text-xs text-text-muted mb-2">Anweisungen für Audio-Tag-Optimierung</p>
            <textarea
              value={agentPrompts.tts || ''}
              onChange={e => setAgentPrompts(prev => ({ ...prev, tts: e.target.value }))}
              rows={18}
              className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-brand leading-relaxed"
            />
          </div>
        </div>
      )}

      {/* ===== AUDIO TAB ===== */}
      {tab === 'audio' && claude && (
        <div className="space-y-4">
          {/* SFX Section */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Soundeffekte</h3>
              {(sfxChanged || (claude.sfxEnabled !== originalClaude?.sfxEnabled)) && (
                <SaveBar
                  changed={true}
                  saving={savingClaude}
                  onSave={async () => {
                    setSavingClaude(true);
                    try {
                      await fetch('/api/settings/claude', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
                        body: JSON.stringify(claude),
                      });
                      setOriginalClaude({ ...claude });
                      if (sfxChanged) {
                        await fetch('/api/settings/sfx-prompt', {
                          method: 'PUT',
                          headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
                          body: JSON.stringify({ prompt: sfxPrompt }),
                        });
                        setOriginalSfxPrompt(sfxPrompt);
                      }
                      toast.success('Gespeichert');
                    } catch { toast.error('Fehler'); }
                    finally { setSavingClaude(false); }
                  }}
                  onReset={() => {
                    setClaude({ ...originalClaude });
                    setSfxPrompt(originalSfxPrompt);
                  }}
                />
              )}
            </div>
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <span className="text-sm font-medium">SFX aktivieren</span>
                <p className="text-xs text-text-muted mt-0.5">SFX-Library wird dem Autor-Prompt angehängt</p>
              </div>
              <div className={`relative w-11 h-6 rounded-full transition-colors ${claude.sfxEnabled ? 'bg-brand' : 'bg-zinc-600'}`}
                onClick={() => setClaude({ ...claude, sfxEnabled: !claude.sfxEnabled })}>
                <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${claude.sfxEnabled ? 'translate-x-5' : ''}`} />
              </div>
            </label>
            {claude.sfxEnabled && (
              <div>
                <p className="text-xs text-text-muted mb-1">SFX-Anweisungen für den Autor-Agent:</p>
                <textarea value={sfxPrompt} onChange={e => setSfxPrompt(e.target.value)} rows={6}
                  className="w-full bg-background border border-border rounded-lg p-3 text-sm font-mono text-text focus:outline-none focus:border-brand resize-y" />
              </div>
            )}
          </div>

          {/* Audio Mix Section */}
          {audio && (
            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Audio Mix</h3>
                <SaveBar
                  changed={!!audioChanged}
                  saving={savingAudio}
                  onSave={async () => {
                    setSavingAudio(true);
                    try {
                      await fetch('/api/settings/audio', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
                        body: JSON.stringify(audio),
                      });
                      setOriginalAudio({ ...audio });
                      toast.success('Audio Settings gespeichert');
                    } catch { toast.error('Fehler'); }
                    finally { setSavingAudio(false); }
                  }}
                  onReset={() => setAudio({ ...originalAudio! })}
                />
              </div>
              <p className="text-xs text-text-muted">Gilt für neue Audio-Generierungen.</p>
              <div className="space-y-4">
                {Object.entries(AUDIO_LABELS).map(([key, cfg]) => (
                  <Slider key={key} value={(audio as any)[key]} onChange={v => setAudio({ ...audio, [key]: v })}
                    label={cfg.label} desc={cfg.desc} min={cfg.min} max={cfg.max} step={cfg.step} unit={cfg.unit} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
