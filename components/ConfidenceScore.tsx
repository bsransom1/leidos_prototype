'use client';

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ConfidenceScoreProps {
  score: number;
  previousScore?: number;
}

export default function ConfidenceScore({ score, previousScore }: ConfidenceScoreProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-[#059669]';
    if (score >= 65) return 'text-[#d97706]';
    return 'text-[#dc2626]';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-[#ecfdf5] border-[#a7f3d0]';
    if (score >= 65) return 'bg-[#fffbeb] border-[#fde68a]';
    return 'bg-[#fef2f2] border-[#fecaca]';
  };

  const getTrend = () => {
    if (!previousScore) return null;
    if (score > previousScore) return 'up';
    if (score < previousScore) return 'down';
    return 'neutral';
  };

  const trend = getTrend();

  return (
    <div className={`border p-4 ${getScoreBgColor(score)}`}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-medium text-[#6b7280] mb-1">Overall Proposal Confidence</p>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-semibold mono ${getScoreColor(score)}`}>
              {score}%
            </span>
            {trend && (
              <div className="flex items-center gap-1">
                {trend === 'up' && (
                  <>
                    <TrendingUp className="w-3.5 h-3.5 text-[#059669]" />
                    <span className="text-xs text-[#059669] font-medium mono">
                      +{score - previousScore!}%
                    </span>
                  </>
                )}
                {trend === 'down' && (
                  <>
                    <TrendingDown className="w-3.5 h-3.5 text-[#dc2626]" />
                    <span className="text-xs text-[#dc2626] font-medium mono">
                      {score - previousScore!}%
                    </span>
                  </>
                )}
                {trend === 'neutral' && (
                  <>
                    <Minus className="w-3.5 h-3.5 text-[#9ca3af]" />
                    <span className="text-xs text-[#9ca3af] font-medium">No change</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Confidence Bar */}
        <div className="flex-1 max-w-xs">
          <div className="w-full bg-[#e5e7eb] h-2 overflow-hidden border border-[#d1d5db]">
            <div
              className={`h-full transition-all duration-500 ${
                score >= 80
                  ? 'bg-[#059669]'
                  : score >= 65
                  ? 'bg-[#d97706]'
                  : 'bg-[#dc2626]'
              }`}
              style={{ width: `${score}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-[#6b7280]">
            <span>0%</span>
            <span>50%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* Benchmark Info */}
      <div className="mt-3 pt-3 border-t border-[#d1d5db]">
        <p className="text-xs text-[#6b7280]">
          Target: 75%+
        </p>
      </div>
    </div>
  );
}
