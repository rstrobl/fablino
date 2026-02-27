import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, Loader2, RotateCw, Upload, Trash2, Plus } from 'lucide-react';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface SfxEntry {
  id: string;
  name: string;
  category: string;
  file: string;
  active: boolean;
  duration?: number;
  prompt?: string;
}

const API = '/api';

async function fetchSfx(): Promise<SfxEntry[]> {
  const res = await fetch(`${API}/sfx`);
  if (!res.ok) throw new Error('Failed to fetch SFX');
  return res.json();
}

const CATEGORY_LABELS: Record<string, string> = {
  movement: 'Bewegung',
  environment: 'Umgebung',
  nature: 'Natur',
  magic: 'Magie',
  atmosphere: 'Atmosphäre',
  animals: 'Tiere',
  other: 'Sonstiges',
};

const CATEGORY_ORDER = ['movement', 'environment', 'nature', 'magic', 'atmosphere', 'animals', 'other'];

function SfxCard({ sfx, onRefresh }: { sfx: SfxEntry; onRefresh: () => void }) {
  const [playing, setPlaying] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [editPrompt, setEditPrompt] = useState(sfx.prompt || '');
  const [editDuration, setEditDuration] = useState(sfx.duration || 3);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const playAudio = async () => {
    if (playing) {
      audioRef.current?.pause();
      setPlaying(false);
      return;
    }
    try {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
      const audio = new Audio(`${API}/sfx/${sfx.id}/audio?t=${Date.now()}`);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => { setPlaying(false); toast.error('Fehler beim Abspielen'); };
      setPlaying(true);
      await audio.play();
    } catch {
      setPlaying(false);
    }
  };

  const handleReplace = async (prompt?: string) => {
    setReplacing(true);
    setShowPrompt(false);
    try {
      const res = await fetch(`${API}/sfx/${sfx.id}/replace`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt || editPrompt || undefined, duration: editDuration }),
      });
      if (!res.ok) throw new Error();
      toast.success('Neu generiert');
      onRefresh();
      setTimeout(() => playAudio(), 500);
    } catch {
      toast.error('Fehler beim Generieren');
    } finally {
      setReplacing(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await fetch(`${API}/sfx/${sfx.id}/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: file,
      });
      if (!res.ok) throw new Error();
      toast.success('Hochgeladen');
      onRefresh();
      setTimeout(() => playAudio(), 500);
    } catch {
      toast.error('Fehler beim Hochladen');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      const res = await fetch(`${API}/sfx/${sfx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !sfx.active }),
      });
      if (!res.ok) throw new Error();
      onRefresh();
    } catch {
      toast.error('Fehler');
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`"${sfx.name}" wirklich löschen?`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/sfx/${sfx.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Gelöscht');
      onRefresh();
    } catch {
      toast.error('Fehler beim Löschen');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className={`bg-surface border rounded-lg p-4 transition-colors ${sfx.active ? 'border-border hover:border-brand/30' : 'border-red-900/30 opacity-60'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={playAudio}
            disabled={replacing}
            className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center text-brand hover:bg-brand/25 transition-colors disabled:opacity-50"
          >
            {playing ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <div>
            <p className="font-medium text-sm">{sfx.name}</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-text-muted">{sfx.id} · {sfx.duration || 3}s</p>
              {!sfx.active && <span className="text-[10px] text-red-400 bg-red-900/20 px-1.5 rounded">inaktiv</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          <input ref={fileInputRef} type="file" accept="audio/*" onChange={handleUpload} className="hidden" />
          <button onClick={() => { setEditPrompt(sfx.prompt || ''); setEditDuration(sfx.duration || 3); setShowPrompt(true); }} disabled={replacing || uploading || deleting} className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-brand transition-colors disabled:opacity-50" title="Neu generieren">
            {replacing ? <Loader2 size={13} className="animate-spin" /> : <RotateCw size={13} />}
          </button>
          <button onClick={() => fileInputRef.current?.click()} disabled={replacing || uploading || deleting} className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-brand transition-colors disabled:opacity-50" title="Audio hochladen">
            {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          </button>
          <button onClick={handleDelete} disabled={replacing || deleting} className="p-1 rounded hover:bg-red-900/30 text-text-muted hover:text-red-400 transition-colors disabled:opacity-50" title="Löschen">
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
          <label className="p-1 cursor-pointer" title={sfx.active ? 'Deaktivieren' : 'Aktivieren'}>
            <input type="checkbox" checked={sfx.active} onChange={handleToggle} disabled={toggling} className="accent-green-500" />
          </label>
        </div>
      </div>
      {showPrompt && (
        <div className="mt-3 p-3 bg-background border border-border rounded-lg space-y-2">
          <p className="text-xs text-text-muted">ElevenLabs Prompt (Englisch):</p>
          <input
            type="text"
            value={editPrompt}
            onChange={e => setEditPrompt(e.target.value)}
            placeholder="z.B. Horse galloping on dirt road, clear hoofbeats"
            className="w-full bg-surface border border-border rounded px-2 py-1.5 text-sm text-text focus:outline-none focus:border-brand"
            onKeyDown={e => e.key === 'Enter' && handleReplace()}
            autoFocus
          />
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted">Dauer:</label>
            <input type="range" min={0.5} max={22} step={0.5} value={editDuration} onChange={e => setEditDuration(+e.target.value)} className="flex-1 h-1 accent-brand" />
            <span className="text-xs font-mono text-brand w-8">{editDuration}s</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleReplace()}
              className="px-3 py-1 bg-brand text-white text-xs rounded hover:bg-green-700"
            >
              Generieren
            </button>
            <button
              onClick={() => setShowPrompt(false)}
              className="px-3 py-1 text-xs text-text-muted hover:text-text"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function AddSfxForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('other');
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState(3);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || !name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/sfx`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.trim(), name: name.trim(), category, prompt: prompt.trim() || undefined, duration }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Fehler');
      }
      toast.success(`"${name.trim()}" hinzugefügt`);
      setId(''); setName(''); setCategory('other'); setPrompt(''); setDuration(3);
      setOpen(false);
      onAdded();
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Hinzufügen');
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
        <Plus size={16} /> Neuer Effekt
      </button>
    );
  }

  return (
    <div className="bg-surface border border-brand/30 rounded-lg p-4 space-y-3">
      <h3 className="font-medium text-sm">Neuer Soundeffekt</h3>
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-2">
        <input
          value={id}
          onChange={e => setId(e.target.value.replace(/[^a-z0-9_]/g, ''))}
          className="text-xs bg-gray-900 border border-border rounded px-2 py-1.5"
          placeholder="ID (z.B. dog_bark)"
          required
        />
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="text-xs bg-gray-900 border border-border rounded px-2 py-1.5"
          placeholder="Name (z.B. Hund bellt)"
          required
        />
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="text-xs bg-gray-900 border border-border rounded px-2 py-1.5"
        >
          {CATEGORY_ORDER.map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
        <input
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          className="col-span-2 text-xs bg-gray-900 border border-border rounded px-2 py-1.5"
          placeholder="ElevenLabs Prompt (EN), z.B. Horse galloping on dirt road"
        />
        <div className="col-span-2 flex items-center gap-2">
          <label className="text-xs text-text-muted">Dauer:</label>
          <input type="range" min={0.5} max={22} step={0.5} value={duration} onChange={e => setDuration(+e.target.value)} className="flex-1 h-1 accent-brand" />
          <span className="text-xs font-mono text-brand w-8">{duration}s</span>
        </div>
        <div className="flex gap-2">
          <button type="submit" disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-brand hover:bg-green-700 text-white rounded text-xs font-medium disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            {saving ? 'Generiere...' : 'Hinzufügen'}
          </button>
          <button type="button" onClick={() => setOpen(false)}
            className="px-3 py-1.5 bg-surface-hover border border-border rounded text-xs">
            Abbrechen
          </button>
        </div>
      </form>
    </div>
  );
}

