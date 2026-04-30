import { NextResponse } from 'next/server';

export async function GET() {
  const template = {
    organization: {
      legal_name: "Full Legal Organization Name",
      dba_name: "Doing Business As (if applicable)",
      type: "University Research Lab",
      institution_parent: "Parent University or Organization Name",
      website: "https://example.org",
      established_year: 1995,
      description: "2-3 sentence description of organization mission and focus areas.",
      naics_code: "541715",
      dun_number: "12-345-6789",
      cage_code: "XXXXX",
      sam_registration: {
        registered: true,
        registration_date: "2024-01-15",
        status: "Active"
      },
      facility_security_clearance: {
        level: "Secret",
        accredited: true,
        accreditation_expires: "2026-12-31"
      },
      cmmc_certification: {
        level: "2",
        status: "Current",
        valid_through: "2026-06-30",
        c3pao_assessor: "Authorized C3PAO Name"
      }
    },
    primary_contact: {
      name: "Full Name",
      title: "Research Director / Business Development Manager",
      role: "Primary Point of Contact",
      email: "email@example.org",
      phone: "+1-555-123-4567",
      mailing_address: {
        street: "123 Research Boulevard",
        city: "Boston",
        state: "MA",
        zip: "02215",
        country: "USA"
      }
    },
    technical_poc: {
      name: "Full Name",
      title: "Principal Investigator",
      email: "pi@example.org",
      phone: "+1-555-123-4568",
      background_summary: "Brief summary of technical expertise and relevant experience (3-4 sentences)."
    },
    administrative_poc: {
      name: "Full Name",
      title: "Contracts Manager",
      email: "contracts@example.org",
      phone: "+1-555-123-4569",
      responsibilities: "Government contracting, proposal coordination, award administration"
    },
    research_profile: {
      focus_areas: [
        "Transformative AI (trustworthy systems, disruptive AI)",
        "Resilient, Adaptable, and Secure Software",
        "Offensive and Defensive Cybersecurity",
        "Fighting in the Information Domain"
      ],
      research_description: "Comprehensive description of the lab's core research mission and technical areas (150-250 words).",
      prior_publications: [
        {
          title: "Peer-Reviewed Publication Title",
          authors: ["Lead Author", "Co-Author"],
          venue: "Conference or Journal Name",
          year: 2024,
          url: "https://doi.org/xxxxx",
          relevance_to_proposal: "How this publication demonstrates capability in the proposed area."
        }
      ],
      prior_darpa_awards: [
        {
          program_name: "Program Name",
          award_number: "HR00XXXXXXXXX",
          award_instrument: "Contract",
          award_amount_usd: 5000000,
          period_start: "2022-01-01",
          period_end: "2025-12-31",
          status: "Completed",
          outcomes: "Brief description of results, deliverables, publications, or technology transfer."
        }
      ],
      prior_government_awards: [
        {
          agency: "NSF",
          program: "Program Name",
          award_number: "NSF-XXXXX",
          award_amount_usd: 2000000,
          period: "2020-2023",
          relevance: "Why this prior work is relevant to the proposed effort."
        }
      ],
      key_capabilities: [
        "Machine learning model development and validation",
        "Formal methods and verification",
        "Secure software architecture and design",
        "Cybersecurity testing and evaluation",
        "Hardware prototyping",
        "Systems integration and testing"
      ],
      technical_infrastructure: {
        computing_resources: "Describe high-performance computing facilities, cloud access, specialized hardware (GPUs, FPGAs, etc.).",
        laboratory_facilities: "Physical lab space, test environments, security clearance levels.",
        software_tools: "Licensed and open-source tools available (MATLAB, Python ecosystem, security tools, etc.).",
        partnerships: "Access to shared facilities, national labs, university research centers, commercial partnerships."
      }
    },
    team: [
      {
        team_member_id: "team_001",
        name: "Dr. Full Name",
        title: "Principal Investigator",
        role: "Technical leadership, project oversight, proposal writing",
        expertise: [
          "Machine learning and AI systems",
          "Formal verification methods",
          "System architecture design"
        ],
        relevant_experience: "15+ years in AI research at top institutions, 10+ peer-reviewed publications, 3 prior DARPA awards.",
        education: {
          degree: "Ph.D.",
          field: "Computer Science",
          institution: "MIT",
          year: 2010
        },
        security_clearance: {
          level: "Top Secret",
          active: true,
          last_renewed: "2023-06-15"
        },
        allocation_percent: 40,
        salary_rate_usd_per_year: 150000,
        fringe_rate_percent: 28,
        commitment_confirmed: true,
        conflict_of_interest: "None",
        subcontractor_affiliation: null,
        publications_last_3_years: 8,
        key_publications: [
          {
            title: "Recent Publication Demonstrating Capability",
            year: 2023,
            venue: "Top-tier Conference"
          }
        ]
      },
      {
        team_member_id: "team_002",
        name: "Dr. Second Researcher",
        title: "Co-Investigator",
        role: "Technical task lead, experimental validation",
        expertise: [
          "Cybersecurity evaluation",
          "Penetration testing",
          "Formal security analysis"
        ],
        relevant_experience: "12 years in cybersecurity research, 8 publications, 2 prior DARPA projects.",
        education: {
          degree: "Ph.D.",
          field: "Electrical Engineering",
          institution: "Stanford",
          year: 2012
        },
        security_clearance: {
          level: "Secret",
          active: true,
          last_renewed: "2024-01-10"
        },
        allocation_percent: 30,
        salary_rate_usd_per_year: 120000,
        fringe_rate_percent: 28,
        commitment_confirmed: true,
        conflict_of_interest: "None"
      }
    ],
    subawardees_and_partners: [
      {
        partner_id: "sub_001",
        organization_name: "Partner Research Institute",
        poc_name: "Contact Name",
        poc_email: "contact@partner.org",
        relationship_type: "Subcontractor",
        role_description: "Specific technical contributions and responsibilities.",
        award_amount_usd: 500000,
        allocation_percent: 20,
        key_contributions: [
          "Specialized hardware design and prototyping",
          "Performance evaluation and benchmarking"
        ],
        facility_security_clearance: "Secret",
        cmmc_level_required: 2,
        contract_type: "Cost-plus-fixed-fee"
      }
    ],
    funding_plan: {
      total_requested_usd: 3000000,
      period_of_performance_months: 36,
      period_start_date: "2026-01-01",
      period_end_date: "2028-12-31",
      cost_share_contributed_usd: 250000,
      cost_share_percent: 7.7,
      cost_share_description: "In-kind contributions: supercomputer access, facilities, personnel above-rate effort.",
      requested_instrument_type: "Procurement Contract",
      breakdown: [
        {
          category: "Personnel - Prime",
          amount_usd: 1500000,
          percent_of_total: 50,
          notes: "Salaries, wages, and fringes for key staff (see Team section)."
        },
        {
          category: "Subcontractor / Subawardee",
          amount_usd: 500000,
          percent_of_total: 16.7,
          notes: "Partner Research Institute — hardware prototyping and validation."
        },
        {
          category: "Equipment and Supplies",
          amount_usd: 450000,
          percent_of_total: 15,
          notes: "GPU clusters, networking hardware, software licenses."
        },
        {
          category: "Travel",
          amount_usd: 120000,
          percent_of_total: 4,
          notes: "DARPA review meetings, conference presentations, site visits."
        },
        {
          category: "Other Direct Costs",
          amount_usd: 180000,
          percent_of_total: 6,
          notes: "Cloud computing, external security evaluation, publication fees."
        },
        {
          category: "Indirect Costs (F&A)",
          amount_usd: 250000,
          percent_of_total: 8.3,
          notes: "Based on federally negotiated indirect cost rate of 28%."
        }
      ]
    },
    project_goals: {
      primary_objective: "Develop trustworthy AI systems that demonstrate robust security against adversarial attacks while maintaining interpretability for defense applications.",
      technical_goals: [
        {
          goal_id: "TG_001",
          title: "Advanced AI Model Robustness",
          description: "Create AI models that maintain performance under adversarial conditions.",
          success_metric: "Withstand NIST-standardized adversarial robustness benchmarks.",
          deliverable_aligned: "DL_001"
        },
        {
          goal_id: "TG_002",
          title: "Formal Verification of Security Properties",
          description: "Develop formal methods to prove security guarantees in multi-component systems.",
          success_metric: "Verify end-to-end security properties for 50%+ of system components.",
          deliverable_aligned: "DL_003"
        }
      ],
      expected_outcomes: [
        {
          outcome_id: "OUT_001",
          deliverable: "Open-source toolkit for robust AI model development",
          type: "Software",
          description: "Publicly available code repository with examples and documentation.",
          transition_plan: "Release on GitHub under MIT/Apache 2.0; documentation for DIB adoption."
        },
        {
          outcome_id: "OUT_002",
          deliverable: "Peer-reviewed publications in top-tier venues",
          type: "Publication",
          quantity: 6,
          venues: ["NeurIPS", "ICML", "IEEE S&P", "ACM CCS"],
          fundamental_research_flag: true
        }
      ],
      fundamental_research_claim: true,
      fundamental_research_justification: "Research advances scientific knowledge in trustworthy AI. Results will be published in peer-reviewed venues without proprietary restrictions.",
      revolutionary_vs_evolutionary: "Revolutionary — novel formal verification approaches for AI security not previously demonstrated at this scale.",
      relationship_to_i2o_thrust_areas: [
        {
          thrust_area: "Transformative AI",
          alignment: "Directly addresses trustworthy AI development for national security applications."
        },
        {
          thrust_area: "Resilient, Adaptable, and Secure Software",
          alignment: "Develops formal methods for security correctness guarantees."
        }
      ],
      competitive_landscape: "Current state-of-the-art uses adversarial training without formal guarantees. Our approach provides provable bounds on security margins.",
      transition_and_commercialization: "Results transitioned to DARPA test community and DoD through open-source release and technical partnerships with defense contractors."
    },
    compliance_and_constraints: {
      export_control: {
        applicable: true,
        categories: "ECCN 3D001, 3E001",
        plan: "Work will not involve export-controlled materials; all team members are US persons or have appropriate authorization."
      },
      security_requirements: {
        classified_work: false,
        unclassified_controlled_information: true,
        cui_categories: "Tech Data, Software",
        security_plan_required: false,
        facility_requirements: "Standard unclassified lab space"
      },
      human_subjects_research: { involved: false, irb_approval_required: false },
      animal_research: { involved: false, iacuc_approval_required: false },
      environmental_compliance: { involved: false, nepa_review_required: false },
      independent_research_and_development: "Work does not rely on prior IRAD funding; all proposed research is new.",
      concurrent_proposals: [
        {
          agency: "NSF",
          program: "AI Institute",
          status: "Submitted",
          overlap_assessment: "No technical overlap; complementary research areas."
        }
      ],
      conflicts_of_interest: {
        organizational_conflicts: "None identified",
        personal_conflicts: "None",
        mitigation: "N/A"
      },
      special_considerations: "Lab has experience with DARPA contracting and federal compliance requirements."
    },
    submission_metadata: {
      baa_number: "HR001126S0001",
      baa_title: "Information Innovation Office (I2O) Office-Wide",
      submission_type: "Full Proposal",
      abstract_submission_date: "2026-10-15",
      invited_to_propose: true,
      darpa_feedback_on_abstract: "Encouraged to submit full proposal.",
      document_version: "v1.0",
      last_updated: new Date().toISOString().split('T')[0],
      prepared_by: "Proposals Manager Name",
      approved_by_ci: false,
      approved_by_admin: false,
      legal_review_completed: false,
      compliance_checklist: {
        sam_registration_verified: false,
        cmmc_status_verified: false,
        security_clearance_verified: false,
        representations_certifications_completed: false,
        cost_accounting_standards_compliant: false,
        export_control_review_completed: false
      }
    }
  };

  return new NextResponse(JSON.stringify(template, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="organization-context-template.json"',
    },
  });
}
