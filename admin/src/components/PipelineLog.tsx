import React from 'react';
import { CheckCircle, XCircle, Clock, Cpu, ChevronDown, ChevronRight, FileText, Loader2 } from 'lucide-react';

interface PipelineStep {
  agent: string;
  model: string;
  durationMs: number;
  tokens: { input: number; output: number };
  timestamp?: string;
  reviewResult?: {
    approved: boolean;
    feedback?: string;
    severity?: string;
    // Legacy
    issues?: { scene: number; line: number; type: string; severity: string; description: string; suggestion: string }[];
    summary?: string;
  };
  scriptSnapshot?: any;
}

interface Props {
  pipeline: { steps: PipelineStep[]; totalTokens: { input: number; output: number } };
  activeStep?: string | null;
}

const AGENT_LABELS: Record<string, string> = {
  author: '🖊️ Autor',
  reviewer: '🔍 Lektor',
  revision: '✏️ Überarbeitung',
  reviewer2: '🔍 Zweiter Review',
  revision2: '✏️ Zweite Überarbeitung',
  tts: '🎙️ TTS-Optimierung',
};

const MODEL_SHORT: Record<string, string> = {
  'claude-opus-4-20250514': 'Opus 4',
  'claude-sonnet-4-20250514': 'Sonnet 4',
};

function formatDuration(ms: number) {
  return ms >= 60000 ? `${(ms / 60000).toFixed(1)} min` : `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

function timeAgo(iso?: string): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return 'gerade eben';
  const m = Math.floor(s / 60);
  if (m < 60) return `vor ${m} Min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `vor ${h} Std`;
  const d = Math.floor(h / 24);
  return `vor ${d} Tag${d > 1 ? 'en' : ''}`;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300',
  major: 'bg-orange-500/20 text-orange-300',
  minor: 'bg-yellow-500/20 text-yellow-300',
};

