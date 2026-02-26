import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchVoices } from '../api';
import { Pencil, Play, Pause, Loader2, Plus, Trash2, Save } from 'lucide-react';
import { useState, useRef } from 'react';
import toast from 'react-hot-toast';

interface VoiceData {
  voice_id: string;
  name: string;
  category: string;
  gender: string;
  age_min: number;
  age_max: number;
  types: string[];
  voice_character: string;
  active: boolean;
  preview_url?: string;
}

const TYPE_OPTIONS = ['human', 'creature'];
const VOICE_CHARACTER_OPTIONS = ['kind', 'funny', 'evil', 'wise'];
const VC_LABELS: Record<string, string> = { kind: '😊 Kind', funny: '😄 Funny', evil: '😈 Evil', wise: '🦉 Wise' };

const GROUP_LABELS: Record<string, string> = {
  narrator: '🎙️ Erzähler',
  male: '♂ Männlich',
  female: '♀ Weiblich',
};

const GROUP_ORDER = ['narrator', 'male', 'female'];

function voiceGroup(v: VoiceData): string {
  if (v.category === 'narrator') return 'narrator';
  return v.gender || 'male';
}

const PREVIEW_TEXT = 'Oh nein, mein Schläger! Und in zwei Stunden ist das große Turnier!';

function AgeRange({ min, max }: { min: number; max: number }) {
  return <span className="text-xs text-text-muted">{min}–{max} J.</span>;
}

