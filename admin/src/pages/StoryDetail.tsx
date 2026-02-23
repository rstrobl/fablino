import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchStory, deleteStory, toggleFeatured } from '../api';
import { useAudio } from '../audioContext';
import { ArrowLeft, Play, Star, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function StoryDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { play } = useAudio();
  const { data: story, isLoading } = useQuery({ queryKey: ['story', id], queryFn: () => fetchStory(id!) });

  const delMut = useMutation({
    mutationFn: deleteStory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Deleted'); nav('/stories'); },
  });
  const featMut = useMutation({
    mutationFn: toggleFeatured,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['story', id] }); toast.success('Toggled'); },
  });

  if (isLoading || !story) return <p className="p-6 text-text-muted">Loading…</p>;

  const grouped: Record<number, typeof story.lines> = {};
  story.lines?.forEach((l) => {
    (grouped[l.sceneIdx] ??= []).push(l);
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <button onClick={() => nav('/stories')} className="flex items-center gap-1 text-text-muted hover:text-text text-sm">
        <ArrowLeft size={16} /> Back
      </button>
      <div className="flex gap-6">
        {story.coverUrl && <img src={story.coverUrl} alt="" className="w-48 h-48 rounded-xl object-cover" />}
        <div className="flex-1 space-y-2">
          <h2 className="text-2xl font-bold">{story.title}</h2>
          <p className="text-text-muted text-sm">{story.ageGroup} · {story.mood} · {new Date(story.createdAt).toLocaleDateString()}</p>
          {story.summary && <p className="text-sm">{story.summary}</p>}
          <div className="flex gap-2 mt-3">
            {story.audioPath && (
              <button onClick={() => play(story.id, story.title)} className="flex items-center gap-2 px-4 py-2 bg-brand rounded-lg text-sm text-white hover:bg-brand-light transition-colors">
                <Play size={16} /> Play Audio
              </button>
            )}
            <button onClick={() => featMut.mutate(story.id)} className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors">
              <Star size={16} className={story.featured ? 'text-yellow-400 fill-yellow-400' : ''} />
              {story.featured ? 'Unfeature' : 'Feature'}
            </button>
            <button
              onClick={() => { if (confirm('Delete?')) delMut.mutate(story.id); }}
              className="flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400 hover:bg-red-900/50 transition-colors"
            >
              <Trash2 size={16} /> Delete
            </button>
          </div>
        </div>
      </div>

      {story.characters?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Characters</h3>
          <div className="flex gap-2 flex-wrap">
            {story.characters.map((c) => (
              <span key={c.id} className="px-3 py-1 bg-surface border border-border rounded-full text-sm">
                {c.name} <span className="text-text-muted">({c.gender})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold mb-3">Script</h3>
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([scene, lines]) => (
            <div key={scene} className="bg-surface border border-border rounded-lg p-4">
              <p className="text-xs text-text-muted mb-2">Scene {Number(scene) + 1}</p>
              <div className="space-y-2">
                {lines.sort((a, b) => a.lineIdx - b.lineIdx).map((l) => (
                  <div key={l.id}>
                    <span className="text-brand font-medium text-sm">{l.speaker}:</span>{' '}
                    <span className="text-sm">{l.text}</span>
                    {l.sfx && <span className="text-xs text-text-muted ml-2">🎵 {l.sfx}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && <p className="text-text-muted text-sm">No lines</p>}
        </div>
      </div>
    </div>
  );
}
