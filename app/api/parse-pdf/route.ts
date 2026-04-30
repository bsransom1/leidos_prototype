import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Use pdf2json - a Node.js-native PDF parser that doesn't require workers
    // This avoids the worker configuration issues with pdf.js/pdf-parse in Next.js
    const PDFParser = (await import('pdf2json')).default;
    const pdfParser = new PDFParser();
    
    // Enable raw text extraction by setting the needRawText property
    // @ts-ignore - pdf2json types may not include this property
    pdfParser.needRawText = true;
    
    // Parse PDF and extract text using pdf2json
    return new Promise<NextResponse>((resolve, reject) => {
      pdfParser.on('pdfParser_dataError', (errMsg: Error | { parserError: Error }) => {
        console.error('PDF parsing error:', errMsg);
        const error = errMsg instanceof Error ? errMsg : errMsg.parserError;
        reject(new Error(`PDF parsing error: ${error.message}`));
      });
      
      pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
        try {
          console.log('📄 PDF parsed successfully');
          console.log('  PDF pages:', pdfData.Pages?.length || 0);
          console.log('  PDF formImage:', pdfData.formImage ? 'Present' : 'Missing');
          
          // Try multiple methods to extract text from pdf2json
          let text = '';
          
          // Method 1: getRawTextContent() - primary method (should work now with needRawText: 1)
          try {
            const rawText = pdfParser.getRawTextContent();
            if (rawText && typeof rawText === 'string' && rawText.length > 100) {
              text = rawText;
              console.log('✅ Method 1 (getRawTextContent):', text.length, 'characters');
            } else {
              console.warn('⚠️  Method 1 (getRawTextContent):', rawText?.length || 0, 'characters - too short');
              console.warn('  Raw text type:', typeof rawText);
              console.warn('  Raw text preview:', String(rawText).substring(0, 200));
            }
          } catch (e) {
            console.warn('⚠️  Method 1 (getRawTextContent) failed:', e);
          }
          
          // Method 2: Extract from Pages array if Method 1 failed
          if (!text || text.length < 100) {
            try {
              if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
                const extractedText: string[] = [];
                pdfData.Pages.forEach((page: any, pageIndex: number) => {
                  if (page.Texts && Array.isArray(page.Texts)) {
                    page.Texts.forEach((textItem: any) => {
                      if (textItem.R && Array.isArray(textItem.R)) {
                        textItem.R.forEach((r: any) => {
                          if (r.T) {
                            // Decode URI-encoded text
                            try {
                              const decoded = decodeURIComponent(r.T);
                              extractedText.push(decoded);
                            } catch (e) {
                              extractedText.push(r.T);
                            }
                          }
                        });
                      }
                    });
                  }
                });
                const method2Text = extractedText.join(' ');
                if (method2Text.length > text.length) {
                  text = method2Text;
                  console.log('✅ Method 2 (Pages extraction):', text.length, 'characters');
                }
              }
            } catch (e) {
              console.warn('⚠️  Method 2 (Pages extraction) failed:', e);
            }
          }
          
          // Method 3: Extract from all text fields if still empty
          if (!text || text.length < 100) {
            try {
              const allText: string[] = [];
              const extractTextFromObject = (obj: any): void => {
                if (typeof obj === 'string') {
                  allText.push(obj);
                } else if (Array.isArray(obj)) {
                  obj.forEach(item => extractTextFromObject(item));
                } else if (obj && typeof obj === 'object') {
                  Object.values(obj).forEach(value => extractTextFromObject(value));
                }
              };
              extractTextFromObject(pdfData);
              const method3Text = allText.filter(t => t && t.length > 2).join(' ');
              if (method3Text.length > text.length) {
                text = method3Text;
                console.log('✅ Method 3 (Deep extraction):', text.length, 'characters');
              }
            } catch (e) {
              console.warn('⚠️  Method 3 (Deep extraction) failed:', e);
            }
          }
          
          // Final fallback
          if (!text || text.length < 100) {
            console.error('❌ All extraction methods failed or returned insufficient text');
            console.error('  Final text length:', text.length);
            console.error('  PDF data keys:', Object.keys(pdfData || {}));
            // Still return what we have, but log the issue
          }
          
          console.log('📝 Final extracted text length:', text.length, 'characters');
          if (text.length > 0) {
            console.log('📝 Text preview (first 500 chars):', text.substring(0, 500));
          }
          
          // Parse the PDF text into sections
          const sections = parseBAASections(text);
          const requirements = extractRequirements(text);
          const deadlines = extractDeadlines(text);
          const structure = extractStructure(text);
          const technologySignals = extractTechnologySignals(text);
          const ingestSummary = buildIngestSummary(text);
          const noticeNumbers = extractNoticeNumbers(text);
          const titleInferred = inferSolicitationTitle(text, file.name.replace(/\.pdf$/i, ''));

          console.log('📊 Parsed results:');
          console.log('  Sections:', sections.length);
          console.log('  Requirements:', requirements.length);
          console.log('  Deadlines:', deadlines.length);
          console.log('  Structure:', structure.length);

          resolve(NextResponse.json({
            id: `baa-${Date.now()}`,
            title: titleInferred,
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            sections,
            requirements,
            deadlines,
            structure,
            rawText: text,
            pageCount: Array.isArray(pdfData?.Pages) ? pdfData.Pages.length : undefined,
            technologySignals,
            ingestSummary,
            noticeNumbers,
          }));
        } catch (error) {
          console.error('Error processing PDF data:', error);
          reject(error);
        }
      });
      
      // Parse the buffer
      pdfParser.parseBuffer(buffer);
    });
  } catch (error) {
    console.error('PDF parsing error:', error);
    return NextResponse.json(
      { error: 'Failed to parse PDF' },
      { status: 500 }
    );
  }
}

