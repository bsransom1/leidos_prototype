export interface BAA {
  id: string;
  title: string;
  fileName: string;
  uploadedAt: Date;
  sections: BAASection[];
  requirements: Requirement[];
  deadlines: Deadline[];
  structure: string[];
  rawText?: string; // Full PDF text content
}

export interface BAASection {
  id: string;
  title: string;
  content: string;
  level: number;
  parentId?: string;
}

export interface Requirement {
  id: string;
  text: string;
  section: string;
  required: boolean;
}

export interface Deadline {
  id: string;
  description: string;
  date: Date;
  type: 'submission' | 'question' | 'other';
}

export interface OrganizationContext {
  id: string;
  organizationName: string;
  labDescription: string;
  researchFocus: string;
  priorWork: string;
  fundingAllocationPlan: string;
  teamMembers: TeamMember[];
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
}

export interface Proposal {
  id: string;
  baaId: string;
  organizationContextId: string;
  title: string;
  sections: ProposalSection[];
  overallConfidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProposalSection {
  id: string;
  title: string;
  content: string;
  confidence: number;
  feedback: SectionFeedback[];
  required: boolean;
  status: 'strong' | 'needs-improvement' | 'weak' | 'missing';
}

export interface SectionFeedback {
  id: string;
  type: 'strength' | 'improvement' | 'removal';
  text: string;
  highlightedText?: string;
  suggestion?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'editor' | 'viewer';
  organizationId: string;
}

export interface Workspace {
  id: string;
  name: string;
  organizationIds: string[];
  proposals: string[];
  users: string[];
}

export interface Project {
  id: string;
  proposalId: string;
  name: string;
  timeline: Timeline;
  milestones: Milestone[];
  deliverables: Deliverable[];
  budget: BudgetAllocation[];
}

export interface Timeline {
  startDate: Date;
  endDate: Date;
  phases: Phase[];
}

export interface Phase {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
}

export interface Milestone {
  id: string;
  name: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  deliverables: string[];
}

export interface Deliverable {
  id: string;
  name: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  confidence: number;
}

export interface BudgetAllocation {
  id: string;
  teamId: string;
  teamName: string;
  timePeriod: {
    start: Date;
    end: Date;
  };
  amount: number;
  deliverables: string[];
}

// Export organization context JSON types
export * from './organization-context';
