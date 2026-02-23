import { useQuery } from '@tanstack/react-query';
import { fetchStories, fetchWaitlist } from '../api';
import { BookOpen, Star, Users, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Dashboard() {
  const { data: stories = [], isLoading: sl } = useQuery({ queryKey: ['stories'], queryFn: fetchStories });
  const { data: waitlist = [], isLoading: wl } = useQuery({ queryKey: ['waitlist'], queryFn: fetchWaitlist });

  const stats = [
    { label: 'Total Stories', value: stories.length, icon: BookOpen, color: 'text-blue-400' },
    { label: 'Featured', value: stories.filter((s) => s.featured).length, icon: Star, color: 'text-yellow-400' },
    { label: 'Waitlist', value: waitlist.length, icon: Users, color: 'text-brand' },
  ];

  const recent = [...stories].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8);

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Dashboard</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-surface rounded-xl p-5 border border-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">{s.label}</p>
                <p className="text-3xl font-bold mt-1">{sl || wl ? '—' : s.value}</p>
              </div>
              <s.icon size={28} className={s.color} />
            </div>
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2"><Clock size={18} /> Recent Stories</h3>
        {sl ? (
          <p className="text-text-muted">Loading…</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {recent.map((s) => (
              <Link
                key={s.id}
                to={`/stories/${s.id}`}
                className="bg-surface border border-border rounded-lg p-3 hover:border-brand/50 transition-colors"
              >
                {s.coverUrl && (
                  <img src={s.coverUrl} alt="" className="w-full h-28 object-cover rounded mb-2" />
                )}
                <p className="font-medium text-sm truncate">{s.title}</p>
                <p className="text-xs text-text-muted mt-1">{s.ageGroup} · {new Date(s.createdAt).toLocaleDateString()}</p>
                {s.featured && <span className="text-xs text-yellow-400">⭐ Featured</span>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