function parseBAASections(text: string) {
  const sections: any[] = [];
  const lines = text.split('\n');
  let currentSection: any = null;
  const level = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Detect section headers (common patterns)
    const sectionMatch = line.match(/^(\d+\.?\s*)+([A-Z][^0-9]+)/);
    if (sectionMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }
      
      const depth = (sectionMatch[1].match(/\./g) || []).length;
      currentSection = {
        id: `section-${sections.length + 1}`,
        title: sectionMatch[2].trim(),
        content: '',
        level: depth || 1,
      };
    } else if (currentSection && line.length > 0) {
      currentSection.content += line + '\n';
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections.length > 0 ? sections : [{
    id: 'section-1',
    title: 'Full Document',
    content: text,
    level: 1,
  }];
}

function extractRequirements(text: string) {
  const requirements: any[] = [];
  const requirementPatterns = [
    /must\s+[^.]*\./gi,
    /shall\s+[^.]*\./gi,
    /required\s+[^.]*\./gi,
    /requirement[^.]*\./gi,
  ];

  requirementPatterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((match, index) => {
        requirements.push({
          id: `req-${requirements.length + 1}`,
          text: match.trim(),
          section: 'General',
          required: true,
        });
      });
    }
  });

  return requirements.slice(0, 20); // Limit to 20 requirements
}

