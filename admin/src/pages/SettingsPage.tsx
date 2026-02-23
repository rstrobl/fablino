import { useEffect, useState } from 'react';
import { checkHealth, getSystemPrompt, updateSystemPrompt } from '../api';
import { Activity, Server, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function SettingsPage() {
  const [health, setHealth] = useState<string>('checking…');
  const [prompt, setPrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkHealth().then((h) => setHealth(h.status));
    getSystemPrompt().then((p) => {
      setPrompt(p);
      setOriginalPrompt(p);
      setLoading(false);
    }).catch(() => setLoading(false));
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
    </div>
  );
}
