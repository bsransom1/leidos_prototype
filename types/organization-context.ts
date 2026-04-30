// Organization Context JSON Schema — DARPA BAA proposal-grade depth

export interface OrganizationContextJSON {
  organization: {
    /** Primary legal name — preferred field */
    legal_name?: string;
    /** Backward-compat alias for legal_name */
    name?: string;
    dba_name?: string;
    type: string;
    institution_parent?: string;
    /** Backward-compat alias for institution_parent */
    institution?: string;
    website?: string;
    established_year?: number;
    description?: string;
    naics_code?: string;
    dun_number?: string;
    cage_code?: string;
    sam_registration?: {
      registered?: boolean;
      registration_date?: string;
      status?: string;
    };
    facility_security_clearance?: {
      level?: string;
      accredited?: boolean;
      accreditation_expires?: string;
    };
    cmmc_certification?: {
      level?: string;
      status?: string;
      valid_through?: string;
      c3pao_assessor?: string;
    };
    /** Backward-compat: old schema had primary_contact nested here */
    primary_contact?: {
      name: string;
      email: string;
      role?: string;
      title?: string;
    };
  };

  /** Top-level primary contact (new schema) */
  primary_contact?: {
    name: string;
    title?: string;
    role?: string;
    email: string;
    phone?: string;
    mailing_address?: {
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      country?: string;
    };
  };

  technical_poc?: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    background_summary?: string;
  };

  administrative_poc?: {
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    responsibilities?: string;
  };

  research_profile: {
    focus_areas: string[];
    research_description?: string;
    /** Backward-compat alias for research_description */
    prior_experience?: string;
    prior_publications?: Array<{
      title: string;
      authors?: string[];
      venue?: string;
      year?: number;
      url?: string;
      relevance_to_proposal?: string;
    }>;
    prior_darpa_awards?: Array<{
      program_name: string;
      award_number?: string;
      award_instrument?: string;
      award_amount_usd?: number;
      period_start?: string;
      period_end?: string;
      status?: string;
      outcomes?: string;
    }>;
    prior_government_awards?: Array<{
      agency?: string;
      program?: string;
      award_number?: string;
      award_amount_usd?: number;
      period?: string;
      relevance?: string;
    }>;
    key_capabilities: string[];
    technical_infrastructure?: {
      computing_resources?: string;
      laboratory_facilities?: string;
      software_tools?: string;
      partnerships?: string;
    };
  };

  team: Array<{
    team_member_id?: string;
    name: string;
    title?: string;
    role: string;
    expertise: string[];
    relevant_experience?: string;
    education?: {
      degree?: string;
      field?: string;
      institution?: string;
      year?: number;
    };
    security_clearance?: {
      level?: string;
      active?: boolean;
      last_renewed?: string;
    };
    allocation_percent: number;
    salary_rate_usd_per_year?: number;
    fringe_rate_percent?: number;
    commitment_confirmed?: boolean;
    conflict_of_interest?: string;
    subcontractor_affiliation?: string | null;
    publications_last_3_years?: number;
    key_publications?: Array<{
      title: string;
      year?: number;
      venue?: string;
    }>;
  }>;

  subawardees_and_partners?: Array<{
    partner_id?: string;
    organization_name: string;
    poc_name?: string;
    poc_email?: string;
    relationship_type?: string;
    role_description?: string;
    award_amount_usd?: number;
    allocation_percent?: number;
    key_contributions?: string[];
    facility_security_clearance?: string;
    cmmc_level_required?: number;
    contract_type?: string;
    subcontractor_mou?: string;
  }>;

  funding_plan: {
    total_requested_usd: number;
    period_of_performance_months?: number;
    period_start_date?: string;
    period_end_date?: string;
    cost_share_contributed_usd?: number;
    cost_share_percent?: number;
    cost_share_description?: string;
    requested_instrument_type?: string;
    breakdown: Array<{
      category: string;
      amount_usd: number;
      percent_of_total?: number;
      notes: string;
      detail?: any;
      items?: any[];
    }>;
  };

  project_goals: {
    primary_objective: string;
    technical_goals: Array<
      | string
      | { goal_id?: string; title?: string; description?: string; success_metric?: string; deliverable_aligned?: string }
    >;
    expected_outcomes: Array<
      | string
      | { outcome_id?: string; deliverable?: string; type?: string; description?: string; transition_plan?: string; fundamental_research_flag?: boolean; quantity?: number; venues?: string[] }
    >;
    fundamental_research_claim?: boolean;
    fundamental_research_justification?: string;
    revolutionary_vs_evolutionary?: string;
    relationship_to_i2o_thrust_areas?: Array<{ thrust_area: string; alignment: string }>;
    competitive_landscape?: string;
    transition_and_commercialization?: string;
  };

  compliance_and_constraints: {
    export_control?: {
      applicable: boolean;
      categories?: string;
      plan?: string;
    };
    security_requirements?: {
      classified_work?: boolean;
      unclassified_controlled_information?: boolean;
      cui_categories?: string;
      security_plan_required?: boolean;
      facility_requirements?: string;
    };
    human_subjects_research?: {
      involved: boolean;
      irb_approval_required?: boolean;
    };
    animal_research?: {
      involved: boolean;
      iacuc_approval_required?: boolean;
    };
    environmental_compliance?: {
      involved: boolean;
      nepa_review_required?: boolean;
    };
    independent_research_and_development?: string;
    concurrent_proposals?: Array<{
      agency?: string;
      program?: string;
      status?: string;
      overlap_assessment?: string;
    }>;
    prior_government_funding?: Array<{
      agency?: string;
      program?: string;
      award?: string;
      relationship?: string;
    }>;
    conflicts_of_interest?: {
      organizational_conflicts?: string;
      personal_conflicts?: string;
      mitigation?: string;
    };
    special_considerations?: string;
    /** Backward-compat fields */
    security_clearance_required?: boolean;
    export_control_applicable?: boolean;
    special_constraints?: string;
  };

  submission_metadata?: {
    baa_number?: string;
    baa_title?: string;
    submission_type?: string;
    abstract_submission_date?: string;
    proposal_submission_date?: string;
    invited_to_propose?: boolean;
    darpa_feedback_on_abstract?: string;
    document_version?: string;
    last_updated?: string;
    prepared_by?: string;
    approved_by_ci?: boolean;
    approved_by_admin?: boolean;
    legal_review_completed?: boolean;
    compliance_checklist?: {
      sam_registration_verified?: boolean;
      cmmc_status_verified?: boolean;
      security_clearance_verified?: boolean;
      representations_certifications_completed?: boolean;
      cost_accounting_standards_compliant?: boolean;
      export_control_review_completed?: boolean;
    };
  };
}

export interface ValidationError {
  field: string;
  message: string;
  path: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  data?: OrganizationContextJSON;
}
