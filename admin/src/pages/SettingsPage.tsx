import { useEffect, useState } from 'react';
import { getSystemPrompt, updateSystemPrompt } from '../api';
import { Save, Loader2, RotateCcw, FileText, Volume2, Brain, PenTool, Search, Mic } from 'lucide-react';
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

const TABS = [
  { id: 'claude', label: 'Pipeline', icon: Brain },
  { id: 'author', label: 'Autor', icon: PenTool },
  { id: 'reviewer', label: 'Lektor', icon: Search },
  { id: 'tts', label: 'TTS', icon: Mic },
  { id: 'audio', label: 'Audio', icon: Volume2 },
] as const;

type TabId = typeof TABS[number]['id'];

const AUTH = () => sessionStorage.getItem('fablino_auth') || '';

function AgentPromptTab({ name, label, desc }: { name: string; label: string; desc: string }) {
  const [prompt, setPrompt] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/settings/agent/${name}`, { headers: { Authorization: AUTH() } })
      .then(r => r.json())
      .then(d => { setPrompt(d.prompt || ''); setOriginal(d.prompt || ''); setLoading(false); })
      .catch(() => setLoading(false));
  }, [name]);

  const hasChanges = prompt !== original;

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{label}</h3>
        <button onClick={async () => {
          setSaving(true);
          try {
            await fetch(`/api/settings/agent/${name}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
              body: JSON.stringify({ prompt }),
            });
            setOriginal(prompt);
            toast.success(`${label} gespeichert`);
          } catch { toast.error('Fehler'); }
          finally { setSaving(false); }
        }}
          disabled={!hasChanges || saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            hasChanges ? 'bg-brand hover:bg-green-700 text-white' : 'bg-surface-alt text-text-muted cursor-not-allowed'
          }`}>
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Speichern
        </button>
      </div>
      <p className="text-xs text-text-muted">{desc}</p>
      {loading ? <p className="text-text-muted text-sm">Laden…</p> : (
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={24}
          className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-brand leading-relaxed" />
      )}
      {hasChanges && (
        <button onClick={() => setPrompt(original)}
          className="text-xs text-text-muted hover:text-text transition-colors">
          Änderungen verwerfen
        </button>
      )}
    </div>
  );
}

export function SettingsPage() {
  const [tab, setTab] = useState<TabId>('claude');
  const [loading, setLoading] = useState(true);
  const [audio, setAudio] = useState<AudioSettings | null>(null);
  const [originalAudio, setOriginalAudio] = useState<AudioSettings | null>(null);
  const [savingAudio, setSavingAudio] = useState(false);
  const [claude, setClaude] = useState<any>(null);
  const [originalClaude, setOriginalClaude] = useState<any>(null);
  const [savingClaude, setSavingClaude] = useState(false);
  const [sfxPrompt, setSfxPrompt] = useState('');
  const [originalSfxPrompt, setOriginalSfxPrompt] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/settings/audio', { headers: { Authorization: AUTH() } }).then(r => r.json()).then(d => { setAudio(d); setOriginalAudio({ ...d }); }).catch(() => {}),
      fetch('/api/settings/claude', { headers: { Authorization: AUTH() } }).then(r => r.json()).then(d => { setClaude(d); setOriginalClaude({ ...d }); }).catch(() => {}),
      fetch('/api/settings/sfx-prompt', { headers: { Authorization: AUTH() } }).then(r => r.json()).then(d => { setSfxPrompt(d.prompt || ''); setOriginalSfxPrompt(d.prompt || ''); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const audioChanged = audio && originalAudio && JSON.stringify(audio) !== JSON.stringify(originalAudio);
  const claudeChanged = (claude && originalClaude && JSON.stringify(claude) !== JSON.stringify(originalClaude)) || sfxPrompt !== originalSfxPrompt;

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

      {/* Agent Prompt Tabs */}
      {tab === 'author' && (
        <AgentPromptTab name="author" label="Autor-Agent" desc="Schreibt die Story. Fokus auf Kreativität, Plot und Dialoge. Wird mit Opus ausgeführt." />
      )}
      {tab === 'reviewer' && (
        <AgentPromptTab name="reviewer" label="Lektor-Agent" desc="Prüft die Story auf Plotlöcher, falsche Fakten, Widersprüche und KI-Klischees. Gibt strukturiertes Feedback. Wird mit Sonnet ausgeführt." />
      )}
      {tab === 'tts' && (
        <AgentPromptTab name="tts" label="TTS-Agent" desc="Optimiert Audio-Tags, Emotions und Zahlen für die Sprachausgabe. Verändert keine Handlung. Wird mit Sonnet ausgeführt." />
      )}

      {/* Audio Tab */}
      {tab === 'audio' && audio && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Audio Mix</h3>
            <div className="flex items-center gap-2">
              {audioChanged && (
                <button onClick={() => setAudio({ ...originalAudio! })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-orange-400 transition-colors">
                  <RotateCcw size={14} /> Reset
                </button>
              )}
              <button onClick={async () => {
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
                disabled={!audioChanged || savingAudio}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  audioChanged ? 'bg-brand hover:bg-green-700 text-white' : 'bg-surface-alt text-text-muted cursor-not-allowed'
                }`}>
                {savingAudio ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Speichern
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {Object.entries(AUDIO_LABELS).map(([key, cfg]) => (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">{cfg.label}</span>
                    <span className="text-xs text-text-muted ml-2">— {cfg.desc}</span>
                  </div>
                  <span className="text-sm font-mono text-brand">{(audio as any)[key]}{cfg.unit}</span>
                </div>
                <input type="range" min={cfg.min} max={cfg.max} step={cfg.step}
                  value={(audio as any)[key]}
                  onChange={e => setAudio({ ...audio, [key]: +e.target.value })}
                  className="w-full h-1.5 accent-brand" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Claude Pipeline Tab */}
      {tab === 'claude' && claude && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Multi-Agent Pipeline</h3>
            <div className="flex items-center gap-2">
              {claudeChanged && (
                <button onClick={() => { setClaude({ ...originalClaude! }); setSfxPrompt(originalSfxPrompt); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-orange-400 transition-colors">
                  <RotateCcw size={14} /> Reset
                </button>
              )}
              <button onClick={async () => {
                  setSavingClaude(true);
                  try {
                    await fetch('/api/settings/claude', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
                      body: JSON.stringify(claude),
                    });
                    setOriginalClaude({ ...claude });
                    if (sfxPrompt !== originalSfxPrompt) {
                      await fetch('/api/settings/sfx-prompt', {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json', Authorization: AUTH() },
                        body: JSON.stringify({ prompt: sfxPrompt }),
                      });
                      setOriginalSfxPrompt(sfxPrompt);
                    }
                    toast.success('Pipeline Settings gespeichert');
                  } catch { toast.error('Fehler'); }
                  finally { setSavingClaude(false); }
                }}
                disabled={!claudeChanged || savingClaude}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  claudeChanged ? 'bg-brand hover:bg-green-700 text-white' : 'bg-surface-alt text-text-muted cursor-not-allowed'
                }`}>
                {savingClaude ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Speichern
              </button>
            </div>
          </div>

          {/* Pipeline Overview */}
          <div className="flex items-center gap-2 text-xs text-text-muted bg-gray-900 rounded-lg p-3">
            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded">1. Autor</span>
            <span>→</span>
            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-300 rounded">2. Lektor</span>
            <span>→</span>
            <span className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded">3. Revision</span>
            <span>→</span>
            <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded">4. TTS</span>
          </div>

          <div className="space-y-4">
            {/* Author Model */}
            <div className="space-y-1">
              <span className="text-sm font-medium">Autor-Modell</span>
              <span className="text-xs text-text-muted ml-2">— Schreibt und überarbeitet die Story</span>
              <select value={claude.model} onChange={e => setClaude({ ...claude, model: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand">
                <option value="claude-opus-4-20250514">Claude Opus 4 (beste Qualität)</option>
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (schneller)</option>
              </select>
            </div>

            {/* Reviewer Model */}
            <div className="space-y-1">
              <span className="text-sm font-medium">Lektor-Modell</span>
              <span className="text-xs text-text-muted ml-2">— Prüft auf Fehler und Logik</span>
              <select value={claude.reviewerModel || claude.model} onChange={e => setClaude({ ...claude, reviewerModel: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand">
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (empfohlen)</option>
                <option value="claude-opus-4-20250514">Claude Opus 4</option>
              </select>
            </div>

            {/* TTS Model */}
            <div className="space-y-1">
              <span className="text-sm font-medium">TTS-Modell</span>
              <span className="text-xs text-text-muted ml-2">— Optimiert Audio-Tags</span>
              <select value={claude.ttsModel || claude.model} onChange={e => setClaude({ ...claude, ttsModel: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand">
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (empfohlen)</option>
                <option value="claude-opus-4-20250514">Claude Opus 4</option>
              </select>
            </div>

            <div className="border-t border-border pt-4 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Temperature</span>
                    <span className="text-xs text-text-muted ml-2">— Kreativität des Autors</span>
                  </div>
                  <span className="text-sm font-mono text-brand">{claude.temperature}</span>
                </div>
                <input type="range" min={0} max={2} step={0.1} value={claude.temperature}
                  onChange={e => setClaude({ ...claude, temperature: +e.target.value })}
                  className="w-full h-1.5 accent-brand" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Max Tokens</span>
                    <span className="text-xs text-text-muted ml-2">— Maximale Antwortlänge</span>
                  </div>
                  <span className="text-sm font-mono text-brand">{claude.max_tokens?.toLocaleString()}</span>
                </div>
                <input type="range" min={4000} max={32000} step={1000} value={claude.max_tokens}
                  onChange={e => setClaude({ ...claude, max_tokens: +e.target.value })}
                  className="w-full h-1.5 accent-brand" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Thinking Budget</span>
                    <span className="text-xs text-text-muted ml-2">— Tokens für internes Nachdenken</span>
                  </div>
                  <span className="text-sm font-mono text-brand">{claude.thinking_budget?.toLocaleString()}</span>
                </div>
                <input type="range" min={1000} max={30000} step={1000} value={claude.thinking_budget}
                  onChange={e => setClaude({ ...claude, thinking_budget: +e.target.value })}
                  className="w-full h-1.5 accent-brand" />
              </div>
            </div>

            {/* SFX Toggle */}
            <div className="pt-4 border-t border-border">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="text-sm font-medium">Soundeffekte (SFX)</span>
                  <p className="text-xs text-text-muted mt-0.5">SFX-Library wird dem Autor-Prompt angehängt</p>
                </div>
                <div className={`relative w-11 h-6 rounded-full transition-colors ${claude.sfxEnabled ? 'bg-brand' : 'bg-zinc-600'}`}
                  onClick={() => setClaude({ ...claude, sfxEnabled: !claude.sfxEnabled })}>
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${claude.sfxEnabled ? 'translate-x-5' : ''}`} />
                </div>
              </label>
              {claude.sfxEnabled && (
                <div className="mt-3">
                  <p className="text-xs text-text-muted mb-1">SFX-Anweisungen:</p>
                  <textarea value={sfxPrompt} onChange={e => setSfxPrompt(e.target.value)} rows={6}
                    className="w-full bg-background border border-border rounded-lg p-3 text-sm font-mono text-text focus:outline-none focus:border-brand resize-y" />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
