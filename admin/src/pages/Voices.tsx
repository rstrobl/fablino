import { useQuery } from '@tanstack/react-query';
import { fetchVoices } from '../api';
import { Mic } from 'lucide-react';
import { useState } from 'react';
import type { Voice } from '../types';

export function Voices() {
  const { data: voices = [], isLoading } = useQuery({ queryKey: ['voices'], queryFn: fetchVoices });
  const [filter, setFilter] = useState('');

  const categories = [...new Set(voices.map((v: Voice) => v.category))].sort();
  const filtered = filter ? voices.filter((v: Voice) => v.category === filter) : voices;

  const grouped: Record<string, Voice[]> = {};
  filtered.forEach((v: Voice) => {
    (grouped[v.category] ??= []).push(v);
  });

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">Voice Library</h2>
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilter('')} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${!filter ? 'bg-brand/15 border-brand text-brand' : 'bg-surface border-border text-text-muted hover:bg-surface-hover'}`}>All</button>
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-lg text-sm border transition-colors capitalize ${filter === c ? 'bg-brand/15 border-brand text-brand' : 'bg-surface border-border text-text-muted hover:bg-surface-hover'}`}>{c}</button>
        ))}
      </div>
      {isLoading ? (
        <p className="text-text-muted">Loading…</p>
      ) : (
        Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([cat, vs]) => (
          <div key={cat}>
            <h3 className="text-lg font-semibold capitalize mb-2">{cat}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {vs.map((v) => (
                <div key={v.voice_id} className="bg-surface border border-border rounded-lg p-4 hover:border-brand/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-brand/15 flex items-center justify-center">
                      <Mic size={18} className="text-brand" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{v.name}</p>
                      <p className="text-xs text-text-muted capitalize">{v.category}</p>
                    </div>
                  </div>
                  {v.labels && (
                    <div className="flex gap-1 flex-wrap mt-2">
                      {Object.entries(v.labels).map(([k, val]) => (
                        <span key={k} className="text-xs bg-surface-alt px-2 py-0.5 rounded">{val}</span>
                      ))}
                    </div>
                  )}
                  {v.preview_url && (
                    <audio controls src={v.preview_url} className="mt-2 w-full h-8" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
