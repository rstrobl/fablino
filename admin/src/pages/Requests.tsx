import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Trash2, User, X, Wand2, ArrowLeft, Mail, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { GenerateForm } from '../components/GenerateForm';
import { getAuth } from '../utils/auth';

const API = '/api/requests';

async function fetchRequests() {
  const res = await fetch(API);
  if (!res.ok) throw new Error('Failed to fetch requests');
  return res.json();
}

function timeAgo(date: string) {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `vor ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `vor ${hours}h`;
  const days = Math.floor(hours / 24);
  return `vor ${days}d`;
}

function SourceBadge({ source }: { source: string | null }) {
  if (!source) return null;
  const colors: Record<string, string> = {
    'Direktkontakt': 'bg-green-500/20 text-green-400',
    'Webseite': 'bg-blue-500/20 text-blue-400',
    'Anderes': 'bg-purple-500/20 text-purple-400',
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors[source] || 'bg-gray-500/20 text-gray-400'}`}>{source}</span>;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'done') return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400">Erledigt</span>;
  return <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Offen</span>;
}

export function Requests() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);

  // New request form state
  const [reqName, setReqName] = useState('');
  const [reqAge, setReqAge] = useState('');
  const [reqPrompt, setReqPrompt] = useState('');
  const [reqContact, setReqContact] = useState('');
  const [reqSource, setReqSource] = useState('Direktkontakt');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['requests'],
    queryFn: fetchRequests,
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${API}/${id}`, { method: 'DELETE', headers: { Authorization: getAuth() } });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['requests'] }); toast.success('Anfrage gelöscht'); },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: getAuth() },
        body: JSON.stringify({
          age: reqAge ? parseFloat(reqAge) : undefined,
          prompt: reqPrompt || undefined,
          requesterName: reqName || undefined,
          requesterSource: reqSource || undefined,
          requesterContact: reqContact || undefined,
        }),
      });
      if (!res.ok) throw new Error('Fehler beim Erstellen');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['requests'] });
      toast.success('Anfrage erstellt');
      setShowCreateRequest(false);
      setReqName(''); setReqAge(''); setReqPrompt(''); setReqContact(''); setReqSource('Direktkontakt');
    },
  });

  const filtered = requests
    .filter((s: any) => !search || 
      (s.heroName || '').toLowerCase().includes(search.toLowerCase()) || 
      (s.interests || '').toLowerCase().includes(search.toLowerCase()) || 
      (s.requesterName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.prompt || '').toLowerCase().includes(search.toLowerCase())
    );

  const handleDelete = (id: string) => {
    if (confirm('Anfrage wirklich löschen?')) {
      deleteMut.mutate(id);
      if (selectedRequest?.id === id) setSelectedRequest(null);
    }
  };

  // When creating a story from a request, we build a story-like object for GenerateForm
  const storyFromRequest = selectedRequest ? {
    id: null, // will be created via /api/reserve
    status: 'requested',
    heroName: selectedRequest.heroName || '',
    age: selectedRequest.age || '',
    prompt: selectedRequest.prompt || selectedRequest.interests || '',
    interests: selectedRequest.interests || '',
    title: selectedRequest.heroName ? `${selectedRequest.heroName}s Hörspiel` : '',
    _requestId: selectedRequest.id, // to link back after creation
  } : null;

  // Detail view
  if (selectedRequest && !showGenerateForm) {
    const s = selectedRequest;
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-2xl">
        <button onClick={() => setSelectedRequest(null)} className="flex items-center gap-1 text-text-muted hover:text-text text-sm">
          <ArrowLeft size={16} /> Zurück
        </button>

        <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {s.heroName || s.prompt?.slice(0, 40) || '(Ohne Titel)'}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {s.age && <span className="text-sm text-text-muted">{s.age} Jahre</span>}
                <StatusBadge status={s.status} />
              </div>
            </div>
            <SourceBadge source={s.requesterSource} />
          </div>

          {(s.requesterName || s.requesterContact) && (
            <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-medium text-text-muted mb-2">Kontakt</h3>
              {s.requesterName && (
                <div className="flex items-center gap-2 text-sm">
                  <User size={14} className="text-text-muted" />
                  <span>{s.requesterName}</span>
                </div>
              )}
              {s.requesterContact && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-text-muted" />
                  <span>{s.requesterContact}</span>
                </div>
              )}
            </div>
          )}

          {(s.prompt || s.interests) && (
            <div>
              <h3 className="text-sm font-medium text-text-muted mb-1">Wünsche / Interessen</h3>
              <p className="text-sm whitespace-pre-wrap">{s.prompt || s.interests}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Calendar size={12} />
            <span>Erstellt: {new Date(s.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {s.storyId && (
            <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-3">
              <p className="text-sm text-green-400">✅ Story erstellt — <a href={`/stories/${s.storyId}`} className="underline hover:text-green-300">Zur Story</a></p>
            </div>
          )}

          <div className="flex gap-3 pt-2 border-t border-border">
            {!s.storyId && (
              <button
                onClick={() => setShowGenerateForm(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Wand2 size={16} /> Story erstellen
              </button>
            )}
            <button
              onClick={() => handleDelete(s.id)}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400 hover:bg-red-900/50 transition-colors"
            >
              <Trash2 size={16} /> Löschen
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold">Anfragen</h2>
        <span className="text-sm text-text-muted">{filtered.filter((r: any) => r.status === 'open').length} offen</span>
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
        <button
          onClick={() => setShowCreateRequest(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors text-sm font-medium whitespace-nowrap"
        >
          <Plus size={16} /> Neue Anfrage
        </button>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Laden…</p>
      ) : filtered.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-text-muted">Keine Anfragen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s: any) => (
            <div
              key={s.id}
              onClick={() => setSelectedRequest(s)}
              className="bg-surface border border-border rounded-xl p-4 cursor-pointer hover:border-brand/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">
                      {s.heroName || s.prompt?.slice(0, 50) || '(Ohne Titel)'}
                    </p>
                    {s.age && <span className="text-xs text-text-muted bg-surface-alt px-2 py-0.5 rounded">{s.age} J.</span>}
                    <StatusBadge status={s.status} />
                  </div>
                  {(s.prompt || s.interests) && (
                    <p className="text-sm text-text-muted line-clamp-2 mb-2">{s.prompt || s.interests}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    {s.requesterName && (
                      <span className="flex items-center gap-1">
                        <User size={12} /> {s.requesterName}
                      </span>
                    )}
                    <SourceBadge source={s.requesterSource} />
                    <span>{timeAgo(s.createdAt)}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                  className="text-red-400 hover:text-red-300 p-1 shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Neue Anfrage Modal */}
      {showCreateRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowCreateRequest(false)}>
          <div className="bg-surface border border-border rounded-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <h3 className="text-lg font-bold">Neue Anfrage</h3>
              <button onClick={() => setShowCreateRequest(false)} className="text-text-muted hover:text-text"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-text-muted mb-1">Name des Anfragers</label>
                <input
                  value={reqName}
                  onChange={e => setReqName(e.target.value)}
                  placeholder="z.B. David, Familie Müller…"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Kontakt (Email, Telefon…)</label>
                <input
                  value={reqContact}
                  onChange={e => setReqContact(e.target.value)}
                  placeholder="z.B. david@example.com"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-text-muted mb-1">Quelle</label>
                  <select
                    value={reqSource}
                    onChange={e => setReqSource(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
                  >
                    <option value="Direktkontakt">Direktkontakt</option>
                    <option value="Webseite">Webseite</option>
                    <option value="Anderes">Anderes</option>
                  </select>
                </div>
                <div className="w-24">
                  <label className="block text-sm text-text-muted mb-1">Alter</label>
                  <input
                    value={reqAge}
                    onChange={e => setReqAge(e.target.value)}
                    placeholder="z.B. 5"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-muted mb-1">Wünsche / Interessen</label>
                <textarea
                  value={reqPrompt}
                  onChange={e => setReqPrompt(e.target.value)}
                  placeholder="Was wünscht sich das Kind? Themen, Lieblingsfiguren, Interessen…"
                  rows={3}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand resize-none"
                />
              </div>
              <button
                onClick={() => createMut.mutate()}
                disabled={createMut.isPending}
                className="w-full py-2.5 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors font-medium disabled:opacity-50"
              >
                {createMut.isPending ? 'Erstellen…' : 'Anfrage erstellen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GenerateForm Modal — from request detail */}
      {showGenerateForm && storyFromRequest && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowGenerateForm(false)}>
          <div className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold">Story erstellen</h3>
              <button onClick={() => setShowGenerateForm(false)} className="text-text-muted hover:text-text">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <GenerateForm
                story={storyFromRequest}
                onDone={() => {
                  setShowGenerateForm(false);
                  setSelectedRequest(null);
                  qc.invalidateQueries({ queryKey: ['requests'] });
                  qc.invalidateQueries({ queryKey: ['stories'] });
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
