import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchStory, deleteStory, toggleFeatured, updateStoryStatus } from '../api';
import { useAudio } from '../audioContext';
import { ArrowLeft, Star, Trash2, Check, Copy, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { GenerateForm } from '../components/GenerateForm';
import { DraftPreview } from '../components/DraftPreview';
import { PipelineLog } from '../components/PipelineLog';
// ScriptLine removed — DraftPreview handles all script rendering
import { getAuth } from '../utils/auth';

export function StoryDetail() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { load, stop } = useAudio();
  const { data: story, isLoading } = useQuery({ queryKey: ['story', id], queryFn: () => fetchStory(id!) });
  const { data: costsData } = useQuery({ queryKey: ['costs', id], queryFn: () => fetch(`/api/stories/${id}/costs`).then(r => r.json()), enabled: !!id });

  const delMut = useMutation({
    mutationFn: deleteStory,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['stories'] }); toast.success('Gelöscht'); nav('/stories'); },
  });
  const featMut = useMutation({
    mutationFn: toggleFeatured,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['story', id] }); toast.success('Featured aktualisiert'); },
  });

  const [coverLoading, setCoverLoading] = React.useState(false);
  const [localCoverUrl, setLocalCoverUrl] = React.useState<string | undefined>(undefined);

  const handleGenerateCover = async () => {
    setCoverLoading(true);
    try {
      const res = await fetch(`/api/stories/${id}/generate-cover`, { method: 'POST', headers: { Authorization: getAuth() } });
      const data = await res.json();
      if (data.coverUrl) {
        setLocalCoverUrl(data.coverUrl + '?t=' + Date.now() as string);
        qc.invalidateQueries({ queryKey: ['story', id] });
        toast.success('Cover generiert!');
      }
    } catch { toast.error('Cover-Generierung fehlgeschlagen'); }
    setCoverLoading(false);
  };

  // Auto-load GlobalPlayer when story has audio, stop on unmount
  React.useEffect(() => {
    if (story && (story as any).audioUrl) {
      load(story.id, story.title);
    }
    return () => stop();
  }, [story?.id, (story as any)?.audioUrl]);

  if (isLoading || !story) return <p className="p-6 text-text-muted">Laden…</p>;

  const isDraft = (story as any).status === 'draft';
  const hasScript = !!(story as any).scriptData?.script;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl">
      <button onClick={() => { const s = (story as any).status; const tab = (s === 'published' || s === 'feedback') ? 'published' : 'draft'; nav(`/stories?status=${tab}`); }} className="flex items-center gap-1 text-text-muted hover:text-text text-sm">
        <ArrowLeft size={16} /> Zurück
      </button>

      <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
        <div className="relative w-32 h-32 sm:w-48 sm:h-48 rounded-xl overflow-hidden group cursor-pointer shrink-0 mx-auto sm:mx-0" onClick={handleGenerateCover}>
          {(localCoverUrl || story.coverUrl) ? (
            <>
              <img src={localCoverUrl || story.coverUrl || ''} alt="" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                {coverLoading ? <Loader2 size={24} className="animate-spin" /> : <><span className="text-2xl">🔄</span><span className="text-xs mt-1">Neu generieren</span></>}
              </div>
            </>
          ) : (
            <div className="w-full h-full bg-surface-alt flex flex-col items-center justify-center gap-2">
              {coverLoading ? <Loader2 size={24} className="animate-spin text-text-muted" /> : <><span className="text-4xl">🎨</span><span className="text-xs text-text-muted">Cover generieren</span></>}
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <h2 className="text-xl md:text-2xl font-bold">{story.title}</h2>
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
          )}
          {story.summary && !story.summary.startsWith('{') && <p className="text-sm">{story.summary}</p>}
          <div className="flex gap-2 mt-3 flex-wrap">
            {(story as any).status === 'produced' && (
              <button onClick={async () => {
                if (!confirm('Audio löschen und zurück zum Entwurf?')) return;
                await updateStoryStatus(story.id, 'draft');
                qc.invalidateQueries({ queryKey: ['story', id] });
                toast.success('Zurück zum Entwurf');
              }} className="flex items-center gap-2 px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors">
                ✏️ Zurück zu Entwurf
              </button>
            )}
            {(isDraft || (story as any).status === 'produced') && (story as any).audioUrl && (
              <button onClick={async () => {
                await updateStoryStatus(story.id, 'published');
                qc.invalidateQueries({ queryKey: ['story', id] });
                toast.success('Hörbuch veröffentlicht');
              }} className="flex items-center gap-2 px-4 py-2 bg-brand rounded-lg text-sm text-white hover:bg-green-700 transition-colors">
                <Check size={16} /> Veröffentlichen
              </button>
            )}
            {['published', 'feedback'].includes((story as any).status) && (
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

      {/* Generation form for stories without script */}
      {isDraft && !hasScript && (
        <GenerateForm
          story={story}
          onDone={() => qc.invalidateQueries({ queryKey: ['story', id] })}
          onDelete={() => { if (confirm('Story wirklich löschen?')) delMut.mutate(story.id); }}
        />
      )}

      {/* Script view: draft mode with buttons, or readonly for published */}
      {hasScript && (
        <DraftPreview
          story={story}
          onDone={() => qc.invalidateQueries({ queryKey: ['story', id] })}
          mode={isDraft ? 'draft' : 'readonly'}
          onDelete={() => { if (confirm('Story wirklich löschen?')) delMut.mutate(story.id); }}
        />
      )}

      {/* Pipeline Log (hide during active generation) */}
      {(story as any).scriptData?.pipeline && !['requested'].includes((story as any).status) && !['waiting_for_script', 'generating_audio'].includes((story as any).scriptData?.generationState?.status) && (
        <PipelineLog pipeline={(story as any).scriptData.pipeline} />
      )}

      {/* Characters + Script blocks removed — DraftPreview handles both */}

    </div>
  );
}
