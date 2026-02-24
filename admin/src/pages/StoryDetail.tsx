import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchStory, deleteStory, toggleFeatured, updateStoryStatus } from '../api';
import { useAudio } from '../audioContext';
import { ArrowLeft, Play, Star, Trash2, Check, Copy } from 'lucide-react';
import toast from 'react-hot-toast';
import { TwemojiIcon } from '../charEmoji';
import { GenerateForm } from '../components/GenerateForm';
import { DraftPreview } from '../components/DraftPreview';
import { ScriptLine } from '../components/ScriptLine';

export function StoryDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { play } = useAudio();
  const { data: story, isLoading } = useQuery({ queryKey: ['story', id], queryFn: () => fetchStory(id!) });
  const { data: allVoices = [] } = useQuery({ queryKey: ['voices'], queryFn: () => fetch('/api/voices').then(r => r.json()) });
  const { data: costsData } = useQuery({ queryKey: ['costs', id], queryFn: () => fetch(`/api/stories/${id}/costs`).then(r => r.json()), enabled: !!id });
  const voiceSettings: Record<string, any> = {};
  (allVoices as any[]).forEach((v: any) => {
    voiceSettings[v.voice_id] = { stability: v.stability, similarity_boost: v.similarity_boost, style: v.style, use_speaker_boost: v.use_speaker_boost };
  });

  const delMut = useMutation({
    mutationFn: deleteStory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Gelöscht'); nav('/stories'); },
  });
  const featMut = useMutation({
    mutationFn: toggleFeatured,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['story', id] }); toast.success('Featured aktualisiert'); },
  });

  if (isLoading || !story) return <p className="p-6 text-text-muted">Laden…</p>;

  const isRequested = (story as any).status === 'requested';
  const isDraft = (story as any).status === 'draft';

  const grouped: Record<number, typeof story.lines> = {};
  story.lines?.forEach((l) => {
    (grouped[l.sceneIdx] ??= []).push(l);
  });

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <button onClick={() => nav('/stories')} className="flex items-center gap-1 text-text-muted hover:text-text text-sm">
        <ArrowLeft size={16} /> Zurück
      </button>

      <div className="flex gap-6">
        {story.coverUrl ? (
          <img src={story.coverUrl} alt="" className="w-48 h-48 rounded-xl object-cover" />
        ) : (
          <div className="w-48 h-48 rounded-xl bg-surface-alt flex items-center justify-center text-5xl">📖</div>
        )}
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold">{story.title}</h2>
            {costsData?.costs?.length > 0 && (
              <details className="ml-auto shrink-0">
                <summary className="text-sm font-medium text-text-muted cursor-pointer hover:text-text bg-surface border border-border rounded-lg px-3 py-1.5">
                  💰 {(costsData.totals.total * 0.92).toFixed(2)} €
                </summary>
                <div className="absolute right-6 mt-1 bg-surface border border-border rounded-lg p-3 shadow-lg z-10 space-y-1 min-w-[200px]">
                  {(() => {
                    const cl = costsData.costs.filter((c: any) => c.service === 'claude');
                    const el = costsData.costs.filter((c: any) => c.service === 'elevenlabs');
                    const rp = costsData.costs.filter((c: any) => c.service === 'replicate');
                    const sumInput = cl.reduce((s: number, c: any) => s + (c.inputTokens || 0), 0);
                    const sumOutput = cl.reduce((s: number, c: any) => s + (c.outputTokens || 0), 0);
                    const elChars = el.reduce((s: number, c: any) => s + (c.characters || 0), 0);
                    const elCost = el.reduce((s: number, c: any) => s + Number(c.costUsd), 0);
                    const rpCount = rp.length;
                    const rpCost = rp.reduce((s: number, c: any) => s + Number(c.costUsd), 0);
                    const inputCost = cl.reduce((s: number, c: any) => s + (c.inputTokens || 0) * 15 / 1_000_000, 0);
                    const outputCost = cl.reduce((s: number, c: any) => s + (c.outputTokens || 0) * 75 / 1_000_000, 0);
                    return (<>
                      {sumInput > 0 && <div className="flex justify-between text-xs gap-4"><span>🧠 Claude Input ({sumInput.toLocaleString('de')} tok)</span><span>{(inputCost * 0.92).toFixed(4)} €</span></div>}
                      {sumOutput > 0 && <div className="flex justify-between text-xs gap-4"><span>🧠 Claude Output ({sumOutput.toLocaleString('de')} tok)</span><span>{(outputCost * 0.92).toFixed(4)} €</span></div>}
                      {elChars > 0 && <div className="flex justify-between text-xs gap-4"><span>🔊 ElevenLabs ({elChars.toLocaleString('de')} Zeichen)</span><span>{(elCost * 0.92).toFixed(4)} €</span></div>}
                      {rpCount > 0 && <div className="flex justify-between text-xs gap-4"><span>🎨 Replicate ({rpCount} Bilder)</span><span>{(rpCost * 0.92).toFixed(4)} €</span></div>}
                    </>);
                  })()}
                  <div className="flex justify-between text-xs font-bold border-t border-border pt-1 mt-1"><span>Gesamt</span><span>{(costsData.totals.total * 0.92).toFixed(2)} €</span></div>
                </div>
              </details>
            )}
          </div>
          <p className="text-text-muted text-sm">
            {(story as any).age ? `${(story as any).age} J.` : ''} · {new Date(story.createdAt).toLocaleDateString('de-DE')}
          </p>
          {(story as any).requesterName && (
            <p className="text-sm">Anfrage von: <strong>{(story as any).requesterName}</strong>
              {(story as any).requesterSource && <span className="text-text-muted"> ({(story as any).requesterSource})</span>}
            </p>
          )}
          {(story as any).interests && (
            <p className="text-sm">Interessen: <span className="text-text-muted">{(story as any).interests}</span></p>
          )}
          {story.summary && !story.summary.startsWith('{') && <p className="text-sm">{story.summary}</p>}
          <div className="flex gap-2 mt-3 flex-wrap">
            {(story as any).audioUrl && (
              <button onClick={() => play(story.id, story.title)} className="flex items-center gap-2 px-4 py-2 bg-brand rounded-lg text-sm text-white hover:bg-green-700 transition-colors">
                <Play size={16} /> Abspielen
              </button>
            )}
            {isDraft && (story as any).audioUrl && (
              <button onClick={async () => {
                await updateStoryStatus(story.id, 'produced');
                qc.invalidateQueries({ queryKey: ['story', id] });
                toast.success('Hörbuch veröffentlicht');
              }} className="flex items-center gap-2 px-4 py-2 bg-brand rounded-lg text-sm text-white hover:bg-green-700 transition-colors">
                <Check size={16} /> → Hörbuch
              </button>
            )}
            {!isRequested && !isDraft && (
              <>
                <button onClick={() => { navigator.clipboard.writeText(`https://fablino.de/story/${story.id}`); toast.success('Link kopiert'); }}
                  className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors">
                  <Copy size={16} /> Link
                </button>
                <button onClick={() => featMut.mutate(story.id)} className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors">
                  <Star size={16} className={story.featured ? 'text-yellow-400 fill-yellow-400' : ''} />
                  {story.featured ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  onClick={() => { if (confirm('Wirklich löschen?')) delMut.mutate(story.id); }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400 hover:bg-red-900/50 transition-colors"
                >
                  <Trash2 size={16} /> Löschen
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Generation form for requested stories */}
      {isRequested && (
        <GenerateForm
          story={story}
          onDone={() => qc.invalidateQueries({ queryKey: ['story', id] })}
        />
      )}

      {/* Draft: show script preview with confirm/regenerate */}
      {isDraft && (story as any).scriptData && (
        <DraftPreview
          story={story}
          onDone={() => qc.invalidateQueries({ queryKey: ['story', id] })}
        />
      )}

      {/* Draft without script: show generate form */}
      {isDraft && !(story as any).scriptData && (
        <GenerateForm
          story={story}
          onDone={() => qc.invalidateQueries({ queryKey: ['story', id] })}
        />
      )}

      {/* Characters */}
      {story.characters?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Charaktere</h3>
          <div className="flex gap-2 flex-wrap">
            {story.characters.map((c) => (
              <span key={c.id} className="px-3 py-1 bg-surface border border-border rounded-full text-sm">
                <TwemojiIcon emoji={c.emoji || '✨'} size={16} /> {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Script */}
      {Object.keys(grouped).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3">Skript</h3>
          <div className="space-y-4">
            {Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b)).map(([scene, lines]) => (
              <div key={scene} className="bg-surface border border-border rounded-lg p-4">
                <p className="text-xs text-text-muted mb-2">Szene {Number(scene) + 1}</p>
                <div className="space-y-2">
                  {lines.sort((a, b) => a.lineIdx - b.lineIdx).map((l) => (
                    <ScriptLine key={l.id} line={l} story={story} voiceSettings={voiceSettings} onUpdated={() => qc.invalidateQueries({ queryKey: ['story', id] })} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
