import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchVoices } from '../api';
import { Mic, Play, Pause, Save, Loader2, Plus, Trash2, RotateCcw } from 'lucide-react';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface VoiceData {
  voice_id: string;
  name: string;
  category: string;
  description: string;
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  traits: string[];
  active: boolean;
}

const CATEGORIES = ['narrator', 'child_m', 'child_f', 'adult_m', 'adult_f', 'elder_m', 'elder_f', 'creature'];
const CATEGORY_LABELS: Record<string, string> = {
  narrator: '🎙️ Erzähler',
  child_m: '👦 Junge',
  child_f: '👧 Mädchen',
  adult_m: '👨 Mann',
  adult_f: '👩 Frau',
  elder_m: '👴 Opa',
  elder_f: '👵 Oma',
  creature: '🐉 Fabelwesen',
};

const PREVIEW_TEXT = 'Oh nein, mein Schläger! Und in zwei Stunden ist das große Turnier!';

function Slider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted w-20 shrink-0">{label}</span>
      <input type="range" min="0" max="1" step="0.05" value={value} onChange={e => onChange(+e.target.value)}
        className="flex-1 h-1.5 accent-brand" />
      <span className="text-xs w-8 text-right font-mono">{value.toFixed(2)}</span>
    </div>
  );
}

