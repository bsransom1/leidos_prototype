import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@/lib/supabase/server';
import { getPmRole, canEdit } from '@/lib/pm-access';
import { parseGeneratedProposalJson } from '@/lib/proposal-json-parse';

const anthropic = new Anthropic();
const GENERATION_MAX_TOKENS = 8000;
/** Rough char budget for progress bar during streaming (~4 chars/token). */
const ESTIMATED_STREAM_CHARS = GENERATION_MAX_TOKENS * 3.5;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baa, organizationContext, proposalId, demoMode } = body;

    const supabase = await createClient();

    if (!demoMode) {
      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();

      if (authErr || !user) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (proposalId && typeof proposalId === 'string') {
        const role = await getPmRole(supabase, user.id, user.email ?? undefined, proposalId);
        if (!canEdit(role)) {
          return new Response(JSON.stringify({ error: 'Only editors and admins can run proposal generation.' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }
    }

    if (!baa || !organizationContext) {
      return new Response(
        JSON.stringify({ error: 'BAA and organization context are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(JSON.stringify({ error: 'Anthropic API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Extract actual BAA text content - prioritize rawText, then sections, then fallback to JSON
    let baaText: string;
    if (typeof baa === 'string') {
      baaText = baa;
      console.log('✅ BAA is string, length:', baaText.length);
    } else if (baa.rawText && typeof baa.rawText === 'string' && baa.rawText.length > 100) {
      // Use rawText if available (from PDF parsing) - must be substantial
      baaText = baa.rawText;
      console.log('✅ Using BAA rawText:', baaText.length, 'characters');
    } else if (baa.sections && Array.isArray(baa.sections) && baa.sections.length > 0) {
      // Extract text from sections if rawText not available
      // Check if sections have meaningful content
      const sectionsWithContent = baa.sections.filter((s: any) => {
        const hasContent = (s.content && s.content.trim().length > 10) || 
                          (s.title && s.title !== 'Full Document');
        return hasContent;
      });
      
      if (sectionsWithContent.length > 0) {
        baaText = sectionsWithContent
          .map((section: any) => {
            const title = section.title || '';
            const content = section.content || '';
            // If content is empty but title exists, use title
            if (!content && title && title !== 'Full Document') {
              return title;
            }
            return title ? `${title}\n${content}` : content;
          })
          .filter((text: string) => text.trim().length > 0)
          .join('\n\n');
        console.log('✅ Extracted BAA text from sections:', baaText.length, 'characters');
        console.log('  Number of sections:', baa.sections.length);
        console.log('  Sections with content:', sectionsWithContent.length);
      } else {
        // Sections exist but have no content - this is a problem
        console.error('❌ Sections exist but have no meaningful content!');
        console.error('  Sections:', JSON.stringify(baa.sections).substring(0, 500));
        // Try to use structure if available
        if (baa.structure && Array.isArray(baa.structure) && baa.structure.length > 0) {
          baaText = baa.structure.join('\n');
          console.log('⚠️  Using BAA structure as fallback:', baaText.length, 'characters');
        } else {
          baaText = JSON.stringify(baa);
          console.warn('⚠️  Using JSON stringified BAA - no usable content found');
        }
      }
    } else {
      // Fallback to JSON stringify (shouldn't happen in normal flow)
      baaText = JSON.stringify(baa);
      console.warn('⚠️  Using JSON stringified BAA as fallback - rawText or sections not found');
      console.warn('  BAA object keys:', baa && typeof baa === 'object' ? Object.keys(baa).join(', ') : 'N/A');
    }
    
    // CRITICAL: If BAA text is too short or doesn't contain expected content, warn
    if (baaText.length < 500) {
      return new Response(
        JSON.stringify({
          error: 'BAA text is insufficient for generation. Please re-upload the solicitation document.',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Log domain indicators found in BAA (for debugging only - no hardcoding)
    const hasBiologicalContent = baaText.toLowerCase().includes('biological') || 
                                 baaText.toLowerCase().includes('bto') ||
                                 baaText.toLowerCase().includes('biotechnology');
    const hasAIContent = baaText.toLowerCase().includes('artificial intelligence') ||
                        baaText.toLowerCase().includes('machine learning') ||
                        baaText.toLowerCase().includes(' ai ') ||
                        baaText.toLowerCase().includes('ml ');
    console.log('📊 BAA Domain Indicators (for reference only):');
    console.log('  Contains biological terms:', hasBiologicalContent ? '✅ YES' : '❌ NO');
    console.log('  Contains AI/ML terms:', hasAIContent ? '✅ YES' : '❌ NO');
    console.log('  Note: Proposal will be based ONLY on actual BAA content, not these indicators');
    
    const baaStructure = baa.structure || [];
    
    // ALWAYS generate exactly 10 sections - use standard proposal sections if BAA doesn't provide enough
    const standardProposalSections = [
      'Executive Summary',
      'Technical Approach and Innovation',
      'Organizational Capability and Experience',
      'Team Qualifications and Key Personnel',
      'Statement of Work and Deliverables',
      'Budget and Resource Plan',
      'Timeline and Milestones',
      'Risk Management and Mitigation',
      'Evaluation and Success Metrics',
      'Conclusion and Next Steps'
    ];
    
    // Use BAA structure if it has 10+ sections, otherwise combine BAA sections with standard sections
    let finalSections: string[];
    if (baaStructure.length >= 10) {
      finalSections = baaStructure.slice(0, 10);
    } else {
      // Combine BAA sections with standard sections to reach exactly 10
      finalSections = [
        ...baaStructure,
        ...standardProposalSections.slice(baaStructure.length)
      ].slice(0, 10);
    }
    
    const totalSections = 10; // ALWAYS 10 sections
    
    // Parse organization context to ensure we can extract details
    let parsedOrgContext: any;
    try {
      parsedOrgContext = typeof organizationContext === 'string' 
        ? JSON.parse(organizationContext) 
        : organizationContext;
    } catch {
      parsedOrgContext = organizationContext;
    }
    const orgContextText = typeof organizationContext === 'string' 
      ? organizationContext 
      : JSON.stringify(organizationContext);

    const systemPrompt = `You are an expert proposal writer specializing in government research proposals (BAAs/RFPs). You MUST follow these rules:

GROUNDING RULES (NON-NEGOTIABLE):
- The proposal MUST be grounded in the provided BAA text and the organization context.
- NEVER invent requirements, programs, schedules, evaluation criteria, deadlines, or technical domains that are not explicitly present in the BAA.
- If a detail is not present in the BAA text, do NOT assume it. Instead, write generally and note uncertainty in the "feedback" field for that section.
- Do NOT hallucinate citations, statute/regulation references, or program office names.
- The proposal must reflect what the BAA actually asks for — nothing more, nothing less.

STRUCTURE RULES:
- Generate exactly 10 sections, in the exact order and titles provided.
- Each section MUST be a separate JSON object in the "sections" array.
- Use "id" values "section-1" through "section-10".
- The output MUST be valid JSON, parseable by JSON.parse().

PERSONALIZATION RULES:
- Personalize every section to the applying organization using the organization context.
- Reference the organization name repeatedly and tie claims to the team's actual capabilities, facilities, prior work, and constraints.
- Do NOT fabricate past performance, facilities, clearances, certifications, awards, or publications. Use ONLY what is present in the organization context JSON/details provided.

OUTPUT RULES:
- Return ONLY JSON. No markdown. No code fences. No extra commentary.
- Each section MUST include:
  - id (string)
  - title (string)
  - content (string, markdown allowed for lists/bold)
  - confidence (number 0-100)
  - status ("strong" | "needs-improvement" | "weak")
  - feedback (string[]; include at least one improvement note even for strong sections)
  - required (boolean)`;

    const truncatedBaaText = baaText.length > 100000 
      ? baaText.substring(0, 100000) + '\n\n[Content truncated...]'
      : baaText;
    
    // Parse organization context — supports both legacy and enhanced DARPA schema
    let orgDetails = '';
    try {
      const orgContext = parsedOrgContext;

      if (orgContext.organization) {
        const orgDisplayName =
          orgContext.organization.legal_name ||
          orgContext.organization.name ||
          'the applying organization';
        const institution =
          orgContext.organization.institution_parent ||
          orgContext.organization.institution || '';
        const cage = orgContext.organization.cage_code || '';
        const cmmc = orgContext.organization.cmmc_certification?.level || '';
        const fsc = orgContext.organization.facility_security_clearance?.level || '';
        const samStatus = orgContext.organization.sam_registration?.status || '';

        const contact = orgContext.primary_contact || orgContext.organization.primary_contact;
        const techPOC = orgContext.technical_poc;

        const priorDARPA: any[] = orgContext.research_profile?.prior_darpa_awards || [];
        const priorPubs: any[] = orgContext.research_profile?.prior_publications || [];
        const subawardees: any[] = orgContext.subawardees_and_partners || [];
        const infra = orgContext.research_profile?.technical_infrastructure;

        const techGoalLines = (orgContext.project_goals?.technical_goals || [])
          .map((g: any) => (typeof g === 'string' ? g : `${g.title}: ${g.description || ''}`))
          .join('; ');
        const outcomeLines = (orgContext.project_goals?.expected_outcomes || [])
          .map((o: any) => (typeof o === 'string' ? o : o.deliverable || ''))
          .join('; ');

        orgDetails = `
ORGANIZATION DETAILS (REFERENCE THE ORGANIZATION BY NAME IN EVERY SECTION — AT LEAST 3-5 TIMES PER MAJOR SECTION):
- Organization: ${orgDisplayName}${institution ? ` (${institution})` : ''}
- Type: ${orgContext.organization.type || 'N/A'}
${cage ? `- CAGE Code: ${cage}` : ''}${cmmc ? ` | CMMC Level ${cmmc}` : ''}${fsc ? ` | Facility Clearance: ${fsc}` : ''}${samStatus ? ` | SAM: ${samStatus}` : ''}
- Website: ${orgContext.organization.website || 'N/A'}
- Description: ${orgContext.organization.description || 'N/A'}

POINTS OF CONTACT:
- Primary: ${contact?.name || 'N/A'} (${contact?.title || contact?.role || 'N/A'}) — ${contact?.email || ''}
${techPOC?.name ? `- Technical POC: ${techPOC.name} (${techPOC.title || 'N/A'}) — ${techPOC.background_summary || ''}` : ''}

TEAM MEMBERS (CITE EACH BY FULL NAME AND CREDENTIALS — THEY STRENGTHEN EVERY TECHNICAL SECTION):
${(orgContext.team || []).map((member: any) => {
  const clearance = member.security_clearance?.level || 'None';
  const edu = member.education
    ? `${member.education.degree || ''} ${member.education.field || ''}${member.education.institution ? ` (${member.education.institution})` : ''}`.trim()
    : '';
  const pubs = member.publications_last_3_years
    ? `${member.publications_last_3_years} pubs last 3 yrs`
    : '';
  return `- ${member.name}: ${member.title || member.role} | ${member.allocation_percent}% effort | Clearance: ${clearance}${edu ? ` | ${edu}` : ''}${pubs ? ` | ${pubs}` : ''}
  Expertise: ${Array.isArray(member.expertise) ? member.expertise.join(', ') : 'N/A'}${member.relevant_experience ? `\n  Background: ${member.relevant_experience}` : ''}`;
}).join('\n') || 'No team members specified'}

RESEARCH PROFILE:
- Focus Areas: ${Array.isArray(orgContext.research_profile?.focus_areas) ? orgContext.research_profile.focus_areas.join(', ') : 'N/A'}
- Research Description: ${orgContext.research_profile?.research_description || orgContext.research_profile?.prior_experience || 'N/A'}
- Key Capabilities: ${Array.isArray(orgContext.research_profile?.key_capabilities) ? orgContext.research_profile.key_capabilities.join(', ') : 'N/A'}
${infra ? `- Computing Resources: ${infra.computing_resources || 'N/A'}
- Lab Facilities: ${infra.laboratory_facilities || 'N/A'}
- Software Tools: ${infra.software_tools || 'N/A'}` : ''}

${priorDARPA.length > 0 ? `PRIOR DARPA AWARDS (CITE THESE TO ESTABLISH CREDIBILITY — VERY IMPORTANT):
${priorDARPA.map((a: any) => `- ${a.program_name} (${a.award_number || 'N/A'}): $${(a.award_amount_usd || 0).toLocaleString()} | ${a.status || ''} | ${a.outcomes || ''}`).join('\n')}` : ''}

${priorPubs.length > 0 ? `KEY PUBLICATIONS (REFERENCE TO DEMONSTRATE TECHNICAL DEPTH):
${priorPubs.slice(0, 6).map((p: any) => `- "${p.title}" (${p.venue || ''}, ${p.year || ''})${p.relevance_to_proposal ? ` — ${p.relevance_to_proposal}` : ''}`).join('\n')}` : ''}

${subawardees.length > 0 ? `SUBAWARDEES & PARTNERS (DESCRIBE THEIR ROLES IN RELEVANT SECTIONS):
${subawardees.map((s: any) => `- ${s.organization_name}: ${s.role_description || ''} | $${(s.award_amount_usd || 0).toLocaleString()} | CMMC Lvl ${s.cmmc_level_required || 'N/A'}`).join('\n')}` : ''}

FUNDING PLAN:
- Total Requested: $${(orgContext.funding_plan?.total_requested_usd || 0).toLocaleString()}
- Period: ${orgContext.funding_plan?.period_of_performance_months || 'N/A'} months (${orgContext.funding_plan?.period_start_date || ''} – ${orgContext.funding_plan?.period_end_date || ''})
- Instrument: ${orgContext.funding_plan?.requested_instrument_type || 'N/A'}
${orgContext.funding_plan?.cost_share_contributed_usd ? `- Cost Share: $${orgContext.funding_plan.cost_share_contributed_usd.toLocaleString()} (${orgContext.funding_plan.cost_share_percent || 0}%) — ${orgContext.funding_plan.cost_share_description || ''}` : ''}
${(orgContext.funding_plan?.breakdown || []).map((item: any) => `- ${item.category}: $${(item.amount_usd || 0).toLocaleString()} (${item.percent_of_total || 0}%) — ${item.notes || ''}`).join('\n')}

PROJECT GOALS:
- Primary Objective: ${orgContext.project_goals?.primary_objective || 'N/A'}
${orgContext.project_goals?.fundamental_research_claim ? `- Fundamental Research: YES — ${orgContext.project_goals.fundamental_research_justification || 'results will be published without restriction'}` : ''}
- Technical Goals: ${techGoalLines || 'N/A'}
- Expected Outcomes: ${outcomeLines || 'N/A'}
${orgContext.project_goals?.relationship_to_i2o_thrust_areas?.length
  ? `- I2O Alignment: ${orgContext.project_goals.relationship_to_i2o_thrust_areas.map((t: any) => `${t.thrust_area}: ${t.alignment}`).join(' | ')}`
  : ''}

COMPLIANCE STATUS:
- Export Control: ${orgContext.compliance_and_constraints?.export_control?.applicable !== undefined
  ? (orgContext.compliance_and_constraints.export_control.applicable
    ? `Applicable (${orgContext.compliance_and_constraints.export_control.categories || ''})`
    : 'Not Applicable')
  : (orgContext.compliance_and_constraints?.export_control_applicable ? 'Applicable' : 'Not Applicable')}
- Classified Work: ${orgContext.compliance_and_constraints?.security_requirements?.classified_work !== undefined
  ? (orgContext.compliance_and_constraints.security_requirements.classified_work ? 'Yes' : 'No')
  : 'Not specified'}
${orgContext.compliance_and_constraints?.special_considerations ? `- Special Considerations: ${orgContext.compliance_and_constraints.special_considerations}` : ''}
`;
      }
    } catch {
      orgDetails = `\nORGANIZATION CONTEXT (raw): ${orgContextText}`;
    }

    const orgName =
      parsedOrgContext?.organization?.legal_name ||
      parsedOrgContext?.organization?.name ||
      'the applying organization';
    
    // Log what we're sending for debugging
    console.log('📋 BAA Content Summary:');
    console.log('  BAA Title:', baa.title || 'Untitled');
    console.log('  BAA Object Type:', typeof baa);
    console.log('  BAA has rawText field:', !!(baa && typeof baa === 'object' && 'rawText' in baa));
    if (baa && typeof baa === 'object') {
      console.log('  BAA rawText type:', typeof baa.rawText);
      console.log('  BAA rawText value:', baa.rawText ? `Present (${baa.rawText.length} chars)` : 'NULL/UNDEFINED/EMPTY');
      if (baa.rawText && typeof baa.rawText === 'string') {
        console.log('  BAA rawText preview:', baa.rawText.substring(0, 200));
      }
      console.log('  BAA sections count:', Array.isArray(baa.sections) ? baa.sections.length : 'Not an array');
      if (Array.isArray(baa.sections) && baa.sections.length > 0) {
        console.log('  BAA sections[0]:', JSON.stringify(baa.sections[0]).substring(0, 200));
      }
      console.log('  BAA object keys:', Object.keys(baa).join(', '));
    }
    console.log('  BAA Text Length:', baaText.length, 'characters');
    console.log('  BAA Text Preview (first 500 chars):', baaText.substring(0, 500));
    console.log('  BAA Text contains "biological":', baaText.toLowerCase().includes('biological') ? '✅ YES' : '❌ NO');
    console.log('  BAA Text contains "BTO":', baaText.includes('BTO') ? '✅ YES' : '❌ NO');
    console.log('  BAA Text contains "DARPA":', baaText.includes('DARPA') ? '✅ YES' : '❌ NO');
    console.log('  BAA Text contains "AI" or "artificial intelligence":', (baaText.toLowerCase().includes('artificial intelligence') || baaText.toLowerCase().includes(' ai ')) ? '✅ YES' : '❌ NO');
    console.log('  BAA Structure:', baaStructure.length, 'sections');
    console.log('  Organization Name:', orgName);
    
    const userPrompt = `Write a grounded Stage 1 BAA proposal for ${orgName}.

You MUST follow the BAA requirements exactly as written in the BAA text. Do NOT invent requirements, deadlines, evaluation criteria, or technical domains not explicitly present in the BAA text. If a required detail is missing from the BAA text, write generally and add an improvement note to that section's "feedback".

BAA TITLE: ${baa.title || 'Untitled BAA'}
BAA STRUCTURE FROM DOCUMENT: ${baaStructure.join(' → ')}

PROPOSAL SECTIONS TO GENERATE (EXACTLY 10 SECTIONS, IN THIS ORDER):
${finalSections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

${orgDetails}

FULL BAA CONTENT (AUTHORITATIVE SOURCE; USE ONLY THIS FOR REQUIREMENTS):
${truncatedBaaText}

FULL ORGANIZATION CONTEXT JSON (AUTHORITATIVE SOURCE; USE ONLY THIS FOR ORG FACTS):
${orgContextText}

Return ONLY valid JSON in this structure:
{
  "title": "Proposal Title",
  "sections": [
    {
      "id": "section-1",
      "title": "${finalSections[0]}",
      "content": "string",
      "confidence": 0,
      "status": "needs-improvement",
      "feedback": ["string improvement note"],
      "required": true
    }
    // ... sections 2..10
  ],
  "overallConfidence": 0
}`;

    // Store finalSections in a variable accessible to the stream handler
    const sectionsToGenerate = finalSections;
    const orgNameForGeneration = parsedOrgContext?.organization?.name || 'the applying organization';
    
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendProgress = (progress: number, message: string) => {
          const data = JSON.stringify({ type: 'progress', progress, message });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };
        
        let currentSectionTitle = '';

        const sendSectionStart = (sectionIndex: number, sectionTitle: string) => {
          currentSectionTitle = sectionTitle;
          const data = JSON.stringify({
            type: 'section-start',
            sectionIndex,
            sectionTitle,
            totalSections,
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        const sendChunkUpdate = (chunkCount: number, totalChars: number) => {
          const data = JSON.stringify({ 
            type: 'chunk-update', 
            chunkCount, 
            totalChars,
            sectionTitle: currentSectionTitle,
            message: `chunks ${chunkCount} / ${totalChars.toLocaleString()} chars`
          });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        try {
          sendProgress(5, 'Initializing proposal generation...');
          
          sendProgress(10, 'Generating proposal content...');

          // Announce the first section immediately
          if (sectionsToGenerate.length > 0) {
            sendSectionStart(1, sectionsToGenerate[0]);
          }

          let fullText = '';
          let detectedSections = 1;
          let chunkCount = 0;
          let totalContentLength = 0;
          let lastProgressPct = 10;

          const stream = anthropic.messages.stream({
            model: 'claude-sonnet-4-6',
            max_tokens: GENERATION_MAX_TOKENS,
            system: systemPrompt,
            messages: [{ role: 'user', content: userPrompt }],
          });

          stream.on('text', (textDelta) => {
            if (!textDelta) return;
            fullText += textDelta;
            totalContentLength += textDelta.length;
            chunkCount++;

            if (chunkCount % 50 === 0) {
              sendChunkUpdate(chunkCount, totalContentLength);
            }

            // Detect completed section objects via stable id markers (not `},{` in content)
            const sectionIds = [...fullText.matchAll(/"id"\s*:\s*"section-(\d+)"/g)].map((m) =>
              parseInt(m[1], 10),
            );
            const maxSectionId = sectionIds.length ? Math.max(...sectionIds) : 1;
            if (maxSectionId > detectedSections) {
              for (let s = detectedSections + 1; s <= maxSectionId; s++) {
                const title = sectionsToGenerate[s - 1];
                if (title) sendSectionStart(s, title);
              }
              detectedSections = maxSectionId;
            }

            const charPct = Math.min(88, 10 + (totalContentLength / ESTIMATED_STREAM_CHARS) * 78);
            const sectionPct = Math.min(88, 10 + (detectedSections / totalSections) * 78);
            const pct = Math.max(charPct, sectionPct);
            if (pct >= lastProgressPct + 1) {
              lastProgressPct = Math.floor(pct);
              sendProgress(
                lastProgressPct,
                `Generating section ${detectedSections} of ${totalSections}…`,
              );
            }
          });

          await stream.finalMessage();

          sendProgress(95, 'Processing and validating proposal...');

          let proposalData: any;
          try {
            proposalData = parseGeneratedProposalJson(fullText);
            console.log('✅ JSON parsed successfully');
            console.log('📊 Sections found:', proposalData.sections?.length || 0);
            if (proposalData.sections) {
              proposalData.sections.forEach((s: any, i: number) => {
                const wordCount = (s.content || '').split(/\s+/).filter((w: string) => w.length > 0).length;
                console.log(`  Section ${i + 1} (${s.title}): ${wordCount} words`);
              });
            }
          } catch (parseError: any) {
            console.error('❌ JSON parse failed:', parseError.message);
            console.error('📝 Response length:', fullText.length);
            console.error('📝 Response start:', fullText.substring(0, 200));
            throw new Error(`JSON parse failed: ${parseError.message}`);
          }

          // Ensure we have exactly 10 sections
          if (!proposalData.sections || !Array.isArray(proposalData.sections) || proposalData.sections.length === 0) {
            proposalData.sections = sectionsToGenerate.map((title: string, index: number) => ({
              id: `section-${index + 1}`,
              title,
              content: `Content for ${title} section.`,
              confidence: 75,
              status: 'needs-improvement',
              feedback: [],
              required: true,
            }));
            proposalData.overallConfidence = proposalData.overallConfidence || 75;
          }
          
          // If we have sections but not 10, pad or trim to exactly 10
          if (proposalData.sections.length < 10) {
            const missingCount = 10 - proposalData.sections.length;
            const existingTitles = proposalData.sections.map((s: any) => s.title);
            const missingSections = sectionsToGenerate.filter(title => !existingTitles.includes(title));
            
            for (let i = 0; i < missingCount && i < missingSections.length; i++) {
              proposalData.sections.push({
                id: `section-${proposalData.sections.length + 1}`,
                title: missingSections[i],
                content: `Detailed content for ${missingSections[i]} section. ${orgNameForGeneration} will address this requirement through our comprehensive approach leveraging our team's expertise and organizational capabilities.`,
                confidence: 75,
                status: 'needs-improvement',
                feedback: [],
                required: true,
              });
            }
          } else if (proposalData.sections.length > 10) {
            // Trim to exactly 10 sections
            proposalData.sections = proposalData.sections.slice(0, 10);
          }
          
          // Ensure all sections have correct IDs and titles matching sectionsToGenerate
          proposalData.sections = proposalData.sections.map((section: any, index: number) => ({
            ...section,
            id: `section-${index + 1}`,
            title: sectionsToGenerate[index] || section.title,
          }));

          // Validate and normalize section shape (NO enhancement pass)
          proposalData.sections = proposalData.sections.map((section: any, index: number) => {
            const feedback: string[] = Array.isArray(section.feedback)
              ? section.feedback
                  .map((fb: any) => (typeof fb === 'string' ? fb : fb?.text))
                  .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
              : [];
            
            if (feedback.length === 0) {
              feedback.push('Clarify alignment to specific BAA requirements and organization capabilities.');
            }
            
            return {
              id: section.id || `section-${index + 1}`,
              title: section.title || sectionsToGenerate[index] || `Section ${index + 1}`,
              content: typeof section.content === 'string' ? section.content : String(section.content ?? ''),
              confidence: typeof section.confidence === 'number' ? section.confidence : 75,
              status: ['strong', 'needs-improvement', 'weak'].includes(section.status)
                ? section.status
                : 'needs-improvement',
              feedback,
              required: section.required !== false,
            };
          });
          
          // Grounding verification pass (best-effort; skip in demo for speed)
          if (!demoMode) {
          sendProgress(90, 'Verifying proposal grounding...');
          try {
            const auditorPrompt = `You are a grounding auditor. You will be given (1) the BAA text and (2) a generated proposal (JSON).

For each of the 10 sections, evaluate whether the section's claims and requirements alignment are grounded in the BAA text.

Return ONLY JSON as an array of 10 objects:
[
  {
    "sectionIndex": 0,
    "groundingScore": 0,
    "flag": "grounded" | "partially-grounded" | "ungrounded",
    "note": "short improvement note or null"
  }
]

BAA TEXT:
${truncatedBaaText}

PROPOSAL JSON:
${JSON.stringify({ title: proposalData.title, sections: proposalData.sections }, null, 2)}
`;
            
            const groundingResp = await anthropic.messages.create({
              model: 'claude-sonnet-4-6',
              max_tokens: 1000,
              messages: [{ role: 'user', content: auditorPrompt }],
            });
            
            const txt = (groundingResp.content || [])
              .filter((b: any) => b.type === 'text')
              .map((b: any) => b.text)
              .join('')
              .trim();
            
            const start = txt.indexOf('[');
            const end = txt.lastIndexOf(']');
            const json = start !== -1 && end !== -1 ? txt.slice(start, end + 1) : txt;
            
            const results = JSON.parse(json) as Array<{
              sectionIndex: number;
              groundingScore: number;
              flag: 'grounded' | 'partially-grounded' | 'ungrounded';
              note: string | null;
            }>;
            
            let flagged = 0;
            for (const r of results) {
              const idx = Number(r.sectionIndex);
              const s = proposalData.sections?.[idx];
              if (!s) continue;
              
              if (r.flag === 'ungrounded') {
                flagged++;
                s.confidence = Math.max(40, (Number(s.confidence) || 0) - 15);
                if (s.status !== 'weak') s.status = 'needs-improvement';
              } else if (r.flag === 'partially-grounded') {
                flagged++;
                s.confidence = Math.max(50, (Number(s.confidence) || 0) - 7);
              }
              
              if (r.note) {
                s.feedback = Array.isArray(s.feedback) ? [...s.feedback, r.note] : [r.note];
              }
            }
            
            if (flagged >= 3) {
              proposalData.overallConfidence = Math.max(
                50,
                (Number(proposalData.overallConfidence) || 0) - 10
              );
            }
          } catch (e: any) {
            console.error('Grounding check failed:', e?.message || e);
          }
          }
          
          // Log total word count for validation
          const totalWords = proposalData.sections.reduce((sum: number, s: any) => {
            return sum + (s.content?.split(/\s+/).filter((w: string) => w.length > 0).length || 0);
          }, 0);
          console.log(`📊 Generated proposal: ${totalWords} total words across ${proposalData.sections.length} sections`);
          if (totalWords < 4000) {
            console.warn(`⚠️ Proposal is shorter than target (${totalWords} words vs 5,000-6,000 target)`);
          }

          sendProgress(100, 'Proposal generation complete!');
          
          const result = JSON.stringify({ type: 'complete', data: proposalData });
          controller.enqueue(encoder.encode(`data: ${result}\n\n`));
          controller.close();

        } catch (error: any) {
          console.error('Error in proposal generation:', error.message);
          const errorMsg = JSON.stringify({ 
            type: 'error', 
            error: error.message || 'Failed to generate proposal'
          });
          controller.enqueue(encoder.encode(`data: ${errorMsg}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
