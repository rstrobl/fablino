import { useQuery } from '@tanstack/react-query';
import { fetchStories, fetchPlayStats } from '../api';
import { BookOpen, Star, Headphones, Play, Clock, FileText, Send, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { data: stories = [], isLoading } = useQuery({ queryKey: ['stories'], queryFn: fetchStories });
  const { data: playStats = [] } = useQuery({ queryKey: ['playStats'], queryFn: fetchPlayStats });

  const playMap = new Map(playStats.map(p => [p.storyId, p.plays]));
  const totalPlays = playStats.reduce((sum, p) => sum + p.plays, 0);

  const produced = stories.filter((s: any) => ['produced', 'sent', 'feedback'].includes(s.status));
  const requests = stories.filter((s: any) => s.status === 'requested');
  const drafts = stories.filter((s: any) => s.status === 'draft');

  const stats = [
    { label: 'Anfragen', value: requests.length, icon: FileText, color: 'text-gray-400', link: '/stories?status=requested' },
    { label: 'Entwürfe', value: drafts.length, icon: Clock, color: 'text-blue-400', link: '/stories?status=draft' },
    { label: 'Hörbücher', value: produced.length, icon: Headphones, color: 'text-purple-400', link: '/stories?status=produced' },
    { label: 'Gesamt Plays', value: totalPlays, icon: Play, color: 'text-brand', link: null },
  ];

  const recentProduced = produced
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {stats.map((s) => {
          const content = (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">{s.label}</p>
                <p className="text-3xl font-bold mt-1">{isLoading ? '—' : s.value}</p>
              </div>
              <s.icon size={28} className={s.color} />
            </div>
          );
          return s.link ? (
            <Link key={s.label} to={s.link} className="bg-surface rounded-xl p-5 border border-border hover:border-brand/50 transition-colors">
              {content}
            </Link>
          ) : (
            <div key={s.label} className="bg-surface rounded-xl p-5 border border-border">
              {content}
            </div>
          );
        })}
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Headphones size={18} /> Fertige Hörbücher</h3>
        {isLoading ? (
          <p className="text-text-muted">Laden…</p>
        ) : recentProduced.length === 0 ? (
          <p className="text-text-muted">Noch keine fertigen Hörbücher.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recentProduced.map((s: any) => (
              <Link
                key={s.id}
                to={`/stories/${s.id}`}
                className="bg-surface border border-border rounded-lg p-3 hover:border-brand/50 transition-colors"
              >
                {s.coverUrl ? (
                  <img src={s.coverUrl.replace('/covers/', '/covers/thumb/').replace(/\.(png|webp)$/, '.jpg')} alt="" className="w-full h-28 object-cover rounded mb-2" />
                ) : (
                  <div className="w-full h-28 rounded bg-surface-alt flex items-center justify-center text-3xl mb-2">🎧</div>
                )}
                <p className="font-medium text-sm truncate">{s.title}</p>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-text-muted">{s.age ? `${s.age} J.` : ''} · {s.requesterName || ''}</p>
                  <span className="flex items-center gap-1 text-xs text-text-muted">
                    <Play size={10} /> {playMap.get(s.id) || 0}
                  </span>
                </div>
                {s.featured && <span className="text-xs text-yellow-400">⭐ Featured</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
