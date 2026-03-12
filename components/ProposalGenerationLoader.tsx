'use client';

import { useEffect, useState, useRef } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProposalGenerationLoaderProps {
  onComplete: (proposal: any) => void;
  onError: (error: string) => void;
  baa: any;
  organizationContext: any;
}

interface ChunkUpdate {
  chunkCount: number;
  totalChars: number;
  message: string;
  timestamp: number;
}

export default function ProposalGenerationLoader({
  onComplete,
  onError,
  baa,
  organizationContext,
}: ProposalGenerationLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState('Initializing proposal generation...');
  const [isGenerating, setIsGenerating] = useState(true);
  const [chunkUpdates, setChunkUpdates] = useState<ChunkUpdate[]>([]);
  const [displayedLines, setDisplayedLines] = useState<string[]>([]);
  const typewriterRef = useRef<HTMLDivElement>(null);
  const typingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastProcessedIndexRef = useRef<number>(-1);

  useEffect(() => {
    const generateProposal = async () => {
      let reader: ReadableStreamDefaultReader<Uint8Array> | undefined = undefined;
      let timeoutId: ReturnType<typeof setTimeout> | null = null;
      
      try {
        console.log('🚀 Starting proposal generation...');
        console.log('📋 BAA Object Check:');
        console.log('  BAA type:', typeof baa);
        console.log('  BAA has rawText:', !!(baa && typeof baa === 'object' && 'rawText' in baa));
        console.log('  BAA rawText length:', (baa && typeof baa === 'object' && baa.rawText) ? baa.rawText.length : 'N/A');
        console.log('  BAA title:', baa?.title || 'N/A');
        console.log('  BAA structure:', baa?.structure?.length || 0, 'sections');
        if (baa && typeof baa === 'object' && baa.rawText) {
          console.log('  BAA rawText preview (first 300 chars):', baa.rawText.substring(0, 300));
        }
        
        setProgress(5);
        setMessage('Connecting to API...');
        
        const response = await fetch('/api/generate-proposal-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baa, organizationContext }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ API response not OK:', response.status, errorText);
          throw new Error(`Failed to start proposal generation: ${response.status} ${errorText}`);
        }

        reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response stream available');
        }

        // Set a timeout for the entire operation (5 minutes)
        timeoutId = setTimeout(() => {
          console.error('⏱️ Stream timeout after 5 minutes');
          reader?.cancel();
          throw new Error('Proposal generation timed out after 5 minutes. Please try again.');
        }, 300000);

        let buffer = '';
        let lastProgressTime = Date.now();
        let hasReceivedData = false;

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            console.log('✅ Stream completed');
            if (timeoutId) clearTimeout(timeoutId);
            break;
          }

          hasReceivedData = true;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                console.log('📨 Received:', data.type, data.progress || '', data.message || '');
                
                if (data.type === 'progress') {
                  setProgress(data.progress);
                  setMessage(data.message);
                  lastProgressTime = Date.now();
                } else if (data.type === 'chunk-update') {
                  const update: ChunkUpdate = {
                    chunkCount: data.chunkCount,
                    totalChars: data.totalChars,
                    message: data.message,
                    timestamp: Date.now(),
                  };
                  setChunkUpdates((prev) => [...prev, update]); // Add new update
                  lastProgressTime = Date.now();
                } else if (data.type === 'complete') {
                  setProgress(100);
                  setMessage('Proposal generation complete!');
                  setIsGenerating(false);
                  if (timeoutId) clearTimeout(timeoutId);
                  setTimeout(() => {
                    onComplete(data.data);
                  }, 500);
                  return;
                } else if (data.type === 'error') {
                  console.error('❌ Error from stream:', data.error);
                  if (timeoutId) clearTimeout(timeoutId);
                  throw new Error(data.error || data.details || 'Failed to generate proposal');
                }
              } catch (e: any) {
                console.warn('⚠️ Failed to parse SSE data:', e.message, line);
                // Skip invalid JSON lines
              }
            }
          }
          
          // Check if we've received data recently (stuck detection)
          const timeSinceLastProgress = Date.now() - lastProgressTime;
          if (hasReceivedData && timeSinceLastProgress > 30000) {
            console.warn('⚠️ No progress update in 30 seconds, stream may be stuck');
            setMessage('Stream appears stuck, retrying...');
          }
        }
        
        if (!hasReceivedData) {
          throw new Error('No data received from stream');
        }
      } catch (error: any) {
        console.error('❌ Proposal generation error:', error);
        setIsGenerating(false);
        if (timeoutId) clearTimeout(timeoutId);
        onError(error.message || 'Failed to generate proposal');
      } finally {
        if (reader) {
          try {
            reader.releaseLock();
          } catch (e) {
            // Ignore
          }
        }
      }
    };

    generateProposal();
  }, [baa, organizationContext, onComplete, onError]);

  // Typewriter effect for chunk updates - show latest lines with animation
  useEffect(() => {
    // Clear any existing interval
    if (typingIntervalRef.current) {
      clearInterval(typingIntervalRef.current);
      typingIntervalRef.current = null;
    }

    if (chunkUpdates.length === 0 || !isGenerating) {
      setDisplayedLines([]);
      lastProcessedIndexRef.current = -1;
      return;
    }

    // Keep only the last 6 lines for display
    const allLines = chunkUpdates.slice(-6).map(u => u.message);
    const currentIndex = lastProcessedIndexRef.current;
    
    // If we've processed all current updates, just show them
    if (currentIndex >= chunkUpdates.length - 1 && displayedLines.length === allLines.length) {
      setDisplayedLines(allLines);
      return;
    }
    
    // We have a new update to animate
    const latestUpdateIndex = chunkUpdates.length - 1;
    const latestMessage = chunkUpdates[latestUpdateIndex].message;
    const previousCompleteLines = chunkUpdates.slice(-6, -1).map(u => u.message);
    
    // Start typing the latest line
    let charIndex = 0;
    
    typingIntervalRef.current = setInterval(() => {
      if (charIndex < latestMessage.length) {
        const newLines = [...previousCompleteLines, latestMessage.substring(0, charIndex + 1)];
        setDisplayedLines(newLines);
        charIndex++;
      } else {
        // Line complete
        if (typingIntervalRef.current) {
          clearInterval(typingIntervalRef.current);
          typingIntervalRef.current = null;
        }
        setDisplayedLines(allLines);
        lastProcessedIndexRef.current = latestUpdateIndex;
      }
    }, 8); // Fast typing speed

    return () => {
      if (typingIntervalRef.current) {
        clearInterval(typingIntervalRef.current);
        typingIntervalRef.current = null;
      }
    };
  }, [chunkUpdates.length, isGenerating]); // Only depend on length to avoid re-triggering

  // Auto-scroll typewriter to bottom
  useEffect(() => {
    if (typewriterRef.current) {
      typewriterRef.current.scrollTop = typewriterRef.current.scrollHeight;
    }
  }, [displayedLines]);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="w-full max-w-md">
        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-[#1a1a1a]">Generating Proposal</span>
            <span className="text-sm font-medium text-[#6b7280]">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-[#f3f4f6] rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-[#059669] h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center mb-8">
          {isGenerating ? (
            <div className="flex items-center justify-center gap-3 mb-2">
              <Loader2 className="w-5 h-5 text-[#059669] animate-spin" />
              <p className="text-sm text-[#374151]">{message}</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3 mb-2">
              <CheckCircle2 className="w-5 h-5 text-[#059669]" />
              <p className="text-sm text-[#374151] font-medium">{message}</p>
            </div>
          )}
          
          {/* Section Progress Indicator */}
          {isGenerating && baa?.structure && (
            <p className="text-xs text-[#6b7280] mt-2">
              Processing {baa.structure.length} sections...
            </p>
          )}
        </div>

        {/* Typewriter Terminal Output */}
        {isGenerating && chunkUpdates.length > 0 && (
          <div className="mt-6 mb-4">
            <div className="bg-[#1a1a1a] rounded-lg p-4 font-mono text-xs overflow-hidden shadow-lg border border-[#374151]">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-[#374151]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-[#ef4444]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#f59e0b]"></div>
                  <div className="w-3 h-3 rounded-full bg-[#10b981]"></div>
                </div>
                <span className="text-[#9ca3af] text-[10px]">Terminal Output</span>
              </div>
              <div 
                ref={typewriterRef}
                className="max-h-32 overflow-y-auto"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#374151 #1a1a1a',
                }}
              >
                <div className="text-[#10b981] leading-relaxed space-y-0.5">
                  {displayedLines.map((line, index) => (
                    <div key={index} className="font-mono">
                      {line}
                      {index === displayedLines.length - 1 && (
                        <span className="inline-block w-2 h-4 bg-[#10b981] ml-1 animate-pulse">▋</span>
                      )}
                    </div>
                  ))}
                  {displayedLines.length === 0 && (
                    <div className="text-[#6b7280] italic">Waiting for updates...</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading Animation */}
        {isGenerating && (
          <div className="flex justify-center gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 bg-[#059669] rounded-full animate-pulse"
                style={{
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '1s',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
