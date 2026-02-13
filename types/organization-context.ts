// Organization Context JSON Schema Types

export interface OrganizationContextJSON {
  organization: {
    name: string;
    type: 'University Research Lab' | 'Think Tank' | 'Industry Research Division' | string;
    institution: string;
    website: string;
    primary_contact: {
      name: string;
      email: string;
      role: 'Principal Investigator' | 'Program Manager' | 'Admin' | string;
    };
  };
  research_profile: {
    focus_areas: string[];
    prior_experience: string;
    key_capabilities: string[];
  };
  team: Array<{
    name: string;
    role: string;
    expertise: string[];
    allocation_percent: number;
  }>;
  funding_plan: {
    total_requested_usd: number;
    breakdown: Array<{
      category: string;
      amount_usd: number;
      notes: string;
    }>;
  };
  project_goals: {
    primary_objective: string;
    technical_goals: string[];
    expected_outcomes: string[];
  };
  compliance_and_constraints: {
    security_clearance_required: boolean;
    export_control_applicable: boolean;
    special_constraints: string;
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
