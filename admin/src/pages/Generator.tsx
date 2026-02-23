import { useState } from 'react';
import { generateScript, generateAudio } from '../api';
import { Wand2, Volume2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export function Generator() {
  const [heroName, setHeroName] = useState('');
  const [ageGroup, setAgeGroup] = useState('3-5');
  const [prompt, setPrompt] = useState('');
  const [sideChars, setSideChars] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'preview' | 'audio'>('form');
  const [script, setScript] = useState<any>(null);
  const [audioLoading, setAudioLoading] = useState(false);

  const handleGenerate = async () => {
    if (!heroName || !prompt) { toast.error('Fill in hero name and prompt'); return; }
    setLoading(true);
    try {
      const result = await generateScript({
        heroName,
        heroAge: ageGroup,
        prompt,
        sideCharacters: sideChars ? sideChars.split(',').map((s) => s.trim()) : undefined,
      });
      setScript(result);
      setStep('preview');
      toast.success('Script generated!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAudio = async () => {
    setAudioLoading(true);
    try {
      await generateAudio(script);
      setStep('audio');
      toast.success('Audio generated!');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAudioLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h2 className="text-2xl font-bold">Story Generator</h2>

      {step === 'form' && (
        <div className="space-y-4">
          <div>
            <label className="text-sm text-text-muted block mb-1">Hero Name</label>
            <input value={heroName} onChange={(e) => setHeroName(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="text-sm text-text-muted block mb-1">Age Group</label>
            <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none">
              <option value="3-5">3-5</option>
              <option value="6-9">6-9</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-text-muted block mb-1">Prompt / Theme</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={3} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <div>
            <label className="text-sm text-text-muted block mb-1">Side Characters (comma-separated)</label>
            <input value={sideChars} onChange={(e) => setSideChars(e.target.value)} className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-brand" />
          </div>
          <button onClick={handleGenerate} disabled={loading} className="flex items-center gap-2 px-6 py-2.5 bg-brand rounded-lg text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
            {loading ? 'Generating…' : 'Generate Script'}
          </button>
        </div>
      )}

      {step === 'preview' && script && (
        <div className="space-y-4">
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-2">Generated Script Preview</h3>
            <pre className="text-xs text-text-muted whitespace-pre-wrap max-h-96 overflow-y-auto">{JSON.stringify(script, null, 2)}</pre>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep('form')} className="px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors">Back</button>
            <button onClick={handleAudio} disabled={audioLoading} className="flex items-center gap-2 px-6 py-2.5 bg-brand rounded-lg text-white text-sm font-medium hover:bg-brand-light transition-colors disabled:opacity-50">
              {audioLoading ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
              {audioLoading ? 'Generating Audio…' : 'Generate Audio'}
            </button>
          </div>
        </div>
      )}

      {step === 'audio' && (
        <div className="bg-surface border border-brand/30 rounded-xl p-6 text-center">
          <p className="text-brand text-lg font-semibold">✅ Audio generated successfully!</p>
          <p className="text-text-muted text-sm mt-2">Check the Stories page for the new story.</p>
          <button onClick={() => { setStep('form'); setScript(null); }} className="mt-4 px-4 py-2 bg-surface border border-border rounded-lg text-sm hover:bg-surface-hover transition-colors">
            Generate Another
          </button>
        </div>
      )}
    </div>
  );
}