function extractDeadlines(text: string) {
  const deadlines: {
    id: string;
    description: string;
    date: string;
    type: 'submission' | 'question' | 'other';
  }[] = [];
  const pushDeadline = (
    snippet: string,
    dateStr: string,
    type: 'submission' | 'question' | 'other' = 'other',
  ) => {
    if (deadlines.length >= 12) return;
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return;
      const desc = snippet.replace(/\s+/g, ' ').trim().slice(0, 140);
      deadlines.push({
        id: `deadline-${deadlines.length + 1}`,
        description: desc || dateStr,
        date: date.toISOString(),
        type:
          /\b(question|questions?|Qs|FAQ|information)\b/i.test(snippet)
            ? 'question'
            : /\b(submit|submission|proposal|white paper|abstract|response due)\b/i.test(snippet)
              ? 'submission'
              : type,
      });
    } catch {
      /* skip */
    }
  };

  const labeled = [
    ...text.matchAll(
      /(?:deadline|due date|closing|submission|white\s*paper|abstract|full\s*proposal|questions?\s*due|Amendment)[^:.\n]{0,80}:\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2})/gi,
    ),
  ];
  labeled.forEach((m) => {
    const ctx = m[0];
    const dateStr = m[1];
    pushDeadline(ctx, dateStr);
  });

  const isoDates = [...text.matchAll(/\b(20[2-3]\d-\d{2}-\d{2})\b/g)];
  isoDates.slice(0, 8).forEach((m) => {
    const idx = m.index ?? 0;
    const ctx = text.slice(Math.max(0, idx - 70), Math.min(text.length, idx + 18));
    pushDeadline(ctx, m[1], 'other');
  });

  const loose = [...text.matchAll(/([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/g)];
  loose.forEach((m) => {
    if (deadlines.length >= 12) return;
    const idx = m.index ?? 0;
    const ctx = text.slice(Math.max(0, idx - 60), Math.min(text.length, idx + m[0].length + 10));
    pushDeadline(ctx, m[1], 'other');
  });

  const seen = new Set<string>();
  return deadlines.filter((d) => {
    const k = d.date.slice(0, 10);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function extractStructure(text: string) {
  const structure: string[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    const sectionMatch = trimmed.match(/^(\d+\.?\s*)+([A-Z][^0-9]+)/);
    if (sectionMatch) {
      structure.push(sectionMatch[2].trim());
    }
  }

  return structure.slice(0, 30); // Limit to 30 sections
}

const TECH_SIGNAL_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: 'AI / machine learning', pattern: /artificial intelligence|machine learning|\bAI\b(?!\.)|\bML\b|deep learning|neural nets?|large language|\bLLM\b|generative AI|foundation models/i },
  { label: 'Cybersecurity & zero trust', pattern: /cybersecurity|zero trust|supply chain risk|encryption|ZTNA|boundary protection|intrusion|\bIAM\b|risk management framework/i },
  { label: 'Cloud & DevSecOps', pattern: /\bAWS\b|Amazon Web Services|\bGCP\b|\bAzure\b|Kubernetes|\bK8s\b|containers?|Infrastructure as Code|CI\/CD|DevSecOps|multi-?cloud|hybrid cloud/i },
  { label: 'Data & analytics', pattern: /data analytics|big data|data fusion|streaming analytics|ontology|graph database|\bETL\b|data warehouse|telemetry/i },
  { label: 'Autonomy / robotics', pattern: /\bUAS\b|\bUA\b|autonomous systems|robotics|unmanned aerial/i },
  { label: 'Networking & SATCOM', pattern: /SATCOM|Tactical edge|WAN|LTE|mesh network|MPLS|software-?defined (network|radio)|5G|\bSDN\b/i },
  { label: 'Modeling & simulation', pattern: /modeling and simulation|M&S|digital engineering|digital twin|\bMBSE\b|validation and verification/i },
  { label: 'Software engineering', pattern: /software development|microservices|API-first|interop|open architecture|middleware|microkernel/i },
  { label: 'Test & evaluation', pattern: /test and evaluation|T&E|verification and validation|\bIV&V\b|qualification|accreditation/i },
  { label: 'Human-systems integration', pattern: /human[- ]systems|UX|usability|human factors|training systems|workload/i },
  { label: 'Hardware / sensors', pattern: /RF sensing|EO\/IR|signature|antenna|ASIC|FPGA|hardware assurance/i },
  { label: 'Trust & assurance', pattern: /formal methods|assurance|provenance|attestation|tamper resistance|high assurance/i },
];

function extractTechnologySignals(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const { label, pattern } of TECH_SIGNAL_PATTERNS) {
    if (pattern.test(text) && !seen.has(label)) {
      seen.add(label);
      out.push(label);
    }
  }
  return out.slice(0, 14);
}

function inferSolicitationTitle(text: string, fallbackBase: string): string {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  for (const line of lines.slice(0, 48)) {
    const clean = line.replace(/^[\s•\-–:]+/, '');
    if (clean.length < 24 || clean.length > 260) continue;
    if (/^page\s*\d|^table of contents|^\d+$|^\*{3,}|^-{3,}/i.test(clean)) continue;
    if (/^[A-Z\s]{18,}$/.test(clean) && clean.length < 120) continue;
    return clean.slice(0, 240);
  }
  return fallbackBase || 'Imported solicitation';
}

function buildIngestSummary(text: string, maxLen = 520): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (!collapsed) return '';
  const hardCap = Math.min(maxLen * 3, collapsed.length);
  const chunk = collapsed.slice(0, hardCap);
  const sentences = chunk.split(/(?<=[.!?])\s+/).filter((s) => s.length > 12);
  let out = '';
  for (const s of sentences) {
    const next = out ? `${out} ${s}` : s;
    if (next.length > maxLen) break;
    out = next;
  }
  if (!out) {
    out = collapsed.slice(0, maxLen);
  }
  if (collapsed.length > out.length + 20) {
    out = `${out.replace(/\s+$/, '')}…`;
  }
  return out;
}

function extractNoticeNumbers(text: string): string[] {
  const patterns = [
    /\bFA[0-9]{3,4}-[0-9]{2}-[0-9A-Z-]{3,}\b/gi,
    /\bW[0-9]{2}[A-Z][0-9]-[0-9A-Z]{2}-[0-9]{4,6}\b/gi,
    /\bHR[0-9]{3}[0-9A-Z.-]{4,}\b/gi,
    /\bBAA[-\s#:]*([0-9A-Z][0-9A-Z./-]{4,})\b/gi,
    /\bBroad Agency Announcement[\s#:]*([0-9A-Z][0-9A-Z./-]{4,})\b/gi,
  ];
  const found = new Set<string>();
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    const r = new RegExp(re.source, re.flags);
    while ((m = r.exec(text)) !== null) {
      const raw = (m[1] || m[0]).trim();
      if (raw.length >= 5 && raw.length <= 64) {
        found.add(raw.replace(/\s+/g, ' '));
      }
    }
  }
  return [...found].slice(0, 10);
}
