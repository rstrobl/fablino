import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStories, deleteStory } from '../api';
import { Search, Plus, Trash2, User, X, Wand2, ArrowLeft, Mail, Calendar, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { GenerateForm } from '../components/GenerateForm';
import { getAuth } from '../utils/auth';

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
    'Antler WhatsApp': 'bg-amber-500/20 text-amber-400',
    'Freund': 'bg-blue-500/20 text-blue-400',
    'Direktkontakt': 'bg-green-500/20 text-green-400',
    'Manuell': 'bg-purple-500/20 text-purple-400',
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors[source] || 'bg-gray-500/20 text-gray-400'}`}>{source}</span>;
}

export function Requests() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [showCreateRequest, setShowCreateRequest] = useState(false);

  // New request form state
  const [reqName, setReqName] = useState('');
  const [reqAge, setReqAge] = useState('');
  const [reqHero, setReqHero] = useState('');
  const [reqPrompt, setReqPrompt] = useState('');
  const [reqContact, setReqContact] = useState('');
  const [reqSource, setReqSource] = useState('Manuell');

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: fetchStories,
  });

  const delMut = useMutation({
    mutationFn: deleteStory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Anfrage gelöscht'); },
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reserve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: getAuth() },
        body: JSON.stringify({
          heroName: reqHero || undefined,
          heroAge: reqAge || undefined,
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
      qc.invalidateQueries({ queryKey: ['stories'] });
      toast.success('Anfrage erstellt');
      setShowCreateRequest(false);
      setReqName(''); setReqAge(''); setReqHero(''); setReqPrompt(''); setReqContact(''); setReqSource('Manuell');
    },
  });

  const requests = stories
    .filter((s: any) => s.status === 'requested')
    .filter((s: any) => !search || 
      (s.title || '').toLowerCase().includes(search.toLowerCase()) || 
      (s.interests || '').toLowerCase().includes(search.toLowerCase()) || 
      (s.requesterName || '').toLowerCase().includes(search.toLowerCase()) ||
      (s.prompt || '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleDone = () => {
    setShowGenerateForm(false);
    setSelectedStory(null);
    qc.invalidateQueries({ queryKey: ['stories'] });
  };

  const handleDelete = (id: string) => {
    if (confirm('Anfrage wirklich löschen?')) {
      delMut.mutate(id);
      if (selectedStory?.id === id) setSelectedStory(null);
    }
  };

  // Detail view for a selected request
  if (selectedStory && !showGenerateForm) {
    const s = selectedStory;
    return (
      <div className="p-4 md:p-6 space-y-4 max-w-2xl">
        <button onClick={() => setSelectedStory(null)} className="flex items-center gap-1 text-text-muted hover:text-text text-sm">
          <ArrowLeft size={16} /> Zurück
        </button>

        <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold">
                {s.heroName || s.title?.replace(/s Hörspiel$/, '') || s.title || '(Ohne Titel)'}
              </h2>
              {s.age && <span className="text-sm text-text-muted">{s.age} Jahre</span>}
            </div>
            <SourceBadge source={s.requesterSource} />
          </div>

          {/* Contact info */}
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

          {/* Story details */}
          {(s.prompt || s.interests) && (
            <div>
              <h3 className="text-sm font-medium text-text-muted mb-1">Beschreibung / Interessen</h3>
              <p className="text-sm whitespace-pre-wrap">{s.prompt || s.interests}</p>
            </div>
          )}

          {s.heroName && (
            <div>
              <h3 className="text-sm font-medium text-text-muted mb-1">Held</h3>
              <p className="text-sm">{s.heroName}</p>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-text-muted">
            <Calendar size={12} />
            <span>Erstellt: {new Date(s.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2 border-t border-border">
            <button
              onClick={() => setShowGenerateForm(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Wand2 size={16} /> Story erstellen
            </button>
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
        <span className="text-sm text-text-muted">{requests.length} offen</span>
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
      ) : requests.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-text-muted">Keine offenen Anfragen</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((s: any) => (
            <div
              key={s.id}
              onClick={() => setSelectedStory(s)}
              className="bg-surface border border-border rounded-xl p-4 cursor-pointer hover:border-brand/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-sm">
                      {s.heroName || s.title?.replace(/s Hörspiel$/, '') || s.title || '(Ohne Titel)'}
                    </p>
                    {s.age && <span className="text-xs text-text-muted bg-surface-alt px-2 py-0.5 rounded">{s.age} J.</span>}
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
                    <option value="Manuell">Manuell</option>
                    <option value="Antler WhatsApp">Antler WhatsApp</option>
                    <option value="Freund">Freund</option>
                    <option value="Direktkontakt">Direktkontakt</option>
                    <option value="Webseite">Webseite</option>
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
                <label className="block text-sm text-text-muted mb-1">Name der Hauptfigur (optional)</label>
                <input
                  value={reqHero}
                  onChange={e => setReqHero(e.target.value)}
                  placeholder="z.B. Laura, Captain Blubber…"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
                />
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
      {showGenerateForm && selectedStory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setShowGenerateForm(false)}>
          <div className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold">
                Story: {selectedStory.heroName || selectedStory.title || '(Ohne Titel)'}
              </h3>
              <button onClick={() => setShowGenerateForm(false)} className="text-text-muted hover:text-text">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <GenerateForm
                story={selectedStory}
                onDone={handleDone}
                onDelete={() => handleDelete(selectedStory.id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