function VoiceCard({ voice, onSaved }: { voice: VoiceData; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...voice });
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewText, setPreviewText] = useState(PREVIEW_TEXT);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const settingsChanged = form.stability !== voice.stability || form.similarity_boost !== voice.similarity_boost || form.style !== voice.style || form.use_speaker_boost !== voice.use_speaker_boost;

  const saveMut = useMutation({
    mutationFn: async (data: Partial<VoiceData>) => {
      const res = await fetch(`/api/voices/${voice.voice_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Save failed');
      return res.json();
    },
    onSuccess: () => { toast.success('Gespeichert'); setEditing(false); onSaved(); },
    onError: () => toast.error('Fehler beim Speichern'),
  });

  const deleteMut = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/voices/${voice.voice_id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => { toast.success('Gelöscht'); onSaved(); },
  });

  const stopAudio = () => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
  };

  const preview = async () => {
    if (playing) { stopAudio(); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/voices/${voice.voice_id}/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: previewText,
          stability: form.stability,
          similarity_boost: form.similarity_boost,
          style: form.style,
          use_speaker_boost: form.use_speaker_boost,
        }),
      });
      if (!res.ok) throw new Error('Preview failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setPlaying(false); audioRef.current = null; };
      audio.play();
      setPlaying(true);
    } catch {
      toast.error('Preview fehlgeschlagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-surface border rounded-lg p-4 transition-colors ${voice.active ? 'border-border hover:border-brand/30' : 'border-red-900/30 opacity-60'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center">
            <Mic size={18} className="text-brand" />
          </div>
          <div>
            {editing ? (
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                className="font-medium text-sm bg-gray-900 border border-border rounded px-2 py-0.5" />
            ) : (
              <p className="font-medium text-sm">{voice.name}</p>
            )}
            <p className="text-xs text-text-muted">{CATEGORY_LABELS[voice.category] || voice.category}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {settingsChanged && !editing && (<>
            <button onClick={() => setForm({ ...form, stability: voice.stability, similarity_boost: voice.similarity_boost, style: voice.style, use_speaker_boost: voice.use_speaker_boost })}
              className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-orange-400 transition-colors" title="Zurücksetzen">
              <RotateCcw size={14} />
            </button>
            <button onClick={() => saveMut.mutate({ stability: form.stability, similarity_boost: form.similarity_boost, style: form.style, use_speaker_boost: form.use_speaker_boost })}
              className="p-1.5 rounded bg-brand/15 hover:bg-brand/30 text-brand transition-colors" title="Settings speichern">
              <Save size={14} />
            </button>
          </>)}
          {editing && (
            <button onClick={() => deleteMut.mutate()} className="p-1.5 rounded hover:bg-red-900/30 text-red-400" title="Löschen">
              <Trash2 size={14} />
            </button>
          )}
          <button onClick={() => { if (editing) { saveMut.mutate(form); } else { setEditing(true); } }}
            className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-brand transition-colors" title={editing ? 'Speichern' : 'Bearbeiten'}>
            {editing ? <Save size={14} /> : <Mic size={14} />}
          </button>
        </div>
      </div>

      {editing && (
        <div className="space-y-2 mb-3">
          <div className="flex gap-2">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
              className="text-xs bg-gray-900 border border-border rounded px-2 py-1">
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
            </select>
            <label className="flex items-center gap-1 text-xs text-text-muted">
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
              Aktiv
            </label>
          </div>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
            placeholder="Beschreibung..." className="w-full text-xs bg-gray-900 border border-border rounded px-2 py-1" />
          <input value={(form.traits || []).join(', ')} onChange={e => setForm({ ...form, traits: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
            placeholder="Traits (komma-getrennt)..." className="w-full text-xs bg-gray-900 border border-border rounded px-2 py-1" />
        </div>
      )}

      <div className="text-xs text-text-muted mb-2">{voice.description}</div>
      {voice.traits?.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-3">
          {voice.traits.map(t => (
            <span key={t} className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded">{t}</span>
          ))}
        </div>
      )}

      <div className="space-y-1.5 mb-3">
        <Slider label="Stability" value={form.stability} onChange={v => setForm({ ...form, stability: v })} />
        <Slider label="Similarity" value={form.similarity_boost} onChange={v => setForm({ ...form, similarity_boost: v })} />
        <Slider label="Style" value={form.style} onChange={v => setForm({ ...form, style: v })} />
        <label className="flex items-center gap-2 text-xs text-text-muted">
          <input type="checkbox" checked={form.use_speaker_boost} onChange={e => setForm({ ...form, use_speaker_boost: e.target.checked })} />
          Speaker Boost
        </label>
      </div>

      <div className="flex gap-2">
        <input value={previewText} onChange={e => setPreviewText(e.target.value)}
          className="flex-1 text-xs bg-gray-900 border border-border rounded px-2 py-1.5" placeholder="Preview-Text..." />
        <button onClick={preview} disabled={loading}
          className="flex items-center gap-1 px-3 py-1.5 bg-surface-hover hover:bg-brand/15 border border-border rounded text-xs transition-colors disabled:opacity-50">
          {loading ? <Loader2 size={12} className="animate-spin" /> : playing ? <Pause size={12} /> : <Play size={12} />}
        </button>
      </div>

      <p className="text-[10px] text-text-muted mt-2 font-mono">{voice.voice_id}</p>
    </div>
  );
}

function AddVoiceForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ voice_id: '', name: '', category: 'child_f', description: '' });

  const addMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Create failed');
    },
    onSuccess: () => { toast.success('Voice hinzugefügt'); setOpen(false); setForm({ voice_id: '', name: '', category: 'child_f', description: '' }); onAdded(); },
    onError: () => toast.error('Fehler'),
  });

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
      <Plus size={16} /> Voice hinzufügen
    </button>
  );

  return (
    <div className="bg-surface border border-brand/30 rounded-lg p-4 space-y-3">
      <h3 className="font-medium text-sm">Neue Voice</h3>
      <div className="grid grid-cols-2 gap-2">
        <input value={form.voice_id} onChange={e => setForm({ ...form, voice_id: e.target.value })}
          placeholder="ElevenLabs Voice ID" className="text-xs bg-gray-900 border border-border rounded px-2 py-1.5" />
        <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="Name" className="text-xs bg-gray-900 border border-border rounded px-2 py-1.5" />
        <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
          className="text-xs bg-gray-900 border border-border rounded px-2 py-1.5">
          {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABELS[c] || c}</option>)}
        </select>
        <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Beschreibung" className="text-xs bg-gray-900 border border-border rounded px-2 py-1.5" />
      </div>
      <div className="flex gap-2">
        <button onClick={() => addMut.mutate()} disabled={!form.voice_id || !form.name}
          className="px-3 py-1.5 bg-brand hover:bg-green-700 text-white rounded text-xs font-medium disabled:opacity-50">
          Hinzufügen
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 bg-surface-hover border border-border rounded text-xs">Abbrechen</button>
      </div>
    </div>
  );
}

export function Voices() {
  const qc = useQueryClient();
  const { data: voices = [], isLoading } = useQuery<VoiceData[]>({ queryKey: ['voices'], queryFn: fetchVoices as any });
  const [filter, setFilter] = useState('');

  const categories = CATEGORIES.filter(c => voices.some(v => v.category === c));
  const filtered = filter ? voices.filter(v => v.category === filter) : voices;
  const grouped: Record<string, VoiceData[]> = {};
  filtered.forEach(v => { (grouped[v.category] ??= []).push(v); });

  const refresh = () => qc.invalidateQueries({ queryKey: ['voices'] });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Voice Library</h2>
        <span className="text-sm text-text-muted">{voices.length} Stimmen</span>
      </div>

      <AddVoiceForm onAdded={refresh} />

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${!filter ? 'bg-brand/15 border-brand text-brand' : 'bg-surface border-border text-text-muted hover:bg-surface-hover'}`}>
          Alle
        </button>
        {categories.map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${filter === c ? 'bg-brand/15 border-brand text-brand' : 'bg-surface border-border text-text-muted hover:bg-surface-hover'}`}>
            {CATEGORY_LABELS[c] || c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-text-muted">Lade Stimmen…</p>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => CATEGORIES.indexOf(a) - CATEGORIES.indexOf(b)).map(([cat, vs]) => (
          <div key={cat}>
            <h3 className="text-lg font-semibold mb-3">{CATEGORY_LABELS[cat] || cat} <span className="text-sm text-text-muted font-normal">({vs.length})</span></h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {vs.map(v => <VoiceCard key={v.voice_id} voice={v} onSaved={refresh} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
