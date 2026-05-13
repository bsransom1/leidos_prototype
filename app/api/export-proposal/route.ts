import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { marked } from 'marked';

type ExportBody = {
  title: string;
  sections: Array<{ title: string; content: string }>;
};

function safeFilename(input: string) {
  const s = (input || 'proposal').trim().slice(0, 120);
  return s
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/[\/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as ExportBody | null;
  if (!body || !Array.isArray(body.sections)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const title = (body.title || 'Proposal').toString();
  const sections = body.sections.map((s) => ({
    title: (s?.title || '').toString(),
    content: (s?.content || '').toString(),
  }));

  const html = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${title.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')}</title>
    <style>
      html, body { margin: 0; padding: 0; }
      body {
        font-family: Georgia, "Times New Roman", Times, serif;
        font-size: 12pt;
        line-height: 1.35;
        color: #111827;
      }
      h1, h2, h3 {
        font-family: Georgia, "Times New Roman", Times, serif;
        color: #111827;
        margin: 0 0 0.35in 0;
      }
      h2 { font-size: 14pt; font-weight: 700; }
      p { margin: 0 0 0.14in 0; }
      ul, ol { margin: 0 0 0.14in 0.25in; padding: 0; }
      li { margin: 0 0 0.06in 0; }
      hr { border: none; border-top: 1px solid rgba(0,0,0,0.12); margin: 0.2in 0; }
    </style>
  </head>
  <body>
    ${sections
      .map((s) => {
        const t = s.title
          .replaceAll('&', '&amp;')
          .replaceAll('<', '&lt;')
          .replaceAll('>', '&gt;');
        const contentHtml = marked.parse(s.content || '');
        return `<h2>${t}</h2>${contentHtml}`;
      })
      .join('\n')}
  </body>
</html>
`.trim();

  // NOTE: Puppeteer may be heavy for Vercel serverless. If this becomes an issue,
  // migrate export to a dedicated worker or swap to @react-pdf/renderer.
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    // Puppeteer types bundled with this environment may not include networkidle options.
    await page.setContent(html, { waitUntil: 'load' });
    const pdf = await page.pdf({
      format: 'Letter',
      margin: { top: '1in', right: '1in', bottom: '1in', left: '1in' },
      printBackground: false,
    });

    const filename = `${safeFilename(title)}.pdf`;
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } finally {
    await browser.close();
  }
}