function ScriptPreview({ script }: { script: any }) {
  if (!script?.scenes) return null;
  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      <div className="text-xs font-medium text-text-muted">
        {script.title} · {script.scenes.length} Szenen · {script.scenes.reduce((t: number, s: any) => t + s.lines.length, 0)} Zeilen
      </div>
      {script.scenes.map((scene: any, si: number) => (
        <div key={si}>
          <div className="text-xs font-semibold text-text-muted mb-1">Szene {si + 1}</div>
          <div className="space-y-0.5">
            {scene.lines.map((line: any, li: number) => (
              <div key={li} className="text-xs">
                {line.sfx ? (
                  <span className="text-blue-400">🔊 {line.sfx}</span>
                ) : (
                  <>
                    <span className="font-medium text-text">{line.speaker}: </span>
                    {line.emotion && line.emotion !== 'neutral' && (
                      <span className="text-purple-400 text-[10px]">{line.emotion} </span>
                    )}
                    <span className="text-text-muted">{line.text}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const STEP_LABELS: Record<string, { agent: string; label: string }> = {
  'Autor schreibt Story...': { agent: 'author', label: '🖊️ Autor' },
  'Lektor prüft Story...': { agent: 'reviewer', label: '🔍 Lektor' },
  'Autor überarbeitet Story...': { agent: 'revision', label: '✏️ Überarbeitung' },
  'Lektor prüft Überarbeitung...': { agent: 'reviewer2', label: '🔍 Zweiter Review' },
  'Autor überarbeitet nochmal...': { agent: 'revision2', label: '✏️ Zweite Überarbeitung' },
  'TTS-Optimierung...': { agent: 'tts', label: '🎙️ TTS-Optimierung' },
};

export function PipelineLog({ pipeline, activeStep }: Props) {
  const [expanded, setExpanded] = React.useState<Record<number, string | null>>({});

  const totalDuration = pipeline.steps.reduce((t, s) => t + s.durationMs, 0);
  const totalTokens = pipeline.totalTokens.input + pipeline.totalTokens.output;

  const toggleExpand = (i: number, section: string) => {
    setExpanded(e => ({ ...e, [i]: e[i] === section ? null : section }));
  };

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold text-sm">Pipeline Log</h3>
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span className="flex items-center gap-1"><Clock size={12} /> {formatDuration(totalDuration)}</span>
          <span className="flex items-center gap-1"><Cpu size={12} /> {formatTokens(totalTokens)} Tokens</span>
        </div>
      </div>

      <div className="divide-y divide-border">
        {pipeline.steps.map((step, i) => {
          const hasReview = !!step.reviewResult;
          const hasScript = !!step.scriptSnapshot;
          const _expandable = hasReview || hasScript;
          const expandedSection = expanded[i];

          return (
            <div key={i}>
              <div className="px-4 py-2.5 flex items-center gap-3 text-sm">
                {/* Status icon */}
                {hasReview ? (
                  step.reviewResult!.approved
                    ? <CheckCircle size={16} className="text-green-400 shrink-0" />
                    : <XCircle size={16} className="text-orange-400 shrink-0" />
                ) : (
                  <CheckCircle size={16} className="text-green-400 shrink-0" />
                )}

                {/* Agent name */}
                <span className="font-medium min-w-[140px]">{AGENT_LABELS[step.agent] || step.agent}</span>

                {/* Model */}
                <span className="text-xs text-text-muted">{MODEL_SHORT[step.model] || step.model}</span>

                {/* Spacer */}
                <span className="flex-1" />

                {/* Tokens */}
                <span className="text-xs text-text-muted">{formatTokens(step.tokens.input + step.tokens.output)} tok</span>

                {/* Duration */}
                <span className="text-xs text-text-muted w-16 text-right">{formatDuration(step.durationMs)}</span>

                {/* Time ago */}
                {step.timestamp && (
                  <span className="text-xs text-text-muted/60 w-24 text-right">{timeAgo(step.timestamp)}</span>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-1">
                  {hasReview && (
                    <button
                      onClick={() => toggleExpand(i, 'review')}
                      className={`p-1 rounded hover:bg-surface-hover ${expandedSection === 'review' ? 'text-brand' : 'text-text-muted'}`}
                      title="Review-Details"
                    >
                      {expandedSection === 'review' ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                  )}
                  {hasScript && (
                    <button
                      onClick={() => toggleExpand(i, 'script')}
                      className={`p-1 rounded hover:bg-surface-hover ${expandedSection === 'script' ? 'text-brand' : 'text-text-muted'}`}
                      title="Skript anzeigen"
                    >
                      <FileText size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Review details */}
              {expandedSection === 'review' && hasReview && (
                <div className="px-4 pb-3 space-y-2">
                  {step.reviewResult!.severity && (
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${SEVERITY_COLORS[step.reviewResult!.severity] || ''}`}>
                      {step.reviewResult!.severity}
                    </span>
                  )}
                  {step.reviewResult!.feedback && (
                    <p className="text-xs text-text-muted whitespace-pre-wrap">{step.reviewResult!.feedback}</p>
                  )}
                  {/* Legacy: structured issues */}
                  {step.reviewResult!.summary && !step.reviewResult!.feedback && (
                    <p className="text-xs text-text-muted italic">{step.reviewResult!.summary}</p>
                  )}
                  {step.reviewResult!.issues && step.reviewResult!.issues.length > 0 && (
                    <div className="space-y-1">
                      {step.reviewResult!.issues.map((issue, j) => (
                        <div key={j} className="flex items-start gap-2 text-xs">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0 ${SEVERITY_COLORS[issue.severity] || ''}`}>
                            {issue.severity}
                          </span>
                          <span className="text-text-muted shrink-0">S{issue.scene}:Z{issue.line}</span>
                          <span>{issue.description}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Script snapshot */}
              {expandedSection === 'script' && hasScript && (
                <div className="px-4 pb-3 border-t border-border/50 pt-2">
                  <ScriptPreview script={step.scriptSnapshot} />
                </div>
              )}
            </div>
          );
        })}

        {/* Active step with spinner */}
        {activeStep && (() => {
          const info = STEP_LABELS[activeStep];
          const completedAgents = new Set(pipeline.steps.map(s => s.agent));
          // Only show if this step isn't already completed
          if (info && !completedAgents.has(info.agent)) {
            return (
              <div className="px-4 py-2.5 flex items-center gap-3 text-sm border-t border-border">
                <Loader2 size={16} className="animate-spin text-brand shrink-0" />
                <span className="font-medium min-w-[140px]">{info.label}</span>
                <span className="flex-1" />
                <span className="text-xs text-text-muted animate-pulse">läuft...</span>
              </div>
            );
          }
          return null;
        })()}
      </div>
    </div>
  );
}
