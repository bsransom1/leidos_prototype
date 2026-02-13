import { NextResponse } from 'next/server';
import { OrganizationContextJSON } from '@/types/organization-context';

export async function GET() {
  // Generate the JSON template with clear placeholders and structure
  const template: OrganizationContextJSON = {
    organization: {
      name: "Example Research Lab Name",
      type: "University Research Lab",
      institution: "University or Parent Organization",
      website: "https://example.org",
      primary_contact: {
        name: "Full Name",
        email: "email@example.org",
        role: "Principal Investigator"
      }
    },
    research_profile: {
      focus_areas: [
        "e.g. nuclear energy systems",
        "e.g. satellite power systems"
      ],
      prior_experience: "Brief description of relevant past research, publications, or projects",
      key_capabilities: [
        "Modeling & simulation",
        "Systems engineering",
        "Hardware prototyping"
      ]
    },
    team: [
      {
        name: "Team Member Name",
        role: "Researcher",
        expertise: [
          "Domain expertise",
          "Technical skills"
        ],
        allocation_percent: 50
      }
    ],
    funding_plan: {
      total_requested_usd: 1000000,
      breakdown: [
        {
          category: "Personnel",
          amount_usd: 600000,
          notes: "Salaries and benefits"
        },
        {
          category: "Equipment",
          amount_usd: 250000,
          notes: "Specialized hardware"
        }
      ]
    },
    project_goals: {
      primary_objective: "High-level research objective",
      technical_goals: [
        "Goal 1",
        "Goal 2"
      ],
      expected_outcomes: [
        "Deliverable 1",
        "Deliverable 2"
      ]
    },
    compliance_and_constraints: {
      security_clearance_required: false,
      export_control_applicable: false,
      special_constraints: "Any regulatory, ethical, or operational constraints"
    }
  };

  // Return as downloadable JSON file
  return new NextResponse(JSON.stringify(template, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="organization-context-template.json"',
    },
  });
}
