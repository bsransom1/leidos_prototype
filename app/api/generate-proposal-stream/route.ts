import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

if (!process.env.OPENAI_API_KEY) {
  console.error('OPENAI_API_KEY is not set');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baa, organizationContext } = body;

    if (!baa || !organizationContext) {
      return new Response(
        JSON.stringify({ error: 'BAA and organization context are required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
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
      console.error('❌ CRITICAL: BAA text is too short! Length:', baaText.length);
      console.error('  This suggests rawText was not preserved. BAA content may not be used properly.');
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
    } catch (e) {
      parsedOrgContext = organizationContext;
    }
    const orgContextText = typeof organizationContext === 'string' 
      ? organizationContext 
      : JSON.stringify(organizationContext);

    const systemPrompt = `You are an expert proposal writer specializing in government research proposals (BAAs/RFPs). Your task is to generate a comprehensive, Stage 1 BAA proposal that is approximately 10 pages in length (when formatted as a standard document).

CRITICAL REQUIREMENTS:
- The total proposal must be approximately 10 pages when formatted (roughly 5,000-6,000 words total)
- Each section must be substantial and detailed (typically 500-800 words per section)
- You MUST personalize EVERY section with the specific organization's name, team members, expertise, prior work, and capabilities from the ORGANIZATION CONTEXT
- NEVER write generic proposals - always mention the specific organization name, team members by name, their specific roles and expertise, and their prior relevant work
- Include specific technical details, methodologies, and concrete examples tied to the organization's actual capabilities
- Demonstrate deep understanding of the BAA requirements AND how this specific organization uniquely addresses them
- Show clear alignment between THIS organization's specific capabilities and the BAA objectives
- Use professional, technical language appropriate for government research proposals
- Include realistic timelines, deliverables, and success metrics specific to this organization
- Provide detailed technical approaches that reference the organization's actual team members, facilities, and prior work

Generate a well-structured proposal with the following characteristics:
- Addresses ALL requirements and sections from the BAA comprehensively
- PERSONALIZED to the specific organization - mention organization name, team members, and their expertise throughout
- Demonstrates clear alignment between THIS organization's specific capabilities and the BAA requirements
- Includes specific, concrete details about the organization's team, facilities, prior work, and capabilities
- Follows the exact structure and section titles from the BAA
- Each section is substantial (500-800 words minimum) and personalized
- Provides realistic confidence scores (60-95%) based on proposal strength
- Includes actionable feedback for improvement where needed`;

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
    } catch (e) {
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
    
    const userPrompt = `Generate a comprehensive Stage 1 BAA research proposal for ${orgName}. This proposal MUST be personalized to this specific organization and MUST be approximately 10 pages (5,000-6,000 words total).

BAA TITLE: ${baa.title || 'Untitled BAA'}
BAA STRUCTURE FROM DOCUMENT: ${baaStructure.join(' → ')}
PROPOSAL SECTIONS TO GENERATE (EXACTLY 10 SECTIONS):
${finalSections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

CRITICAL: You MUST generate EXACTLY ${totalSections} separate sections. Each section must be a completely separate object in the "sections" array.

${orgDetails}

CRITICAL BAA CONTENT REQUIREMENTS (MANDATORY):
- The FULL BAA CONTENT below contains the actual requirements, objectives, and details from the BAA document
- You MUST read and understand the FULL BAA CONTENT thoroughly before writing ANYTHING
- Your proposal MUST directly address the specific requirements, objectives, and topics mentioned in the FULL BAA CONTENT
- DO NOT make assumptions about the domain - ONLY use what is explicitly stated in the FULL BAA CONTENT below
- DO NOT add domain-specific content that is not mentioned in the BAA
- Reference specific requirements, methods, objectives, and topics from the FULL BAA CONTENT in your proposal sections
- The proposal MUST reflect EXACTLY what the BAA asks for - nothing more, nothing less

BAA TITLE: ${baa.title || 'Untitled BAA'}

FULL BAA CONTENT (READ THIS CAREFULLY - THIS IS THE ACTUAL BAA DOCUMENT - YOU MUST USE ONLY THIS CONTENT):
${truncatedBaaText}

CRITICAL: Your proposal MUST be based SOLELY on the BAA content above. Do NOT add domain-specific content that is not explicitly mentioned in the BAA. If the BAA is about AI, write about AI. If it's about biology, write about biology. If it's about engineering, write about engineering. Use ONLY what the BAA specifies.

FULL ORGANIZATION CONTEXT JSON:
${orgContextText}

CRITICAL PERSONALIZATION REQUIREMENTS:
- You MUST write this proposal as if ${orgName} is submitting it
- Mention the organization name "${orgName}" multiple times throughout the proposal (at least 3-5 times per section)
- Reference specific team members BY NAME and their specific expertise in relevant sections
- Incorporate the organization's prior experience, capabilities, and research focus into the technical approach
- Make it clear this is THEIR proposal, not a generic template
- Use "we", "our team", "our organization", "our lab" when referring to the applying organization

CRITICAL SECTION REQUIREMENTS (MANDATORY):
- You MUST generate EXACTLY ${totalSections} SEPARATE sections - NOT one combined section
- Each section MUST be a separate object in the JSON "sections" array
- Each section MUST have a unique "id" (section-1, section-2, etc.)
- Each section MUST have a unique "title" matching the list above
- The ENTIRE proposal must be approximately 10 pages when formatted (5,000-6,000 words total)
- Each section MUST be 500-800 words minimum - COUNT YOUR WORDS AND EXPAND IF NEEDED
- With ${totalSections} sections, each section should average ${Math.round(5500 / totalSections)} words to reach 5,500 words total
- Be detailed, specific, and comprehensive - this is a Stage 1 proposal that must demonstrate deep understanding
- If a section is less than 500 words, you MUST expand it with:
  * More details about how ${orgName} specifically will approach this
  * Specific examples from ${orgName}'s prior work
  * Detailed explanations of team member contributions (mention names)
  * More technical depth and methodology
  * Specific deliverables and timelines
  * Risk mitigation strategies
  * Innovation and unique value propositions
  * Budget breakdowns (for Budget section)
  * Team member details (for Team section)
  * Technical specifications (for Technical Approach section)

CONTENT DEPTH REQUIREMENTS FOR EACH SECTION:
- Technical Approach: Detailed methodology referencing the organization's specific capabilities, mention team members by name and their roles, specific techniques tied to their expertise, step-by-step processes
- Team Qualifications: List each team member BY NAME, their specific expertise areas, relevant experience from their background, credentials, and how their skills address the BAA requirements
- Facilities & Resources: Detailed descriptions of the organization's actual capabilities, equipment, infrastructure, and how they support this project
- Budget & Timeline: Use the funding plan from the organization context, realistic detailed breakdowns with justifications tied to their specific needs
- Deliverables: Specific, measurable outcomes with clear success criteria that align with the organization's project goals
- Risk Mitigation: Detailed risk analysis with specific mitigation strategies leveraging the organization's capabilities
- Innovation: Specific technical innovations tied to the organization's research focus and prior work

CRITICAL JSON FORMATTING INSTRUCTIONS:
1. Return ONLY valid JSON - no markdown code blocks, no explanations, no text before or after
2. Ensure all strings are properly escaped - use backslash-quote for quotes inside content strings
3. Ensure all brackets and braces are properly closed
4. The JSON must be parseable by JSON.parse() - validate it before returning
5. Each section's "content" field must be 500-800 words minimum
6. You MUST create EXACTLY ${totalSections} separate section objects in the "sections" array
7. DO NOT combine multiple sections into one - each section title must be its own separate object
8. The "sections" array must have exactly ${totalSections} elements, no more, no less

CRITICAL MARKDOWN FORMATTING FOR CONTENT FIELDS:
- Use **text** for bold text (e.g., **Phase 1:** or **Key Milestones:**)
- Use proper markdown list syntax: Start bullet points with "- " (hyphen + space) followed by content
- Example: "- **Month 1:** Description here" or "- Description here"
- Use proper spacing: Always include a space after "-" for list items
- Use numbered lists with "1. ", "2. ", etc. for ordered lists
- Use ## for section headers within content if needed
- Ensure proper paragraph breaks with blank lines between paragraphs

Required JSON structure (MUST HAVE EXACTLY ${totalSections} SECTIONS):
{
  "title": "Comprehensive Proposal Title for ${orgName}",
  "sections": [
    {
      "id": "section-1",
      "title": "${finalSections[0]}",
      "content": "Detailed section content here. This MUST be 500-800 words minimum (COUNT YOUR WORDS). Include: (1) Specific mention of ${orgName} and how ${orgName} will approach this, (2) Reference to specific team members BY NAME and their expertise areas, (3) ${orgName}'s prior relevant work and capabilities from the organization context, (4) Specific technical details, methodologies, examples, timelines, deliverables, and concrete information tied to ${orgName}. Be comprehensive and demonstrate deep understanding of both the BAA requirements AND how ${orgName} specifically addresses them. Expand extensively on technical approaches, team capabilities (mention team member names), resources, and expected outcomes in detail. Write as if ${orgName} is speaking directly about their proposal. Use 'we', 'our team', 'our organization' when appropriate. DO NOT write generic content - every sentence should be specific to ${orgName}.",
      "confidence": 85,
      "status": "strong",
      "feedback": [],
      "required": true
    },
    {
      "id": "section-2",
      "title": "${finalSections[1]}",
      "content": "[500-800 words of detailed content for this section, personalized to ${orgName}]"
    },
    {
      "id": "section-3",
      "title": "${finalSections[2]}",
      "content": "[500-800 words of detailed content for this section, personalized to ${orgName}]"
    },
    {
      "id": "section-4",
      "title": "${finalSections[3]}",
      "content": "[500-800 words of detailed content for this section, personalized to ${orgName}]"
    },
    {
      "id": "section-5",
      "title": "${finalSections[4]}",
      "content": "[500-800 words of detailed content for this section, personalized to ${orgName}]"
    },
    {
      "id": "section-6",
      "title": "${finalSections[5]}",
      "content": "[500-800 words of detailed content for this section, personalized to ${orgName}]"
    },
    {
      "id": "section-7",
      "title": "${finalSections[6]}",
      "content": "[500-800 words of detailed content for this section, personalized to ${orgName}]"
    },
    {
      "id": "section-8",
      "title": "${finalSections[7]}",
      "content": "[500-800 words of detailed content for this section, personalized to ${orgName}]"
    },
    {
      "id": "section-9",
      "title": "${finalSections[8]}",
      "content": "[500-800 words of detailed content for this section, personalized to ${orgName}]"
    },
    {
      "id": "section-10",
      "title": "${finalSections[9]}",
      "content": "[500-800 words of detailed content for this section, personalized to ${orgName}]"
    }
  ],
  "overallConfidence": 82
}

CRITICAL REMINDERS:
- You MUST generate EXACTLY ${totalSections} separate section objects in the "sections" array
- Each section MUST have a unique id (section-1 through section-${totalSections})
- Each section MUST have the exact title from the list above
- Write in first person ("we", "our team", "our organization") when appropriate
- Mention the organization name "${orgName}" multiple times in each section (at least 3-5 times)
- Reference team members by name and their specific contributions
- Tie every technical approach back to the organization's actual capabilities and prior work
- Each section MUST be 500-800 words - count your words and expand if needed
- The total proposal MUST be 5,000-6,000 words (10 pages)
- DO NOT combine sections - each must be completely separate

YOU MUST GENERATE EXACTLY ${totalSections} SEPARATE SECTIONS. Here is the exact list you must create:

${finalSections.map((title, idx) => `${idx + 1}. "${title}" - This must be section-${idx + 1} with id "section-${idx + 1}"`).join('\n')}

Each section must be:
- A completely separate object in the JSON "sections" array
- 500-800 words minimum
- Personalized to ${orgName} with organization name, team member names, and specific capabilities
- Reference the BAA requirements and how ${orgName} addresses them

DO NOT combine sections. DO NOT skip sections. Generate all ${totalSections} sections as separate objects.`;

    const modelName = 'gpt-4o-mini';

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
          
                  // Log what we're sending to OpenAI
                  console.log('📤 Sending to OpenAI:');
                  console.log('  Model: gpt-4o-mini');
                  console.log('  System prompt length:', systemPrompt.length, 'chars');
                  console.log('  User prompt length:', userPrompt.length, 'chars');
                  console.log('  BAA text length in prompt:', truncatedBaaText.length, 'chars');
                  console.log('  Organization name:', orgNameForGeneration);
                  console.log('  Sections to generate:', sectionsToGenerate.length);
                  console.log('  BAA title:', baa.title);
                  console.log('  Max tokens:', 16384);
                  console.log('  Estimated prompt tokens:', Math.ceil((systemPrompt.length + userPrompt.length) / 4));
          
          const streamResponse = await Promise.race([
              openai.chat.completions.create({
                model: 'gpt-4o-mini',
                max_tokens: 16384,
                temperature: 0.7,
                stream: true,
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userPrompt },
                ],
              }),
            new Promise((_, reject) => {
              setTimeout(() => reject(new Error('OpenAI API request timed out after 60 seconds')), 60000);
            }),
          ]) as any;

          sendProgress(10, 'Generating proposal content...');
          console.log('✅ OpenAI stream created, receiving chunks...');

          // Announce the first section immediately
          if (sectionsToGenerate.length > 0) {
            sendSectionStart(1, sectionsToGenerate[0]);
          }

          let fullText = '';
          let lastProgress = 10;
          let sectionCount = 0;
          let lastProgressUpdate = Date.now();
          let chunkCount = 0;
          let totalContentLength = 0;

          for await (const chunk of streamResponse) {
            chunkCount++;
            const content = chunk.choices?.[0]?.delta?.content || '';
            
            if (content) {
              fullText += content;
              totalContentLength += content.length;
              
              // Send chunk updates every 100 chunks (both console and SSE)
              if (chunkCount % 100 === 0) {
                console.log(`📦 Received ${chunkCount} chunks, ${totalContentLength} chars so far`);
                sendChunkUpdate(chunkCount, totalContentLength);
              }
              
              const now = Date.now();
              if (now - lastProgressUpdate < 500) continue;
              lastProgressUpdate = now;
              
              const estimatedCharsPerSection = 4000;
              const estimatedTotalChars = totalSections * estimatedCharsPerSection;
              const textProgress = Math.min(90, 10 + (fullText.length / estimatedTotalChars) * 80);
              
              const newSectionCount = (fullText.match(/\}\s*,\s*\{/g) || []).length + 1;
              if (newSectionCount > sectionCount) {
                sectionCount = newSectionCount;
                // Announce the next section that is now being generated
                const nextSectionTitle = sectionsToGenerate[sectionCount] ?? '';
                if (nextSectionTitle) {
                  sendSectionStart(sectionCount + 1, nextSectionTitle);
                }
                sendProgress(
                  Math.min(90, 10 + (sectionCount / totalSections) * 80),
                  `Completed ${sectionCount} of ${totalSections} sections`
                );
              } else if (textProgress - lastProgress > 5) {
                lastProgress = textProgress;
                sendProgress(textProgress, 'Generating proposal content...');
              }
            }
          }

          console.log(`✅ Stream complete. Total chunks: ${chunkCount}, Total text: ${fullText.length} chars`);
          console.log(`📝 First 500 chars: ${fullText.substring(0, 500)}`);
          console.log(`📝 Last 500 chars: ${fullText.substring(Math.max(0, fullText.length - 500))}`);
          
          sendProgress(95, 'Processing and validating proposal...');

          let jsonText = fullText.trim();
          jsonText = jsonText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
          
          const jsonStart = jsonText.indexOf('{');
          const jsonEnd = jsonText.lastIndexOf('}');
          
          if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
            throw new Error('No valid JSON object found in response');
          }
          
          jsonText = jsonText.substring(jsonStart, jsonEnd + 1);

          let proposalData: any;
          try {
            proposalData = JSON.parse(jsonText);
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
            console.error('📝 JSON text length:', jsonText.length);
            console.error('📝 JSON start:', jsonText.substring(0, 200));
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

          // Validate and enhance sections
          const orgNameForEnhancement = orgNameForGeneration;
          const teamMembers = parsedOrgContext?.team || [];
          
          proposalData.sections = proposalData.sections.map((section: any, index: number) => {
            let content = section.content || '';
            const wordCount = content.split(/\s+/).filter((w: string) => w.length > 0).length;
            
            // If section is too short, add organization-specific content
            if (wordCount < 400 && orgNameForEnhancement) {
              const expansion = `\n\n${orgNameForEnhancement} brings unique capabilities to this effort. Our team, including ${teamMembers.slice(0, 3).map((m: any) => m.name).join(', ')}${teamMembers.length > 3 ? ' and others' : ''}, has extensive experience in ${parsedOrgContext?.research_profile?.focus_areas?.slice(0, 2).join(' and ') || 'relevant research areas'}. ${orgNameForEnhancement}'s prior work in ${parsedOrgContext?.research_profile?.prior_experience?.substring(0, 200) || 'related domains'} positions us uniquely to address the requirements outlined in this BAA. Our approach leverages ${parsedOrgContext?.research_profile?.key_capabilities?.slice(0, 3).join(', ') || 'key organizational capabilities'} to deliver innovative solutions that align with the BAA objectives.`;
              content += expansion;
            }
            
            // Ensure organization name appears multiple times
            const orgNameCount = (content.match(new RegExp(orgNameForEnhancement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
            if (orgNameForEnhancement && orgNameCount < 2) {
              content = `${orgNameForEnhancement} proposes to address this requirement through our comprehensive approach. ` + content;
            }
            
            return {
              id: section.id || `section-${index + 1}`,
              title: section.title || sectionsToGenerate[index] || `Section ${index + 1}`,
              content: content,
              confidence: typeof section.confidence === 'number' ? section.confidence : 75,
              status: ['strong', 'needs-improvement', 'weak'].includes(section.status) 
                ? section.status 
                : 'needs-improvement',
              feedback: Array.isArray(section.feedback) 
                ? section.feedback.map((fb: any, fbIndex: number) => ({
                    id: fb.id || `feedback-${index}-${fbIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: ['strength', 'improvement', 'removal'].includes(fb.type) ? fb.type : 'improvement',
                    text: fb.text || '',
                    highlightedText: fb.highlightedText,
                    suggestion: fb.suggestion,
                  }))
                : [],
              required: section.required !== false,
            };
          });
          
          // Ensure we have exactly 10 sections after enhancement
          while (proposalData.sections.length < 10) {
            const nextIndex = proposalData.sections.length;
            proposalData.sections.push({
              id: `section-${nextIndex + 1}`,
              title: sectionsToGenerate[nextIndex] || `Section ${nextIndex + 1}`,
              content: `${orgNameForEnhancement} will comprehensively address this requirement through our team's expertise and organizational capabilities.`,
              confidence: 75,
              status: 'needs-improvement',
              feedback: [],
              required: true,
            });
          }
          
          // Trim to exactly 10 if somehow we have more
          proposalData.sections = proposalData.sections.slice(0, 10);
          
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
