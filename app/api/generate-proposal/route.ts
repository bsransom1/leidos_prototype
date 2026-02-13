import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { baa, organizationContext } = body;

    // Simulate AI proposal generation
    // In production, this would call the actual AI model API
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing time

    const proposalSections = generateProposalSections(baa, organizationContext);
    const overallConfidence = calculateOverallConfidence(proposalSections);

    return NextResponse.json({
      id: `proposal-${Date.now()}`,
      baaId: baa.id,
      organizationContextId: organizationContext.id,
      title: `Proposal for ${baa.title}`,
      sections: proposalSections,
      overallConfidence,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Proposal generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate proposal' },
      { status: 500 }
    );
  }
}

function generateProposalSections(baa: any, context: any) {
  const sections: any[] = [];
  
  // Generate sections based on BAA structure
  baa.structure.forEach((sectionTitle: string, index: number) => {
    const section = baa.sections.find((s: any) => 
      s.title.toLowerCase().includes(sectionTitle.toLowerCase().substring(0, 20))
    );

    const content = generateSectionContent(sectionTitle, section, context);
    const confidence = Math.random() * 30 + 60; // Random confidence between 60-90
    const status = confidence > 80 ? 'strong' : confidence > 65 ? 'needs-improvement' : 'weak';

    sections.push({
      id: `proposal-section-${index + 1}`,
      title: sectionTitle,
      content,
      confidence: Math.round(confidence),
      feedback: generateFeedback(content, confidence),
      required: true,
      status,
    });
  });

  return sections;
}

function generateSectionContent(title: string, section: any, context: any): string {
  const templates: Record<string, string> = {
    'executive summary': `This proposal outlines ${context.organizationName}'s approach to addressing the requirements outlined in this BAA. Our team brings extensive experience in ${context.researchFocus}, with a proven track record of delivering innovative solutions in this domain.

Our approach leverages ${context.priorWork ? 'our prior work in ' + context.priorWork.substring(0, 100) : 'cutting-edge research methodologies'} to deliver measurable outcomes that align with the stated objectives.`,

    'technical approach': `Our technical approach is grounded in ${context.researchFocus}. We will employ a systematic methodology that integrates:

1. Research and analysis of current state-of-the-art solutions
2. Development of novel approaches tailored to the specific requirements
3. Validation through rigorous testing and evaluation
4. Iterative refinement based on feedback and results

This approach ensures that our deliverables meet and exceed the stated requirements while advancing the field of ${context.researchFocus}.`,

    'team qualifications': `Our team consists of experienced researchers and practitioners with deep expertise in ${context.researchFocus}. ${context.teamMembers?.length || 0} team members bring diverse backgrounds and complementary skills that position us to successfully execute this project.

Key team members include:
${context.teamMembers?.slice(0, 3).map((m: any) => `- ${m.name}, ${m.role}`).join('\n') || '- Experienced research team members'}`,

    'budget': `Our budget allocation plan aligns with the project timeline and deliverables. We have carefully allocated resources across ${context.fundingAllocationPlan || 'key project phases'} to ensure efficient use of funds while maintaining high-quality outputs.

The proposed budget supports:
- Personnel costs for key team members
- Research and development activities
- Equipment and materials as needed
- Travel and collaboration expenses`,
  };

  const lowerTitle = title.toLowerCase();
  for (const [key, template] of Object.entries(templates)) {
    if (lowerTitle.includes(key)) {
      return template;
    }
  }

  // Default content
  return `This section addresses the requirements outlined in "${title}". 

${context.organizationName} brings significant expertise in ${context.researchFocus} to this project. Our approach is designed to meet the specific needs identified in the BAA while advancing the state of the art in this domain.

Key aspects of our approach include:
- Alignment with stated objectives and requirements
- Leveraging our team's expertise and prior work
- Delivering measurable, high-quality outcomes
- Ensuring compliance with all stated requirements`;
}

function generateFeedback(content: string, confidence: number): any[] {
  const feedback: any[] = [];

  if (confidence > 80) {
    feedback.push({
      id: `feedback-${Date.now()}-1`,
      type: 'strength',
      text: 'This section demonstrates strong alignment with requirements and clear articulation of the approach.',
    });
  }

  if (confidence < 75) {
    feedback.push({
      id: `feedback-${Date.now()}-2`,
      type: 'improvement',
      text: 'Consider adding more specific details and concrete examples to strengthen this section.',
      suggestion: 'Include specific methodologies, tools, or frameworks that will be used.',
    });
  }

  if (content.length < 200) {
    feedback.push({
      id: `feedback-${Date.now()}-3`,
      type: 'improvement',
      text: 'This section may benefit from additional detail to fully address the requirements.',
    });
  }

  return feedback;
}

function calculateOverallConfidence(sections: any[]): number {
  if (sections.length === 0) return 0;
  const sum = sections.reduce((acc, section) => acc + section.confidence, 0);
  return Math.round(sum / sections.length);
}
