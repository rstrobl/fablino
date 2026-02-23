import { useState } from 'react';
import { useAuth } from '../auth';
import { Lock } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (!ok) setError(true);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-600/20 mb-4">
            <Lock className="w-8 h-8 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Fablino Admin</h1>
          <p className="text-gray-400 mt-1">Melde dich an um fortzufahren</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Benutzername</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 transition-colors"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-green-500 transition-colors"
            />
          </div>
          {error && (
            <p className="text-red-400 text-sm">Falsche Anmeldedaten. Versuch es nochmal.</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Prüfe...' : 'Anmelden'}
          </button>
        </form>
      </div>
    </div>
  );
}
