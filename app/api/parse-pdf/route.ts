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
          
          console.log('📊 Parsed results:');
          console.log('  Sections:', sections.length);
          console.log('  Requirements:', requirements.length);
          console.log('  Deadlines:', deadlines.length);
          console.log('  Structure:', structure.length);

          resolve(NextResponse.json({
            id: `baa-${Date.now()}`,
            title: file.name.replace('.pdf', ''),
            fileName: file.name,
            uploadedAt: new Date().toISOString(),
            sections,
            requirements,
            deadlines,
            structure,
            rawText: text, // CRITICAL: Always include rawText
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
  let level = 0;

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
  const deadlines: any[] = [];
  const datePatterns = [
    /(?:deadline|due date|submission date)[^:]*:\s*([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/gi,
    /([A-Z][a-z]+\s+\d{1,2},?\s+\d{4})/g,
  ];

  datePatterns.forEach(pattern => {
    const matches = Array.from(text.matchAll(pattern));
    matches.forEach((match, index) => {
      if (index < 5) { // Limit to 5 deadlines
        const dateStr = match[1] || match[0];
        try {
          const date = new Date(dateStr);
          if (!isNaN(date.getTime())) {
            deadlines.push({
              id: `deadline-${deadlines.length + 1}`,
              description: match[0].substring(0, 100),
              date: date.toISOString(),
              type: match[0].toLowerCase().includes('question') ? 'question' : 'submission',
            });
          }
        } catch (e) {
          // Invalid date, skip
        }
      }
    });
  });

  return deadlines;
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
