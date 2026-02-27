import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStories, deleteStory, toggleFeatured, fetchPlayStats } from '../api';
import { Star, Trash2, Search, Play, User, Clock, Headphones, Copy } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

function timeAgo(date: string) {
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `vor ${days} T.`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `vor ${weeks} Wo.`;
  const months = Math.floor(days / 30);
  return `vor ${months} Mon.`;
}

const STATUSES = [
  { value: 'draft', label: 'Entwürfe', icon: 'Clock', color: 'bg-blue-600' },
  { value: 'published', label: 'Hörbücher', icon: 'Headphones', color: 'bg-green-600' },
];

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const colors: Record<string, string> = {
    'Antler WhatsApp': 'bg-amber-500/20 text-amber-400',
    'Freund': 'bg-blue-500/20 text-blue-400',
    'Direktkontakt': 'bg-green-500/20 text-green-400',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colors[source] || 'bg-gray-500/20 text-gray-400'}`}>
      {source}
    </span>
  );
}

export function Stories() {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: stories = [], isLoading } = useQuery({ queryKey: ['stories'], queryFn: fetchStories });
  const { data: playStats = [] } = useQuery({ queryKey: ['playStats'], queryFn: fetchPlayStats });
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const statusFilter = searchParams.get('status') || 'draft';
  const setStatusFilter = (status: string) => setSearchParams({ status });

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
    .filter((s: any) => !search || (s.title || '').toLowerCase().includes(search.toLowerCase()) || (s.interests || '').toLowerCase().includes(search.toLowerCase()) || (s.requesterName || '').toLowerCase().includes(search.toLowerCase()))
    .filter((s: any) => {
      if (!statusFilter) return true;
      if (statusFilter === 'draft') return ['draft', 'produced'].includes(s.status);
      if (statusFilter === 'published') return ['published', 'feedback'].includes(s.status);
      return s.status === statusFilter;
    })
    .sort((a: any, b: any) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

  const pipelineCounts = STATUSES.map(s => ({
    ...s,
    count: stories.filter((st: any) => {
      if (s.value === 'draft') return ['draft', 'produced'].includes(st.status);
      if (s.value === 'published') return ['published', 'feedback'].includes(st.status);
      return st.status === s.value;
    }).length,
  }));

  const isDraftStage = statusFilter === 'draft';
  const isLateStage = statusFilter === 'published' || statusFilter === 'feedback';

  return (
    <div className="p-4 md:p-6 space-y-4">
      <h2 className="text-xl md:text-2xl font-bold">Stories</h2>

      {/* Pipeline overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {pipelineCounts.map((s) => {
          const Icon = s.icon === 'Clock' ? Clock : Headphones;
          return (
            <Link
              key={s.value}
              to={`/stories?status=${s.value}`}
              onClick={(e) => { e.preventDefault(); setStatusFilter(s.value); }}
              className={`p-5 rounded-xl border transition-colors text-left block ${
                statusFilter === s.value ? 'border-brand bg-brand/10' : 'border-border bg-surface hover:border-brand/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-muted text-sm">{s.label}</p>
                  <p className="text-3xl font-bold mt-1">{s.count}</p>
                </div>
                <Icon size={28} className="text-text-muted" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            placeholder="Suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Laden…</p>
      ) : (
        <>
        {/* Mobile: Card layout */}
        <div className="md:hidden space-y-3">
          {filtered.map((s: any) => (
            <div key={s.id} className="bg-surface border border-border rounded-xl p-3 cursor-pointer hover:border-brand/30 transition-colors" onClick={(e) => { if (!(e.target as HTMLElement).closest('button, select')) nav(`/stories/${s.id}`); }}>
              <div className="flex gap-3">
                {s.coverUrl ? (
                  <img src={s.coverUrl.replace('/covers/', '/covers/thumb/').replace(/\.(png|webp)$/, '.jpg')} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-surface-alt flex items-center justify-center text-text-muted text-lg shrink-0">📖</div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {false ? (s.heroName || s.title?.replace(/s Hörspiel$/, '') || s.title || '(Untitled)') : (s.title || '(Untitled)')}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    {s.age ? `${s.age} J.` : ''} · {timeAgo(s.updatedAt || s.createdAt)}
                    {isLateStage && s.durationSeconds ? ` · ${Math.floor(s.durationSeconds / 60)}:${String(s.durationSeconds % 60).padStart(2, '0')}` : ''}
                  </p>
                  {isDraftStage && s.interests && <p className="text-xs text-text-muted mt-1 line-clamp-1">{s.interests}</p>}
                  {isDraftStage && s.requesterName && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <User size={10} className="text-text-muted" />
                      <span className="text-xs text-text-muted">{s.requesterName}</span>
                      <SourceBadge source={s.requesterSource} />
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {isLateStage && (
                    <span className="flex items-center gap-1 text-xs text-text-muted">
                      <Play size={10} /> {playMap.get(s.id) || 0}
                    </span>
                  )}
                  {isLateStage && s.featured && <Star size={14} className="text-yellow-400 fill-yellow-400" />}
                  <button onClick={(e) => { e.stopPropagation(); if (confirm('Story wirklich löschen?')) delMut.mutate(s.id); }}
                    className="text-red-400 p-1"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <p className="py-8 text-center text-text-muted">Keine Stories gefunden</p>}
        </div>

        {/* Desktop: Table layout */}
        <div className="hidden md:block bg-surface border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-left">
                <th className="p-3">Cover</th>
                <th className="p-3">{false ? 'Held' : 'Titel'}</th>
                {(isLateStage || isDraftStage) && <th className="p-3">Kind</th>}
                <th className="p-3">Alter</th>
                {isDraftStage && <th className="p-3">Interessen</th>}
                {isDraftStage && <th className="p-3">Anfrage von</th>}
                {isLateStage && <th className="p-3">Länge</th>}
                {isLateStage && <th className="p-3">Plays</th>}
                <th className="p-3">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s: any) => (
                <tr key={s.id} className="border-b border-border hover:bg-surface-hover transition-colors cursor-pointer" onClick={(e) => { if (!(e.target as HTMLElement).closest('button, select')) nav(`/stories/${s.id}`); }}>
                  <td className="p-3">
                    {s.coverUrl ? (
                      <img src={s.coverUrl.replace('/covers/', '/covers/thumb/').replace(/\.(png|webp)$/, '.jpg')} alt="" className="w-12 h-12 rounded object-cover" />
                    ) : (
                      <div className="w-12 h-12 rounded bg-surface-alt flex items-center justify-center text-text-muted text-lg">📖</div>
                    )}
                  </td>
                  <td className="p-3">
                    <Link to={`/stories/${s.id}`} className="hover:text-brand transition-colors font-medium">
                      {false ? (s.heroName || s.title?.replace(/s Hörspiel$/, '') || s.title || '(Untitled)') : (s.title || '(Untitled)')}
                    </Link>
                    <span className="block text-xs text-text-muted mt-0.5">{timeAgo(s.updatedAt || s.createdAt)}</span>
                  </td>
                  {(isLateStage || isDraftStage) && (
                    <td className="p-3 whitespace-nowrap">{s.heroName || s.characters?.find((c: any) => c.name !== 'Erzähler')?.name || '—'}</td>
                  )}
                  <td className="p-3 whitespace-nowrap">{s.age ? `${s.age} J.` : '—'}</td>
                  {isDraftStage && <td className="p-3 max-w-xs"><p className="text-text-muted text-xs line-clamp-2">{s.interests || '—'}</p></td>}
                  {isDraftStage && (
                    <td className="p-3">
                      {(s.requesterName || s.requesterContact) ? (
                        <div className="flex flex-col gap-0.5">
                          {s.requesterName && <span className="flex items-center gap-1 text-sm"><User size={12} className="text-text-muted" />{s.requesterName}</span>}
                          <SourceBadge source={s.requesterSource} />
                          {s.requesterContact && <span className="text-xs text-text-muted">{s.requesterContact}</span>}
                        </div>
                      ) : <span className="text-text-muted">—</span>}
                    </td>
                  )}
                  {isLateStage && <td className="p-3 text-text-muted whitespace-nowrap">{s.durationSeconds ? `${Math.floor(s.durationSeconds / 60)}:${String(s.durationSeconds % 60).padStart(2, '0')}` : '—'}</td>}
                  {isLateStage && <td className="p-3"><span className="flex items-center gap-1 text-text-muted"><Play size={12} /> {playMap.get(s.id) || 0}</span></td>}
                  <td className="p-3 flex items-center gap-1">
                    {isLateStage && <button onClick={() => featMut.mutate(s.id)} className="hover:scale-110 transition-transform p-2 rounded-lg hover:bg-yellow-900/20" title={s.featured ? 'Featured entfernen' : 'Als Featured markieren'}><Star size={16} className={s.featured ? 'text-yellow-400 fill-yellow-400' : 'text-text-muted'} /></button>}
                    {isLateStage && <button onClick={() => { navigator.clipboard.writeText(`https://fablino.de/story/${s.id}`); toast.success('Link kopiert'); }} className="text-text-muted hover:text-brand hover:bg-brand/10 transition-colors p-2 rounded-lg" title="Link kopieren"><Copy size={16} /></button>}
                    <button onClick={() => { if (confirm('Story wirklich löschen?')) delMut.mutate(s.id); }} className="text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors p-2 rounded-lg"><Trash2 size={16} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="p-6 text-center text-text-muted">Keine Stories gefunden</p>}
        </div>
        </>
      )}
    </div>
  );
}
