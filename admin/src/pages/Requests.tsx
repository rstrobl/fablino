import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStories, deleteStory } from '../api';
import { Search, Plus, Trash2, User, X, Wand2, ArrowLeft, Mail, Calendar, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { GenerateForm } from '../components/GenerateForm';

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
  };
  return <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${colors[source] || 'bg-gray-500/20 text-gray-400'}`}>{source}</span>;
}

export function Requests() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedStory, setSelectedStory] = useState<any | null>(null);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  const { data: stories = [], isLoading } = useQuery({
    queryKey: ['stories'],
    queryFn: fetchStories,
  });

  const delMut = useMutation({
    mutationFn: deleteStory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Anfrage gelöscht'); },
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
    setShowCreate(false);
    setSelectedStory(null);
    qc.invalidateQueries({ queryKey: ['stories'] });
  };

  const handleDelete = (id: string) => {
    if (confirm('Anfrage wirklich löschen?')) {
      delMut.mutate(id);
      if (selectedStory?.id === id) setSelectedStory(null);
    }
  };

  const blankStory = {
    id: null,
    status: 'requested',
    heroName: '',
    age: '',
    prompt: '',
    interests: '',
    title: '',
  };

  const generateStory = showCreate ? blankStory : selectedStory;

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
          {(s.requesterName || s.requesterEmail || s.requesterPhone) && (
            <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
              <h3 className="text-sm font-medium text-text-muted mb-2">Kontakt</h3>
              {s.requesterName && (
                <div className="flex items-center gap-2 text-sm">
                  <User size={14} className="text-text-muted" />
                  <span>{s.requesterName}</span>
                </div>
              )}
              {s.requesterEmail && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail size={14} className="text-text-muted" />
                  <a href={`mailto:${s.requesterEmail}`} className="text-brand hover:underline">{s.requesterEmail}</a>
                </div>
              )}
              {s.requesterPhone && (
                <div className="flex items-center gap-2 text-sm">
                  <MessageSquare size={14} className="text-text-muted" />
                  <span>{s.requesterPhone}</span>
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
          onClick={() => setShowCreate(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors text-sm font-medium whitespace-nowrap"
        >
          <Plus size={16} /> Neue Story
        </button>
      </div>

      {isLoading ? (
        <p className="text-text-muted">Laden…</p>
      ) : requests.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <p className="text-text-muted">Keine offenen Anfragen</p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-brand text-white rounded-lg hover:bg-brand/90 transition-colors text-sm font-medium mx-auto"
          >
            <Wand2 size={16} /> Neue Story erstellen
          </button>
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

      {/* GenerateForm Modal — either from request detail or "Neue Story" */}
      {(showGenerateForm || showCreate) && generateStory && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => { setShowGenerateForm(false); setShowCreate(false); }}>
          <div className="bg-surface border border-border rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
              <h3 className="text-lg font-bold">
                {showCreate ? 'Neue Story erstellen' : `Story: ${generateStory.heroName || generateStory.title || '(Ohne Titel)'}`}
              </h3>
              <button onClick={() => { setShowGenerateForm(false); setShowCreate(false); }} className="text-text-muted hover:text-text">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <GenerateForm
                story={generateStory}
                onDone={handleDone}
                onDelete={generateStory.id ? () => handleDelete(generateStory.id) : undefined}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
