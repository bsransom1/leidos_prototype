/**
 * Parse Claude's proposal JSON response, recovering partial sections when
 * the model truncates or emits slightly malformed JSON.
 */

function extractTitle(jsonText: string): string | null {
  const match = jsonText.match(/"title"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return match?.[1]?.replace(/\\"/g, '"') ?? null;
}

/** Brace-aware extraction of each object inside the sections array. */
function extractSectionObjects(jsonText: string): Record<string, unknown>[] {
  const sections: Record<string, unknown>[] = [];
  const marker = '"sections"';
  const markerIdx = jsonText.indexOf(marker);
  if (markerIdx === -1) return sections;

  let i = jsonText.indexOf('[', markerIdx);
  if (i === -1) return sections;
  i += 1;

  while (i < jsonText.length) {
    while (i < jsonText.length && /[\s,]/.test(jsonText[i])) i += 1;
    if (i >= jsonText.length || jsonText[i] === ']') break;
    if (jsonText[i] !== '{') break;

    let depth = 0;
    let inString = false;
    let escape = false;
    const start = i;

    for (; i < jsonText.length; i += 1) {
      const c = jsonText[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (inString && c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (c === '{') depth += 1;
      else if (c === '}') {
        depth -= 1;
        if (depth === 0) {
          const chunk = jsonText.slice(start, i + 1);
          try {
            const parsed = JSON.parse(chunk) as Record<string, unknown>;
            if (parsed.id || parsed.title || parsed.content) {
              sections.push(parsed);
            }
          } catch {
            /* skip malformed section chunk */
          }
          i += 1;
          break;
        }
      }
    }
  }

  return sections;
}

function tryParseWithRepairs(jsonText: string): unknown {
  const attempts = [
    jsonText,
    jsonText.replace(/,\s*([\]}])/g, '$1'),
  ];

  for (const attempt of attempts) {
    try {
      return JSON.parse(attempt);
    } catch {
      /* try next repair */
    }
  }

  throw new Error('JSON parse failed after repair attempts');
}

export function parseGeneratedProposalJson(raw: string): {
  title?: string;
  sections?: unknown[];
  overallConfidence?: number;
  [key: string]: unknown;
} {
  let jsonText = raw.trim();
  jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

  const jsonStart = jsonText.indexOf('{');
  if (jsonStart === -1) {
    throw new Error('No valid JSON object found in response');
  }

  const jsonEnd = jsonText.lastIndexOf('}');
  const bounded =
    jsonEnd > jsonStart ? jsonText.substring(jsonStart, jsonEnd + 1) : jsonText.substring(jsonStart);
  const scanText = jsonText.substring(jsonStart);

  try {
    const parsed = tryParseWithRepairs(bounded) as {
      title?: string;
      sections?: unknown[];
      overallConfidence?: number;
    };
    if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
      return parsed;
    }
  } catch {
    /* fall through to section recovery */
  }

  const recoveredSections = extractSectionObjects(scanText);
  if (recoveredSections.length === 0) {
    throw new Error('JSON parse failed: could not recover any proposal sections from model output');
  }

  console.warn(
    `⚠️ Recovered ${recoveredSections.length} section(s) from malformed/truncated proposal JSON`,
  );

  return {
    title: extractTitle(scanText) ?? 'Generated Proposal',
    sections: recoveredSections,
    overallConfidence: 75,
  };
}
