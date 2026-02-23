import { useEffect, useState } from 'react';
import { checkHealth } from '../api';
import { Activity, Server } from 'lucide-react';

export function SettingsPage() {
  const [health, setHealth] = useState<string>('checking…');

  useEffect(() => {
    checkHealth().then((h) => setHealth(h.status));
  }, []);

  const statusColor = health === 'healthy' ? 'text-brand' : health === 'checking…' ? 'text-text-muted' : 'text-red-400';

  return (
    <div className="p-6 space-y-6 max-w-xl">
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
        <div className="text-sm text-text-muted space-y-1">
          <p><strong>Auth:</strong> Basic Auth (admin)</p>
          <p><strong>Proxy:</strong> Vite dev server on port 5175</p>
        </div>
      </div>
    </div>
  );
}
