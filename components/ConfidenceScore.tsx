'use client';

import { TrendUp, TrendDown, Minus } from '@phosphor-icons/react';

interface ConfidenceScoreProps {
  score: number;
  previousScore?: number;
}

export default function ConfidenceScore({ score, previousScore }: ConfidenceScoreProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-emerald-300';
    if (s >= 65) return 'text-amber-300';
    return 'text-red-300';
  };

  const getScoreBand = (s: number) => {
    if (s >= 80) return 'border-emerald-800/50 bg-emerald-950/30';
    if (s >= 65) return 'border-amber-800/50 bg-amber-950/30';
    return 'border-red-900/45 bg-red-950/35';
  };

  const trend = (): 'up' | 'down' | 'neutral' | null => {
    if (previousScore === undefined) return null;
    if (score > previousScore) return 'up';
    if (score < previousScore) return 'down';
    return 'neutral';
  };

  const t = trend();

  return (
    <div className={`rounded-ds-md border p-6 shadow-ds-sm ${getScoreBand(score)}`}>
      <div className="flex flex-wrap items-center justify-between gap-6">
        <div className="min-w-[12rem] flex-1">
          <p className="mono text-[11px] uppercase tracking-[0.12em] text-ds-text-muted">
            Proposal confidence aggregate
          </p>
          <div className="mt-3 flex flex-wrap items-baseline gap-3">
            <span className={`mono text-4xl font-semibold tabular-nums ${getScoreColor(score)}`}>{score}%</span>
            {t && (
              <div className="flex items-center gap-2 text-xs">
                {t === 'up' && previousScore !== undefined && (
                  <>
                    <TrendUp className="h-4 w-4 text-emerald-400" weight="bold" />
                    <span className="mono font-medium text-emerald-300">
                      +{(score - previousScore).toFixed(0)} pts
                    </span>
                  </>
                )}
                {t === 'down' && previousScore !== undefined && (
                  <>
                    <TrendDown className="h-4 w-4 text-red-300" weight="bold" />
                    <span className="mono font-medium text-red-200">
                      {(score - previousScore).toFixed(0)} pts
                    </span>
                  </>
                )}
                {t === 'neutral' && (
                  <>
                    <Minus className="h-4 w-4 text-ds-text-muted" weight="bold" />
                    <span className="text-ds-text-muted">Stable</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="min-w-[10rem] max-w-xs flex-1">
          <div className="h-2 overflow-hidden rounded-ds-sm border border-ds-border bg-ds-shell/60">
            <div
              className={`h-full transition-[width] duration-500 ${
                score >= 80 ? 'bg-emerald-500/80' : score >= 65 ? 'bg-amber-400/90' : 'bg-red-500/85'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="mono mt-2 flex justify-between text-[10px] uppercase tracking-wide text-ds-text-muted">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-ds-border pt-4">
        <p className="text-[11px] text-ds-text-muted">Conformance target baseline: ≥ 75%</p>
      </div>
    </div>
  );
}
