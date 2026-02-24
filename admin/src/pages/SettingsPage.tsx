import { useEffect, useState } from 'react';
import { checkHealth, getSystemPrompt, updateSystemPrompt } from '../api';
import { Activity, Server, Save, Loader2, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

interface AudioSettings {
  line_pause: number;
  scene_pause: number;
  fade_in: number;
  fade_out: number;
  loudnorm_lufs: number;
}

const AUDIO_LABELS: Record<string, { label: string; desc: string; min: number; max: number; step: number; unit: string }> = {
  line_pause:    { label: 'Pause zwischen Zeilen', desc: 'Stille zwischen Sprechzeilen', min: 0, max: 3, step: 0.1, unit: 's' },
  scene_pause:   { label: 'Pause zwischen Szenen', desc: 'Längere Pause bei Szenenwechsel', min: 0, max: 5, step: 0.1, unit: 's' },
  fade_in:       { label: 'Fade-In', desc: 'Einblendung am Anfang', min: 0, max: 3, step: 0.1, unit: 's' },
  fade_out:      { label: 'Fade-Out', desc: 'Ausblendung am Ende', min: 0, max: 3, step: 0.1, unit: 's' },
  loudnorm_lufs: { label: 'Loudness (LUFS)', desc: 'Lautstärke-Normalisierung pro Zeile', min: -24, max: -8, step: 1, unit: ' LUFS' },
};

export function SettingsPage() {
  const [health, setHealth] = useState<string>('checking…');
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [audio, setAudio] = useState<AudioSettings | null>(null);
  const [originalAudio, setOriginalAudio] = useState<AudioSettings | null>(null);
  const [savingAudio, setSavingAudio] = useState(false);

  useEffect(() => {
    checkHealth().then((h) => setHealth(h.status));
    getSystemPrompt().then((p) => {
      setPrompt(p);
      setOriginalPrompt(p);
      setLoading(false);
    }).catch(() => setLoading(false));
    fetch('/api/settings/audio', { headers: { Authorization: sessionStorage.getItem('fablino_auth') || '' } })
      .then(r => r.json())
      .then(d => { setAudio(d); setOriginalAudio({ ...d }); })
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
  const statusColor = health === 'healthy' ? 'text-brand' : health === 'checking…' ? 'text-text-muted' : 'text-red-400';

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold">Settings</h2>

      <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Activity size={20} className={statusColor} />
          <div>
            <p className="text-sm font-medium">Backend Health</p>
            <p className={`text-sm capitalize ${statusColor}`}>{health}</p>
          </div>
        </div>
        <hr className="border-border" />
        <div className="flex items-center gap-3">
          <Server size={20} className="text-text-muted" />
          <div>
            <p className="text-sm font-medium">Backend URL</p>
            <p className="text-sm text-text-muted">http://localhost:3001</p>
          </div>
        </div>
      </div>

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

      {audio && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Audio Mix Settings</h3>
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
            Diese Einstellungen gelten für alle neuen Audio-Generierungen. Bestehende Hörspiele sind nicht betroffen.
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
    </div>
  );

}