export function SoundEffects() {
  const queryClient = useQueryClient();
  const { data: sfx = [], isLoading } = useQuery({ queryKey: ['sfx'], queryFn: fetchSfx });
  const [filter, setFilter] = useState('');

  const onRefresh = () => queryClient.invalidateQueries({ queryKey: ['sfx'] });

  const categories = CATEGORY_ORDER.filter(c => sfx.some(s => s.category === c));
  const filtered = filter ? sfx.filter(s => s.category === filter) : sfx;
  const grouped: Record<string, SfxEntry[]> = {};
  filtered.forEach(s => { (grouped[s.category] ??= []).push(s); });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Soundeffekte</h2>
        <span className="text-sm text-text-muted">{sfx.length} Effekte</span>
      </div>

      <AddSfxForm onAdded={onRefresh} />

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${!filter ? 'bg-brand/15 border-brand text-brand' : 'bg-surface border-border text-text-muted hover:bg-surface-hover'}`}>
          Alle ({sfx.length})
        </button>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${filter === c ? 'bg-brand/15 border-brand text-brand' : 'bg-surface border-border text-text-muted hover:bg-surface-hover'}`}>
            {CATEGORY_LABELS[c]} ({sfx.filter(s => s.category === c).length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-text-muted">Lade Soundeffekte…</p>
      ) : (
        Object.entries(grouped)
          .sort(([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b))
          .map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-lg font-semibold mb-3">
                {CATEGORY_LABELS[cat]} <span className="text-sm text-text-muted font-normal">({items.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {items.sort((a, b) => (b.active === a.active ? 0 : b.active ? 1 : -1)).map(s => <SfxCard key={s.id} sfx={s} onRefresh={onRefresh} />)}
              </div>
            </div>
          ))
      )}
    </div>
  );
}