function VoiceCard({ voice, onSaved }: { voice: VoiceData; onSaved: () => void }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...voice });
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [previewText, setPreviewText] = useState(PREVIEW_TEXT);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
        body: JSON.stringify({ text: previewText }),
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
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center text-lg">
            {voice.gender === 'female' ? '♀' : '♂'}
          </div>
          <div>
            <p className="font-medium text-sm">{voice.name}</p>
            <p className="text-xs text-text-muted">
              {voice.age_min}–{voice.age_max} Jahre
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {editing ? (
            <>
              <button onClick={() => { if (confirm('Löschen?')) deleteMut.mutate(); }}
                className="p-1.5 rounded hover:bg-red-900/30 text-red-400" title="Löschen">
                <Trash2 size={14} />
              </button>
              <button onClick={() => saveMut.mutate(form)}
                className="p-1.5 rounded bg-brand/15 hover:bg-brand/30 text-brand" title="Speichern">
                <Save size={14} />
              </button>
            </>
          ) : (
            <button onClick={() => setEditing(true)}
              className="p-1.5 rounded hover:bg-surface-hover text-text-muted hover:text-brand" title="Bearbeiten">
              <Pencil size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Edit mode */}
      {editing && (
        <div className="space-y-2 mb-3 bg-gray-900/50 rounded-lg p-3">
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
            placeholder="Name" className="w-full text-xs bg-gray-900 border border-border rounded px-2 py-1.5" />
          <div className="flex flex-wrap gap-2 items-center">
            <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
              className="text-xs bg-gray-900 border border-border rounded px-2 py-1.5">
              <option value="male">♂ Männl</option>
              <option value="female">♀ Weibl</option>
            </select>
            <div className="flex gap-1 items-center">
              <span className="text-xs text-text-muted">Alter</span>
              <input type="number" value={form.age_min} onChange={e => setForm({ ...form, age_min: +e.target.value })}
                className="w-14 text-xs bg-gray-900 border border-border rounded px-2 py-1.5 text-center" />
              <span className="text-xs text-text-muted">–</span>
              <input type="number" value={form.age_max} onChange={e => setForm({ ...form, age_max: +e.target.value })}
                className="w-14 text-xs bg-gray-900 border border-border rounded px-2 py-1.5 text-center" />
            </div>
            <label className="flex items-center gap-1 text-xs text-text-muted ml-auto">
              <input type="checkbox" checked={form.active} onChange={e => setForm({ ...form, active: e.target.checked })} />
              Aktiv
            </label>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1 items-center">
              <span className="text-xs text-text-muted">Typ</span>
              {TYPE_OPTIONS.map(t => {
                const active = (form.types || []).includes(t);
                return (
                  <button key={t} onClick={() => {
                    const cur = form.types || [];
                    const next = active ? cur.filter((x: string) => x !== t) : [...cur, t];
                    if (next.length > 0) setForm({ ...form, types: next });
                  }}
                    className={`text-xs px-2 py-0.5 rounded border ${active ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-muted'}`}>
                    {t === 'human' ? '👤' : '🧚'} {t}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-1 items-center">
              <span className="text-xs text-text-muted">Stimme</span>
              {VOICE_CHARACTER_OPTIONS.map(vc => (
                <button key={vc} onClick={() => setForm({ ...form, voice_character: vc })}
                  className={`text-xs px-2 py-0.5 rounded border ${form.voice_character === vc ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-muted'}`}>
                  {VC_LABELS[vc]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Display mode */}
      {!editing && (
        <div className="flex gap-2 items-center flex-wrap mb-2">
          <span className="text-xs bg-gray-800 text-text-muted px-2 py-0.5 rounded">
            {(voice.types || []).map(t => t === 'human' ? '👤' : '🧚').join('')} {(voice.types || []).join(', ')}
          </span>
          {voice.voice_character && (
            <span className="text-xs bg-brand/10 text-brand px-2 py-0.5 rounded">
              {VC_LABELS[voice.voice_character] || voice.voice_character}
            </span>
          )}
        </div>
      )}

      {/* Preview */}
      <div className="flex gap-2 mt-2">
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
  const [form, setForm] = useState({
    voice_id: '', name: '', category: 'child_f', gender: 'female' as string,
    age_min: 5, age_max: 12, types: ['human'] as string[], voice_character: 'kind',
  });

  const addMut = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/voices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Create failed');
    },
    onSuccess: () => {
      toast.success('Voice hinzugefügt');
      setOpen(false);
      setForm({ voice_id: '', name: '', category: 'child_f', gender: 'female', age_min: 5, age_max: 12, types: ['human'], voice_character: 'kind' });
      onAdded();
    },
    onError: () => toast.error('Fehler'),
  });

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
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
        <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
          className="text-xs bg-gray-900 border border-border rounded px-2 py-1.5">
          <option value="male">♂ Männlich</option>
          <option value="female">♀ Weiblich</option>
        </select>
        <div className="flex gap-1 items-center">
          <input type="number" value={form.age_min} onChange={e => setForm({ ...form, age_min: +e.target.value })}
            className="w-full text-xs bg-gray-900 border border-border rounded px-2 py-1.5" placeholder="Alter min" />
          <span className="text-xs text-text-muted">–</span>
          <input type="number" value={form.age_max} onChange={e => setForm({ ...form, age_max: +e.target.value })}
            className="w-full text-xs bg-gray-900 border border-border rounded px-2 py-1.5" placeholder="Alter max" />
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-1 items-center">
          <span className="text-xs text-text-muted">Typ</span>
          {TYPE_OPTIONS.map(t => {
            const active = (form.types || []).includes(t);
            return (
              <button key={t} onClick={() => {
                const cur = form.types || [];
                const next = active ? cur.filter((x: string) => x !== t) : [...cur, t];
                if (next.length > 0) setForm({ ...form, types: next });
              }}
                className={`text-xs px-2 py-0.5 rounded border ${active ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-muted'}`}>
                {t === 'human' ? '👤' : '🧚'} {t}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 items-center">
          <span className="text-xs text-text-muted">Stimme</span>
          {VOICE_CHARACTER_OPTIONS.map(vc => (
            <button key={vc} onClick={() => setForm({ ...form, voice_character: vc })}
              className={`text-xs px-2 py-0.5 rounded border ${form.voice_character === vc ? 'border-brand text-brand bg-brand/10' : 'border-border text-text-muted'}`}>
              {VC_LABELS[vc]}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => addMut.mutate()} disabled={!form.voice_id || !form.name}
          className="px-3 py-1.5 bg-brand hover:bg-green-700 text-white rounded text-xs font-medium disabled:opacity-50">
          Hinzufügen
        </button>
        <button onClick={() => setOpen(false)} className="px-3 py-1.5 bg-surface-hover border border-border rounded text-xs">
          Abbrechen
        </button>
      </div>
    </div>
  );
}

export function Voices() {
  const qc = useQueryClient();
  const { data: voices = [], isLoading } = useQuery<VoiceData[]>({ queryKey: ['voices'], queryFn: fetchVoices as any });
  const [filter, setFilter] = useState('');

  const groups = GROUP_ORDER.filter(g => voices.some(v => voiceGroup(v) === g));
  const filtered = filter ? voices.filter(v => voiceGroup(v) === filter) : voices;
  const grouped: Record<string, VoiceData[]> = {};
  filtered.forEach(v => { (grouped[voiceGroup(v)] ??= []).push(v); });

  const refresh = () => qc.invalidateQueries({ queryKey: ['voices'] });

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Voice Library</h2>
        <span className="text-sm text-text-muted">{voices.length} Stimmen</span>
      </div>

      <AddVoiceForm onAdded={refresh} />

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')}
          className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${!filter ? 'bg-brand/15 border-brand text-brand' : 'bg-surface border-border text-text-muted hover:bg-surface-hover'}`}>
          Alle ({voices.length})
        </button>
        {groups.map(g => (
          <button key={g} onClick={() => setFilter(g)}
            className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${filter === g ? 'bg-brand/15 border-brand text-brand' : 'bg-surface border-border text-text-muted hover:bg-surface-hover'}`}>
            {GROUP_LABELS[g] || g} ({voices.filter(v => voiceGroup(v) === g).length})
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-text-muted">Lade Stimmen…</p>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => GROUP_ORDER.indexOf(a) - GROUP_ORDER.indexOf(b)).map(([grp, vs]) => (
          <div key={grp}>
            <h3 className="text-lg font-semibold mb-3">
              {GROUP_LABELS[grp] || grp} <span className="text-sm text-text-muted font-normal">({vs.length})</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {vs.sort((a, b) => (b.active === a.active ? 0 : b.active ? 1 : -1) || a.age_min - b.age_min).map(v => <VoiceCard key={v.voice_id} voice={v} onSaved={refresh} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
