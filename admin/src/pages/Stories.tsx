import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStories, deleteStory, toggleFeatured, updateStoryStatus, fetchPlayStats } from '../api';
import { Star, Trash2, Search, Play } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

const STATUSES = [
  { value: 'requested', label: 'Anfrage', color: 'bg-gray-500' },
  { value: 'draft', label: 'Entwurf', color: 'bg-blue-500' },
  { value: 'produced', label: 'Hörbuch', color: 'bg-purple-500' },
  { value: 'sent', label: 'Verschickt', color: 'bg-orange-500' },
  { value: 'feedback', label: 'Feedback', color: 'bg-green-500' },
];

function StatusBadge({ status, storyId }: { status: string; storyId: string }) {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateStoryStatus(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Status aktualisiert'); },
  });

  const current = STATUSES.find(s => s.value === status) || STATUSES[0];

  return (
    <select
      value={status}
      onChange={(e) => mut.mutate({ id: storyId, status: e.target.value })}
      className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${current.color} text-white`}
    >
      {STATUSES.map(s => (
        <option key={s.value} value={s.value}>{s.label}</option>
      ))}
    </select>
  );
}

export function Stories() {
  const qc = useQueryClient();
  const { data: stories = [], isLoading } = useQuery({ queryKey: ['stories'], queryFn: fetchStories });
  const { data: playStats = [] } = useQuery({ queryKey: ['playStats'], queryFn: fetchPlayStats });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const playMap = new Map(playStats.map(p => [p.storyId, p.plays]));

  const delMut = useMutation({
    mutationFn: deleteStory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Story gelöscht'); },
  });
  const featMut = useMutation({
    mutationFn: toggleFeatured,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Featured aktualisiert'); },
  });

  const filtered = stories
    .filter((s: any) => !search || (s.title || '').toLowerCase().includes(search.toLowerCase()))
    .filter((s: any) => !statusFilter || s.status === statusFilter)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Pipeline summary
  const pipelineCounts = STATUSES.map(s => ({
    ...s,
    count: stories.filter((st: any) => st.status === s.value).length,
  }));

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Stories</h2>

      {/* Pipeline overview */}
      <div className="flex gap-2">
        {pipelineCounts.map((s, i) => (
          <button
            key={s.value}
            onClick={() => setStatusFilter(statusFilter === s.value ? '' : s.value)}
            className={`flex-1 p-3 rounded-lg border transition-colors text-center ${
              statusFilter === s.value ? 'border-brand bg-brand/10' : 'border-border bg-surface hover:bg-surface-hover'
            }`}
          >
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-xs text-text-muted">{s.label}</span>
            </div>
            <span className="text-xl font-bold">{s.count}</span>
            {i < pipelineCounts.length - 1 && (
              <span className="hidden">→</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            placeholder="Stories suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Laden…</p>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-left">
                <th className="p-3">Cover</th>
                <th className="p-3">Titel</th>
                <th className="p-3">Status</th>
                <th className="p-3">Plays</th>
                <th className="p-3">Alter</th>
                <th className="p-3">Datum</th>
                <th className="p-3">Featured</th>
                <th className="p-3">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: any) => (
                <tr key={s.id} className="border-b border-border hover:bg-surface-hover transition-colors">
                  <td className="p-3">
                    {s.coverUrl ? (
                      <img src={s.coverUrl} alt="" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-surface-alt" />
                    )}
                  </td>
                  <td className="p-3">
                    <Link to={`/stories/${s.id}`} className="hover:text-brand transition-colors">{s.title || '(Untitled)'}</Link>
                  </td>
                  <td className="p-3">
                    <StatusBadge status={s.status || 'requested'} storyId={s.id} />
                  </td>
                  <td className="p-3">
                    <span className="flex items-center gap-1 text-text-muted">
                      <Play size={12} /> {playMap.get(s.id) || 0}
                    </span>
                  </td>
                  <td className="p-3">{s.ageGroup}</td>
                  <td className="p-3 text-text-muted">{new Date(s.createdAt).toLocaleDateString('de-DE')}</td>
                  <td className="p-3">
                    <button onClick={() => featMut.mutate(s.id)} className="hover:scale-110 transition-transform">
                      <Star size={18} className={s.featured ? 'text-yellow-400 fill-yellow-400' : 'text-text-muted'} />
                    </button>
                  </td>
                  <td className="p-3">
                    <button
                      onClick={() => { if (confirm('Story wirklich löschen?')) delMut.mutate(s.id); }}
                      className="text-red-400 hover:text-red-300 transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-6 text-center text-text-muted">Keine Stories gefunden</p>}
        </div>
      )}
    </div>
  );
}
