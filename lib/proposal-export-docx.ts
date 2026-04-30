import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
  convertInchesToTwip,
} from 'docx';
import { marked } from 'marked';
import type { Token, Tokens } from 'marked';
import type { BAA, Proposal } from '@/types';

function headingLevelFromDepth(depth: number): (typeof HeadingLevel)[keyof typeof HeadingLevel] {
  switch (depth) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    case 5:
      return HeadingLevel.HEADING_5;
    default:
      return HeadingLevel.HEADING_6;
  }
}

type InlineOpts = { bold?: boolean; italics?: boolean; strike?: boolean };

function inlineToRuns(tokens: Token[] | undefined, opts?: InlineOpts): TextRun[] {
  if (!tokens?.length) {
    return [new TextRun({ text: '', ...opts })];
  }
  const runs: TextRun[] = [];
  for (const t of tokens) {
    switch (t.type) {
      case 'text':
        runs.push(new TextRun({ text: (t as Tokens.Text).text, ...opts }));
        break;
      case 'strong':
        runs.push(...inlineToRuns((t as Tokens.Strong).tokens, { ...opts, bold: true }));
        break;
      case 'em':
        runs.push(...inlineToRuns((t as Tokens.Em).tokens, { ...opts, italics: true }));
        break;
      case 'codespan':
        runs.push(
          new TextRun({
            text: (t as Tokens.Codespan).text,
            font: 'Courier New',
            size: 22,
            ...opts,
          })
        );
        break;
      case 'br':
        runs.push(new TextRun({ text: '', break: 1, ...opts }));
        break;
      case 'del':
        runs.push(...inlineToRuns((t as Tokens.Del).tokens, { ...opts, strike: true }));
        break;
      case 'link': {
        const link = t as Tokens.Link;
        const inner = inlineToRuns(link.tokens, opts);
        if (inner.length) runs.push(...inner);
        else runs.push(new TextRun({ text: link.href, underline: {}, ...opts }));
        break;
      }
      case 'escape':
        runs.push(new TextRun({ text: (t as Tokens.Escape).text, ...opts }));
        break;
      default:
        if ('tokens' in t && Array.isArray((t as Tokens.Generic).tokens)) {
          runs.push(...inlineToRuns((t as Tokens.Generic).tokens as Token[], opts));
        } else if ('text' in t && typeof (t as { text?: string }).text === 'string') {
          runs.push(new TextRun({ text: (t as { text: string }).text, ...opts }));
        }
        break;
    }
  }
  return runs.length ? runs : [new TextRun({ text: '', ...opts })];
}

function blockTokenToParagraphs(token: Token): Paragraph[] {
  switch (token.type) {
    case 'heading': {
      const h = token as Tokens.Heading;
      return [
        new Paragraph({
          heading: headingLevelFromDepth(h.depth),
          children: inlineToRuns(h.tokens),
          spacing: { before: 240, after: 120 },
        }),
      ];
    }
    case 'paragraph': {
      const p = token as Tokens.Paragraph;
      return [
        new Paragraph({
          children: inlineToRuns(p.tokens),
          spacing: { after: 200 },
        }),
      ];
    }
    case 'space':
      return [];
    case 'hr':
      return [
        new Paragraph({
          border: { bottom: { color: '999999', space: 1, style: 'single', size: 6 } },
          spacing: { after: 200 },
        }),
      ];
    case 'code': {
      const c = token as Tokens.Code;
      return [
        new Paragraph({
          children: [new TextRun({ text: c.text, font: 'Courier New', size: 20 })],
          spacing: { after: 200 },
          shading: { fill: 'F3F4F6' },
        }),
      ];
    }
    case 'blockquote': {
      const b = token as Tokens.Blockquote;
      return (b.tokens || []).flatMap((bt) => blockTokenToParagraphs(bt));
    }
    case 'list': {
      const list = token as Tokens.List;
      const out: Paragraph[] = [];
      let n = typeof list.start === 'number' ? list.start : 1;
      for (const item of list.items) {
        const li = item as Tokens.ListItem;
        const prefix = list.ordered ? `${n++}. ` : '• ';
        const runs = inlineToRuns(li.tokens);
        out.push(
          new Paragraph({
            children: [new TextRun(prefix), ...runs],
            spacing: { after: 120 },
            indent: { left: convertInchesToTwip(0.35), hanging: convertInchesToTwip(0.25) },
          })
        );
      }
      return out;
    }
    default:
      return [
        new Paragraph({
          text: 'tokens' in token && (token as Tokens.Generic).raw ? (token as Tokens.Generic).raw : '',
          spacing: { after: 200 },
        }),
      ];
  }
}

function markdownToParagraphs(markdown: string): Paragraph[] {
  const trimmed = markdown?.trim() ?? '';
  if (!trimmed) {
    return [new Paragraph({ text: '', spacing: { after: 200 } })];
  }
  const tokens = marked.lexer(trimmed);
  const paragraphs: Paragraph[] = [];
  for (const t of tokens) {
    paragraphs.push(...blockTokenToParagraphs(t));
  }
  return paragraphs.length ? paragraphs : [new Paragraph({ text: trimmed, spacing: { after: 200 } })];
}

export async function buildProposalSubmissionDocx(proposal: Proposal, baa: BAA): Promise<Blob> {
  const children: Paragraph[] = [];

  children.push(
    new Paragraph({
      text: 'Technical Proposal (Stage 1)',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: proposal.title,
          bold: true,
          size: 28,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
    new Paragraph({
      text: 'BAA / solicitation reference',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 120, after: 120 },
    }),
    new Paragraph({
      children: [new TextRun({ text: baa.title || baa.fileName || '—' })],
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: 'Proposal sections',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 200 },
    }),
    new Paragraph({
      text: 'The following sections are formatted for review and submission in accordance with typical DARPA BAA Stage 1 instructions. Edit in Word as needed before final upload.',
      spacing: { after: 400 },
    })
  );

  const sections = proposal.sections ?? [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    children.push(
      new Paragraph({
        text: `Section ${i + 1}: ${section.title}`,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: i === 0 ? 0 : 360, after: 200 },
      })
    );
    children.push(...markdownToParagraphs(section.content || ''));
  }

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: 'Times New Roman',
            size: 24,
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBlob(doc);
}

export function downloadProposalDocx(blob: Blob, proposalTitle: string): void {
  const safe = proposalTitle.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 120) || 'proposal';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safe}-DARPA-submission.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
