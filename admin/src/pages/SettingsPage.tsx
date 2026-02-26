import { useEffect, useState } from 'react';
import { getSystemPrompt, updateSystemPrompt } from '../api';
import { Save, Loader2, RotateCcw, FileText, Volume2, Brain } from 'lucide-react';
import toast from 'react-hot-toast';

interface AudioSettings {
  scene_pause: number;
  fade_in: number;
  fade_out: number;
}

const AUDIO_LABELS: Record<string, { label: string; desc: string; min: number; max: number; step: number; unit: string }> = {
  scene_pause:   { label: 'Pause zwischen Szenen', desc: 'Stille bei Szenenwechsel', min: 0, max: 5, step: 0.1, unit: 's' },
  fade_in:       { label: 'Fade-In', desc: 'Einblendung am Anfang', min: 0, max: 3, step: 0.1, unit: 's' },
  fade_out:      { label: 'Fade-Out', desc: 'Ausblendung am Ende', min: 0, max: 3, step: 0.1, unit: 's' },
};

const TABS = [
  { id: 'claude', label: 'Claude', icon: Brain },
  { id: 'prompt', label: 'System Prompt', icon: FileText },
  { id: 'audio', label: 'Audio', icon: Volume2 },
] as const;

type TabId = typeof TABS[number]['id'];

export function SettingsPage() {
  const [tab, setTab] = useState<TabId>('claude');
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audio, setAudio] = useState<AudioSettings | null>(null);
  const [originalAudio, setOriginalAudio] = useState<AudioSettings | null>(null);
  const [savingAudio, setSavingAudio] = useState(false);
  const [claude, setClaude] = useState<any>(null);
  const [originalClaude, setOriginalClaude] = useState<any>(null);
  const [savingClaude, setSavingClaude] = useState(false);

  useEffect(() => {
    getSystemPrompt().then((p) => {
      setPrompt(p);
      setOriginalPrompt(p);
      setLoading(false);
    }).catch(() => setLoading(false));
    fetch('/api/settings/audio', { headers: { Authorization: sessionStorage.getItem('fablino_auth') || '' } })
      .then(r => r.json())
      .then(d => { setAudio(d); setOriginalAudio({ ...d }); })
      .catch(() => {});
    fetch('/api/settings/claude', { headers: { Authorization: sessionStorage.getItem('fablino_auth') || '' } })
      .then(r => r.json())
      .then(d => { setClaude(d); setOriginalClaude({ ...d }); })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSystemPrompt(prompt);
      setOriginalPrompt(prompt);
      toast.success('System Prompt gespeichert');
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = prompt !== originalPrompt;
  const audioChanged = audio && originalAudio && JSON.stringify(audio) !== JSON.stringify(originalAudio);
  const claudeChanged = claude && originalClaude && JSON.stringify(claude) !== JSON.stringify(originalClaude);

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

      {/* System Prompt Tab */}
      {tab === 'prompt' && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">System Prompt</h3>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                hasChanges ? 'bg-brand hover:bg-green-700 text-white' : 'bg-surface-alt text-text-muted cursor-not-allowed'
              }`}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Speichern
            </button>
          </div>
          <p className="text-xs text-text-muted">
            Der Basis-Prompt für die Skript-Generierung. Altersregeln, Personalisierung und JSON-Format werden automatisch angehängt.
          </p>
          {loading ? (
            <p className="text-text-muted text-sm">Laden…</p>
          ) : (
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={20}
              className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-brand leading-relaxed"
            />
          )}
          {hasChanges && (
            <button
              onClick={() => setPrompt(originalPrompt)}
              className="text-xs text-text-muted hover:text-text transition-colors"
            >
              Änderungen verwerfen
            </button>
          )}
        </div>
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
                      headers: { 'Content-Type': 'application/json', Authorization: sessionStorage.getItem('fablino_auth') || '' },
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
          <p className="text-xs text-text-muted">
            Gilt für alle neuen Audio-Generierungen. Bestehende Hörspiele sind nicht betroffen.
          </p>
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

      {/* Claude Tab */}
      {tab === 'claude' && claude && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Claude API</h3>
            <div className="flex items-center gap-2">
              {claudeChanged && (
                <button onClick={() => setClaude({ ...originalClaude! })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs text-text-muted hover:text-orange-400 transition-colors">
                  <RotateCcw size={14} /> Reset
                </button>
              )}
              <button onClick={async () => {
                  setSavingClaude(true);
                  try {
                    await fetch('/api/settings/claude', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: sessionStorage.getItem('fablino_auth') || '' },
                      body: JSON.stringify(claude),
                    });
                    setOriginalClaude({ ...claude });
                    toast.success('Claude Settings gespeichert');
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
          <p className="text-xs text-text-muted">
            Parameter für die Skript-Generierung via Claude API.
          </p>
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Modell</span>
                  <span className="text-xs text-text-muted ml-2">— Claude-Modell für Skript-Generierung</span>
                </div>
              </div>
              <select value={claude.model} onChange={e => setClaude({ ...claude, model: e.target.value })}
                className="w-full px-3 py-2 bg-gray-900 border border-border rounded-lg text-sm focus:outline-none focus:border-brand">
                <option value="claude-opus-4-20250514">Claude Opus 4 (beste Qualität)</option>
                <option value="claude-sonnet-4-20250514">Claude Sonnet 4 (schneller, günstiger)</option>
              </select>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Temperature</span>
                  <span className="text-xs text-text-muted ml-2">— Kreativität (0.5 = konsistent, 1.5 = wild)</span>
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
                <span className="text-sm font-mono text-brand">{claude.max_tokens.toLocaleString()}</span>
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
                <span className="text-sm font-mono text-brand">{claude.thinking_budget.toLocaleString()}</span>
              </div>
              <input type="range" min={1000} max={30000} step={1000} value={claude.thinking_budget}
                onChange={e => setClaude({ ...claude, thinking_budget: +e.target.value })}
                className="w-full h-1.5 accent-brand" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
