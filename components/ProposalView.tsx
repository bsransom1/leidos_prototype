'use client';

import { useState } from 'react';
import { CheckCircle2, AlertCircle, XCircle, TrendingUp, Award, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Proposal, BAA, ProposalSection } from '@/types';
import ConfidenceScore from './ConfidenceScore';

interface ProposalViewProps {
  proposal: Proposal;
  baa: BAA;
  onAward: () => void;
}

export default function ProposalView({ proposal, baa, onAward }: ProposalViewProps) {
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'strong':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'needs-improvement':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'weak':
        return <XCircle className="w-5 h-5 text-orange-500" />;
      default:
        return <XCircle className="w-5 h-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'strong':
        return 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]';
      case 'needs-improvement':
        return 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]';
      case 'weak':
        return 'bg-[#fff7ed] border-[#fed7aa] text-[#9a3412]';
      default:
        return 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]';
    }
  };

  return (
    <div className="w-full">
      {/* Header with Overall Confidence */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#d1d5db]">
          <div>
            <h2 className="text-base font-semibold text-[#1a1a1a] mb-1">{proposal.title}</h2>
            <p className="text-xs text-[#6b7280]">Generated from: {baa.title}</p>
          </div>
          <button
            onClick={onAward}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#059669] text-white text-xs font-medium hover:bg-[#047857] transition-colors border border-[#059669]"
          >
            <Award className="w-3.5 h-3.5" />
            Mark as Awarded
          </button>
        </div>

        <ConfidenceScore score={proposal.overallConfidence} />
      </div>

      {/* Sections List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Sidebar - Section Navigation */}
        <div className="lg:col-span-1">
          <div className="bg-[#f9fafb] border border-[#d1d5db] p-3 sticky top-0">
            <h3 className="text-xs font-semibold text-[#1a1a1a] mb-3">Proposal Sections</h3>
            <div className="space-y-1.5">
              {proposal.sections && proposal.sections.length > 0 ? (
                proposal.sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`w-full text-left p-2 border transition-colors ${
                    selectedSection === section.id
                      ? 'bg-[#eff6ff] border-[#3b82f6]'
                      : 'bg-white border-[#d1d5db] hover:border-[#9ca3af]'
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-xs font-medium text-[#1a1a1a] line-clamp-1">
                      {section.title}
                    </span>
                    <span className="flex-shrink-0 ml-2">{getStatusIcon(section.status)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-[#6b7280] mono">
                      {section.confidence || 0}%
                    </span>
                    {section.feedback && section.feedback.length > 0 && (
                      <span className="text-xs text-[#2563eb] flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {section.feedback.length}
                      </span>
                    )}
                  </div>
                </button>
              ))
              ) : (
                <div className="p-4 text-center text-xs text-[#6b7280]">
                  No sections available. The proposal may still be generating.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content - Section Details */}
        <div className="lg:col-span-2">
          {selectedSection ? (
            (() => {
              const section = proposal.sections?.find((s) => s.id === selectedSection);
              if (!section) {
                return (
                  <div className="text-center py-8 text-[#6b7280] border border-[#d1d5db] bg-[#f9fafb] p-6">
                    <p className="text-xs">Section not found</p>
                  </div>
                );
              }
              return <SectionDetail section={section} />;
            })()
          ) : (
            <div className="text-center py-8 text-[#6b7280] border border-[#d1d5db] bg-[#f9fafb] p-6">
              <p className="text-xs">Select a section to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionDetail({ section }: { section: ProposalSection }) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'strong':
        return 'bg-[#ecfdf5] border-[#a7f3d0] text-[#065f46]';
      case 'needs-improvement':
        return 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]';
      case 'weak':
        return 'bg-[#fff7ed] border-[#fed7aa] text-[#9a3412]';
      default:
        return 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]';
    }
  };

  return (
    <div className="bg-white border border-[#d1d5db] p-4">
      {/* Section Header */}
      <div className="mb-3 pb-2 border-b border-[#d1d5db]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-[#1a1a1a]">{section.title}</h3>
          <span
            className={`px-2 py-0.5 text-xs font-medium border ${getStatusColor(
              section.status
            )}`}
          >
            {section.status.replace('-', ' ')}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#6b7280]" />
            <span className="text-xs text-[#6b7280]">
              Confidence: <span className="font-medium mono">{section.confidence || 0}%</span>
            </span>
          </div>
          {section.required && (
            <span className="text-xs px-1.5 py-0.5 bg-[#eff6ff] text-[#1e40af] border border-[#bfdbfe]">
              Required
            </span>
          )}
        </div>
      </div>

      {/* Section Content */}
      <div className="mb-3">
        <h4 className="text-xs font-semibold text-[#374151] mb-2">Content</h4>
        <div className="bg-[#f9fafb] border border-[#d1d5db] p-3">
          <div className="text-xs text-[#374151] leading-relaxed prose prose-sm max-w-none">
            {section.content ? (
              <ReactMarkdown
                components={{
                  // Bold text
                  strong: ({ children }) => (
                    <strong className="font-semibold text-[#1a1a1a]">{children}</strong>
                  ),
                  // Paragraphs
                  p: ({ children }) => (
                    <p className="mb-3 last:mb-0">{children}</p>
                  ),
                  // Unordered lists (bullet points)
                  ul: ({ children, ...props }: any) => {
                    const depth = props.depth || 0;
                    const indentClass = depth === 0 ? 'ml-6' : depth === 1 ? 'ml-10' : 'ml-14';
                    return (
                      <ul className={`list-disc list-outside ${indentClass} mb-3 space-y-1.5 last:mb-0`}>
                        {children}
                      </ul>
                    );
                  },
                  // Ordered lists (numbered)
                  ol: ({ children, ...props }: any) => {
                    const depth = props.depth || 0;
                    const indentClass = depth === 0 ? 'ml-6' : depth === 1 ? 'ml-10' : 'ml-14';
                    return (
                      <ol className={`list-decimal list-outside ${indentClass} mb-3 space-y-1.5 last:mb-0`}>
                        {children}
                      </ol>
                    );
                  },
                  // List items
                  li: ({ children }) => (
                    <li className="pl-1.5 leading-relaxed">{children}</li>
                  ),
                  // Headers
                  h1: ({ children }) => (
                    <h1 className="text-base font-semibold text-[#1a1a1a] mb-2 mt-4 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-sm font-semibold text-[#1a1a1a] mb-2 mt-3 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xs font-semibold text-[#1a1a1a] mb-1.5 mt-2 first:mt-0">
                      {children}
                    </h3>
                  ),
                  // Code blocks
                  code: ({ children, className }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code className="bg-[#f3f4f6] px-1 py-0.5 rounded text-[#dc2626] font-mono text-[11px]">
                        {children}
                      </code>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                  // Blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-[#d1d5db] pl-3 italic text-[#6b7280] my-3">
                      {children}
                    </blockquote>
                  ),
                  // Horizontal rule
                  hr: () => (
                    <hr className="my-4 border-t border-[#d1d5db]" />
                  ),
                }}
              >
                {section.content}
              </ReactMarkdown>
            ) : (
              <p className="text-[#6b7280]">No content available for this section.</p>
            )}
          </div>
        </div>
      </div>

      {/* Feedback */}
      {section.feedback && section.feedback.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-[#374151] mb-2">Analysis & Recommendations</h4>
          <div className="space-y-2">
            {section.feedback.map((fb, index) => (
              <div
                key={fb.id || `feedback-${section.id}-${index}`}
                className={`p-3 border ${
                  fb.type === 'strength'
                    ? 'bg-[#ecfdf5] border-[#a7f3d0]'
                    : fb.type === 'improvement'
                    ? 'bg-[#eff6ff] border-[#bfdbfe]'
                    : 'bg-[#fef2f2] border-[#fecaca]'
                }`}
              >
                <div className="flex items-start gap-2">
                  {fb.type === 'strength' && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] mt-0.5 flex-shrink-0" />
                  )}
                  {fb.type === 'improvement' && (
                    <AlertCircle className="w-3.5 h-3.5 text-[#2563eb] mt-0.5 flex-shrink-0" />
                  )}
                  {fb.type === 'removal' && (
                    <XCircle className="w-3.5 h-3.5 text-[#dc2626] mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-xs ${
                        fb.type === 'strength'
                          ? 'text-[#065f46]'
                          : fb.type === 'improvement'
                          ? 'text-[#1e40af]'
                          : 'text-[#991b1b]'
                      }`}
                    >
                      {fb.text}
                    </p>
                    {fb.suggestion && (
                      <p className="text-xs text-[#6b7280] mt-1.5">
                        Recommendation: {fb.suggestion}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
