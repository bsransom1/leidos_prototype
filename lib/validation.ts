import { OrganizationContextJSON, ValidationResult, ValidationError } from '@/types/organization-context';

export type { ValidationResult, ValidationError };

/** Resolve org name from either schema version */
function getOrgName(data: any): string {
  return data?.organization?.legal_name || data?.organization?.name || '';
}

/** Resolve primary contact from either schema version (top-level or nested in org) */
function getPrimaryContact(data: any): any {
  return data?.primary_contact || data?.organization?.primary_contact || null;
}

export function validateOrganizationContext(data: any): ValidationResult {
  const errors: ValidationError[] = [];

  // ── Organization ─────────────────────────────────────────────────────────
  if (!data.organization) {
    errors.push({ field: 'organization', message: 'Organization section is required', path: 'organization' });
  } else {
    const orgName = getOrgName(data);
    if (!orgName || orgName.trim() === '') {
      errors.push({ field: 'organization.legal_name', message: 'Organization name is required (legal_name or name)', path: 'organization.legal_name' });
    }
    if (!data.organization.type || typeof data.organization.type !== 'string') {
      errors.push({ field: 'organization.type', message: 'Organization type is required', path: 'organization.type' });
    }
  }

  // ── Primary contact (top-level new schema OR nested old schema) ───────────
  const contact = getPrimaryContact(data);
  if (!contact) {
    errors.push({ field: 'primary_contact', message: 'Primary contact is required (primary_contact section or organization.primary_contact)', path: 'primary_contact' });
  } else {
    if (!contact.name || typeof contact.name !== 'string' || contact.name.trim() === '') {
      errors.push({ field: 'primary_contact.name', message: 'Primary contact name is required', path: 'primary_contact.name' });
    }
    if (!contact.email || typeof contact.email !== 'string' || !isValidEmail(contact.email)) {
      errors.push({ field: 'primary_contact.email', message: 'Valid primary contact email is required', path: 'primary_contact.email' });
    }
  }

  // ── Research profile ──────────────────────────────────────────────────────
  if (!data.research_profile) {
    errors.push({ field: 'research_profile', message: 'Research profile section is required', path: 'research_profile' });
  } else {
    if (!Array.isArray(data.research_profile.focus_areas) || data.research_profile.focus_areas.length === 0) {
      errors.push({ field: 'research_profile.focus_areas', message: 'At least one focus area is required', path: 'research_profile.focus_areas' });
    }
    if (!Array.isArray(data.research_profile.key_capabilities) || data.research_profile.key_capabilities.length === 0) {
      errors.push({ field: 'research_profile.key_capabilities', message: 'At least one key capability is required', path: 'research_profile.key_capabilities' });
    }
  }

  // ── Team ─────────────────────────────────────────────────────────────────
  if (!Array.isArray(data.team) || data.team.length === 0) {
    errors.push({ field: 'team', message: 'At least one team member is required', path: 'team' });
  } else {
    let totalAllocation = 0;
    data.team.forEach((member: any, index: number) => {
      if (!member.name || typeof member.name !== 'string' || member.name.trim() === '') {
        errors.push({ field: `team[${index}].name`, message: 'Team member name is required', path: `team[${index}].name` });
      }
      if (!member.role || typeof member.role !== 'string' || member.role.trim() === '') {
        errors.push({ field: `team[${index}].role`, message: 'Team member role is required', path: `team[${index}].role` });
      }
      if (!Array.isArray(member.expertise) || member.expertise.length === 0) {
        errors.push({ field: `team[${index}].expertise`, message: 'At least one expertise area is required', path: `team[${index}].expertise` });
      }
      if (typeof member.allocation_percent !== 'number' || member.allocation_percent < 0 || member.allocation_percent > 100) {
        errors.push({ field: `team[${index}].allocation_percent`, message: 'Allocation percent must be 0–100', path: `team[${index}].allocation_percent` });
      } else {
        totalAllocation += member.allocation_percent;
      }
    });
    if (totalAllocation > 0 && Math.abs(totalAllocation - 100) > 5) {
      errors.push({
        field: 'team',
        message: `Total team allocation is ${totalAllocation}% (expected ~100%). Please review.`,
        path: 'team',
      });
    }
  }

  // ── Funding plan ──────────────────────────────────────────────────────────
  if (!data.funding_plan) {
    errors.push({ field: 'funding_plan', message: 'Funding plan section is required', path: 'funding_plan' });
  } else {
    if (typeof data.funding_plan.total_requested_usd !== 'number' || data.funding_plan.total_requested_usd <= 0) {
      errors.push({ field: 'funding_plan.total_requested_usd', message: 'Total requested USD must be a positive number', path: 'funding_plan.total_requested_usd' });
    }
    if (!Array.isArray(data.funding_plan.breakdown) || data.funding_plan.breakdown.length === 0) {
      errors.push({ field: 'funding_plan.breakdown', message: 'At least one funding breakdown item is required', path: 'funding_plan.breakdown' });
    } else {
      let breakdownTotal = 0;
      data.funding_plan.breakdown.forEach((item: any, index: number) => {
        if (!item.category || typeof item.category !== 'string' || item.category.trim() === '') {
          errors.push({ field: `funding_plan.breakdown[${index}].category`, message: 'Category is required', path: `funding_plan.breakdown[${index}].category` });
        }
        if (typeof item.amount_usd !== 'number' || item.amount_usd < 0) {
          errors.push({ field: `funding_plan.breakdown[${index}].amount_usd`, message: 'Amount must be a non-negative number', path: `funding_plan.breakdown[${index}].amount_usd` });
        } else {
          breakdownTotal += item.amount_usd;
        }
        if (!item.notes || typeof item.notes !== 'string') {
          errors.push({ field: `funding_plan.breakdown[${index}].notes`, message: 'Notes are required', path: `funding_plan.breakdown[${index}].notes` });
        }
      });
      if (breakdownTotal > 0 && Math.abs(breakdownTotal - data.funding_plan.total_requested_usd) > data.funding_plan.total_requested_usd * 0.05) {
        errors.push({
          field: 'funding_plan.breakdown',
          message: `Breakdown total ($${breakdownTotal.toLocaleString()}) does not match total requested ($${data.funding_plan.total_requested_usd.toLocaleString()}).`,
          path: 'funding_plan.breakdown',
        });
      }
    }
  }

  // ── Project goals ─────────────────────────────────────────────────────────
  if (!data.project_goals) {
    errors.push({ field: 'project_goals', message: 'Project goals section is required', path: 'project_goals' });
  } else {
    if (!data.project_goals.primary_objective || typeof data.project_goals.primary_objective !== 'string' || data.project_goals.primary_objective.trim() === '') {
      errors.push({ field: 'project_goals.primary_objective', message: 'Primary objective is required', path: 'project_goals.primary_objective' });
    }
    if (!Array.isArray(data.project_goals.technical_goals) || data.project_goals.technical_goals.length === 0) {
      errors.push({ field: 'project_goals.technical_goals', message: 'At least one technical goal is required', path: 'project_goals.technical_goals' });
    }
    if (!Array.isArray(data.project_goals.expected_outcomes) || data.project_goals.expected_outcomes.length === 0) {
      errors.push({ field: 'project_goals.expected_outcomes', message: 'At least one expected outcome is required', path: 'project_goals.expected_outcomes' });
    }
  }

  // ── Compliance (lenient — new or old format both accepted) ────────────────
  if (!data.compliance_and_constraints) {
    errors.push({ field: 'compliance_and_constraints', message: 'Compliance and constraints section is required', path: 'compliance_and_constraints' });
  }

  return {
    valid: errors.length === 0,
    errors,
    data: errors.length === 0 ? (data as OrganizationContextJSON) : undefined,
  };
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
