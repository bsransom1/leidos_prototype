'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  DownloadSimple,
  UploadSimple,
  FileText,
  CheckCircle,
  XCircle,
  WarningCircle,
  CircleNotch,
  Buildings,
  Users,
  CurrencyDollar,
  ShieldCheck,
  Certificate,
  BookOpen,
  Trophy,
  Cpu,
  IdentificationCard,
  GlobeHemisphereWest,
} from '@phosphor-icons/react';
import { BAA, OrganizationContext } from '@/types';
import { OrganizationContextJSON, ValidationResult } from '@/types/organization-context';
import { validateOrganizationContext } from '@/lib/validation';

interface OrganizationContextJSONUploadProps {
  baa: BAA;
  onSubmit: (context: OrganizationContext) => void;
  onContinue?: () => void;
}

// ── helpers ────────────────────────────────────────────────────────────────────

function getOrgName(d: OrganizationContextJSON): string {
  return d.organization.legal_name || d.organization.name || '—';
}
function getPrimaryContact(d: OrganizationContextJSON): OrganizationContextJSON['primary_contact'] {
  return d.primary_contact ?? (d.organization.primary_contact as any) ?? null;
}
function fmtUSD(n?: number): string {
  if (!n) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

// ── sub-components ─────────────────────────────────────────────────────────────

function SysLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-ds-text-muted">
      {children}
    </span>
  );
}

function PanelSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5 pb-0.5 border-b border-ds-border">
        <SysLabel>{label}</SysLabel>
      </div>
      {children}
    </div>
  );
}

function CompliancePill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] ${
        ok
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
          : 'bg-red-50 text-red-600 border border-red-300'
      }`}
    >
      {ok ? <CheckCircle className="w-2.5 h-2.5" weight="bold" /> : <XCircle className="w-2.5 h-2.5" weight="bold" />}
      {label}
    </span>
  );
}

// ── main display panel ─────────────────────────────────────────────────────────

function OrgContextProfile({ data }: { data: OrganizationContextJSON }) {
  const org = data.organization;
  const contact = getPrimaryContact(data);
  const techPOC = data.technical_poc;
  const rp = data.research_profile;
  const team = data.team || [];
  const subs = data.subawardees_and_partners || [];
  const fp = data.funding_plan;
  const pg = data.project_goals;
  const cc = data.compliance_and_constraints;
  const meta = data.submission_metadata;
  const checklist = meta?.compliance_checklist;

  const totalTeamPubs = team.reduce((s, m) => s + (m.publications_last_3_years || 0), 0);
  const darpaAwards = rp.prior_darpa_awards || [];
  const govAwards = rp.prior_government_awards || [];
  const pubs = rp.prior_publications || [];
  const exportApplicable = cc.export_control?.applicable ?? cc.export_control_applicable ?? false;
  const classifiedWork = cc.security_requirements?.classified_work ?? false;

  return (
    <div className="border border-ds-border bg-ds-surface text-ds-text text-xs">
      {/* ── Header strip ─────────────────────────────────────────────────── */}
      <div className="border-b border-ds-border bg-ds-surface-elevated px-4 py-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Buildings className="w-5 h-5 shrink-0 text-ds-primary" weight="bold" />
            <div className="min-w-0">
              <p className="font-semibold text-sm text-ds-text truncate leading-snug">
                {getOrgName(data)}
              </p>
              <p className="text-ds-text-muted text-[11px] mt-0.5">
                {org.type}
                {org.institution_parent || org.institution
                  ? ` · ${org.institution_parent || org.institution}`
                  : ''}
                {org.established_year ? ` · Est. ${org.established_year}` : ''}
              </p>
            </div>
          </div>
          {/* Key stat badges */}
          <div className="flex flex-wrap gap-1.5 shrink-0">
            <span className="px-2 py-0.5 bg-ds-primary/15 border border-ds-primary/40 font-mono text-[10px] font-semibold text-ds-primary uppercase tracking-wide">
              {fmtUSD(fp.total_requested_usd)} REQ.
            </span>
            <span className="px-2 py-0.5 bg-ds-shell border border-ds-border font-mono text-[10px] font-semibold text-ds-text-secondary uppercase tracking-wide">
              {team.length} PERSONNEL
            </span>
            {fp.period_of_performance_months && (
              <span className="px-2 py-0.5 bg-ds-shell border border-ds-border font-mono text-[10px] font-semibold text-ds-text-secondary uppercase tracking-wide">
                {fp.period_of_performance_months}mo PoP
              </span>
            )}
            {org.cmmc_certification?.level && (
              <span className="px-2 py-0.5 bg-amber-950/30 border border-amber-700/40 font-mono text-[10px] font-semibold text-amber-300 uppercase tracking-wide">
                CMMC-{org.cmmc_certification.level}
              </span>
            )}
            {org.facility_security_clearance?.level && (
              <span className="px-2 py-0.5 bg-blue-950/30 border border-blue-700/40 font-mono text-[10px] font-semibold text-blue-300 uppercase tracking-wide">
                FCL: {org.facility_security_clearance.level}
              </span>
            )}
          </div>
        </div>

        {/* Registration IDs row */}
        {(org.cage_code || org.dun_number || org.naics_code || org.sam_registration?.status) && (
          <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
            {org.cage_code && (
              <span className="font-mono text-[10px] text-ds-text-muted">
                <span className="text-ds-text-subtle">CAGE</span> {org.cage_code}
              </span>
            )}
            {org.dun_number && (
              <span className="font-mono text-[10px] text-ds-text-muted">
                <span className="text-ds-text-subtle">DUNS</span> {org.dun_number}
              </span>
            )}
            {org.naics_code && (
              <span className="font-mono text-[10px] text-ds-text-muted">
                <span className="text-ds-text-subtle">NAICS</span> {org.naics_code}
              </span>
            )}
            {org.sam_registration?.status && (
              <span className={`font-mono text-[10px] font-semibold ${org.sam_registration.status === 'Active' ? 'text-emerald-400' : 'text-ds-text-muted'}`}>
                SAM: {org.sam_registration.status}
              </span>
            )}
            {org.website && (
              <span className="font-mono text-[10px] text-ds-text-muted truncate max-w-[20ch]">
                <GlobeHemisphereWest className="inline w-2.5 h-2.5 mr-0.5" weight="bold" />
                {org.website.replace(/^https?:\/\//, '')}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="divide-y divide-ds-border">

        {/* Row 1: Org description + contacts */}
        <div className="grid grid-cols-2 divide-x divide-ds-border">
          {/* Description + focus areas */}
          <div className="px-4 py-3 space-y-3">
            {org.description && (
              <PanelSection label="Mission">
                <p className="text-ds-text-secondary leading-relaxed">{org.description}</p>
              </PanelSection>
            )}
            <PanelSection label="Research Focus Areas">
              <div className="flex flex-wrap gap-1">
                {rp.focus_areas.map((fa, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 border border-ds-border bg-ds-shell font-mono text-[10px] text-ds-text-secondary tracking-wide"
                  >
                    {fa}
                  </span>
                ))}
              </div>
            </PanelSection>
            {rp.key_capabilities?.length > 0 && (
              <PanelSection label="Key Capabilities">
                <div className="flex flex-wrap gap-1">
                  {rp.key_capabilities.map((cap, i) => (
                    <span key={i} className="px-1.5 py-0.5 border border-ds-border bg-ds-shell/60 font-mono text-[10px] text-ds-text-muted tracking-wide">
                      {cap}
                    </span>
                  ))}
                </div>
              </PanelSection>
            )}
          </div>

          {/* Contacts */}
          <div className="px-4 py-3 space-y-3">
            {contact && (
              <PanelSection label="Primary Contact">
                <div className="space-y-0.5">
                  <p className="font-semibold text-ds-text">{contact.name}</p>
                  {contact.title && <p className="text-ds-text-muted">{contact.title}</p>}
                  <p className="font-mono text-[10px] text-ds-accent">{contact.email}</p>
                  {contact.phone && <p className="font-mono text-[10px] text-ds-text-muted">{contact.phone}</p>}
                  {contact.mailing_address && (
                    <p className="font-mono text-[10px] text-ds-text-muted mt-0.5">
                      {[contact.mailing_address.city, contact.mailing_address.state, contact.mailing_address.country].filter(Boolean).join(', ')}
                    </p>
                  )}
                </div>
              </PanelSection>
            )}
            {techPOC?.name && (
              <PanelSection label="Technical POC">
                <div className="space-y-0.5">
                  <p className="font-semibold text-ds-text">{techPOC.name}</p>
                  {techPOC.title && <p className="text-ds-text-muted">{techPOC.title}</p>}
                  {techPOC.email && <p className="font-mono text-[10px] text-ds-accent">{techPOC.email}</p>}
                  {techPOC.background_summary && (
                    <p className="text-ds-text-muted mt-1 leading-relaxed">{techPOC.background_summary}</p>
                  )}
                </div>
              </PanelSection>
            )}
          </div>
        </div>

        {/* Row 2: Team roster */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2 pb-0.5 border-b border-ds-border">
            <Users className="w-3 h-3 text-ds-text-muted" weight="bold" />
            <SysLabel>Team Roster — {team.length} Personnel · {totalTeamPubs} Pub{totalTeamPubs !== 1 ? 's' : ''} (3yr)</SysLabel>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left">
                  <th className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-muted pb-1.5 pr-3 whitespace-nowrap">Name</th>
                  <th className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-muted pb-1.5 pr-3 whitespace-nowrap">Role / Title</th>
                  <th className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-muted pb-1.5 pr-3 whitespace-nowrap">Alloc.</th>
                  <th className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-muted pb-1.5 pr-3 whitespace-nowrap">Clearance</th>
                  <th className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-muted pb-1.5 pr-3 whitespace-nowrap">Education</th>
                  <th className="font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-muted pb-1.5 whitespace-nowrap">Pubs 3yr</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ds-border/50">
                {team.map((m, i) => {
                  const clr = m.security_clearance?.level;
                  const clrColor =
                    clr === 'Top Secret' ? 'text-red-600' :
                    clr === 'Secret' ? 'text-amber-600' :
                    'text-ds-text-muted';
                  const eduStr = m.education
                    ? `${m.education.degree || ''} ${m.education.field || ''}${m.education.institution ? ` · ${m.education.institution}` : ''}`.trim()
                    : '—';
                  return (
                    <tr key={i} className="hover:bg-ds-shell/30">
                      <td className="py-1.5 pr-3 font-semibold text-ds-text whitespace-nowrap">{m.name}</td>
                      <td className="py-1.5 pr-3 text-ds-text-secondary whitespace-nowrap max-w-[16ch] truncate">{m.title || m.role}</td>
                      <td className="py-1.5 pr-3 font-mono text-ds-accent whitespace-nowrap">{m.allocation_percent}%</td>
                      <td className={`py-1.5 pr-3 font-mono text-[10px] font-semibold uppercase tracking-wide whitespace-nowrap ${clrColor}`}>
                        {clr || '—'}
                        {m.security_clearance?.active === false && <span className="text-red-400 ml-1">(inactive)</span>}
                      </td>
                      <td className="py-1.5 pr-3 text-ds-text-muted whitespace-nowrap">{eduStr}</td>
                      <td className="py-1.5 font-mono text-ds-text-secondary whitespace-nowrap">
                        {m.publications_last_3_years ?? '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Row 3: Prior DARPA awards + publications */}
        {(darpaAwards.length > 0 || govAwards.length > 0 || pubs.length > 0) && (
          <div className="grid grid-cols-2 divide-x divide-ds-border">
            {/* Awards column */}
            {(darpaAwards.length > 0 || govAwards.length > 0) && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2 pb-0.5 border-b border-ds-border">
                  <Trophy className="w-3 h-3 text-ds-text-muted" weight="bold" />
                  <SysLabel>Prior Awards — {darpaAwards.length + govAwards.length} total</SysLabel>
                </div>
                <div className="space-y-1.5">
                  {darpaAwards.map((a, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-mono text-[9px] font-semibold px-1 py-0.5 bg-ds-primary/15 border border-ds-primary/40 text-ds-primary uppercase shrink-0 mt-0.5">
                        DARPA
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ds-text leading-tight truncate">{a.program_name}</p>
                        <p className="font-mono text-[10px] text-ds-text-muted">
                          {a.award_number} · {fmtUSD(a.award_amount_usd)}
                          {a.status && ` · `}
                          <span className={a.status === 'Completed' ? 'text-emerald-400' : a.status === 'Active' ? 'text-amber-400' : 'text-ds-text-muted'}>
                            {a.status}
                          </span>
                        </p>
                        {a.outcomes && <p className="text-ds-text-muted mt-0.5 leading-snug line-clamp-2">{a.outcomes}</p>}
                      </div>
                    </div>
                  ))}
                  {govAwards.map((a, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-mono text-[9px] font-semibold px-1 py-0.5 bg-ds-shell border border-ds-border text-ds-text-muted uppercase shrink-0 mt-0.5">
                        {a.agency || 'GOV'}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-ds-text leading-tight truncate">{a.program}</p>
                        <p className="font-mono text-[10px] text-ds-text-muted">
                          {a.award_number} · {fmtUSD(a.award_amount_usd)} · {a.period}
                        </p>
                        {a.relevance && <p className="text-ds-text-muted mt-0.5 leading-snug line-clamp-2">{a.relevance}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Publications column */}
            {pubs.length > 0 && (
              <div className="px-4 py-3">
                <div className="flex items-center gap-2 mb-2 pb-0.5 border-b border-ds-border">
                  <BookOpen className="w-3 h-3 text-ds-text-muted" weight="bold" />
                  <SysLabel>Publications — {pubs.length} cited</SysLabel>
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {pubs.map((p, i) => (
                    <div key={i} className="border-l-2 border-ds-border pl-2">
                      <p className="text-ds-text leading-tight line-clamp-2">{p.title}</p>
                      <p className="font-mono text-[10px] text-ds-text-muted mt-0.5">
                        {p.venue && `${p.venue} · `}{p.year}
                        {p.authors?.length ? ` · ${p.authors.slice(0, 2).join(', ')}${p.authors.length > 2 ? ' et al.' : ''}` : ''}
                      </p>
                      {p.relevance_to_proposal && (
                        <p className="text-ds-text-muted text-[10px] mt-0.5 line-clamp-2 italic">{p.relevance_to_proposal}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Row 4: Technical infrastructure */}
        {rp.technical_infrastructure && (
          Object.values(rp.technical_infrastructure).some(Boolean)
        ) && (
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2 pb-0.5 border-b border-ds-border">
              <Cpu className="w-3 h-3 text-ds-text-muted" weight="bold" />
              <SysLabel>Technical Infrastructure</SysLabel>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
              {rp.technical_infrastructure?.computing_resources && (
                <div>
                  <SysLabel>Computing</SysLabel>
                  <p className="mt-0.5 text-ds-text-secondary leading-snug">{rp.technical_infrastructure.computing_resources}</p>
                </div>
              )}
              {rp.technical_infrastructure?.laboratory_facilities && (
                <div>
                  <SysLabel>Lab Facilities</SysLabel>
                  <p className="mt-0.5 text-ds-text-secondary leading-snug">{rp.technical_infrastructure.laboratory_facilities}</p>
                </div>
              )}
              {rp.technical_infrastructure?.software_tools && (
                <div>
                  <SysLabel>Software Tools</SysLabel>
                  <p className="mt-0.5 text-ds-text-secondary leading-snug">{rp.technical_infrastructure.software_tools}</p>
                </div>
              )}
              {rp.technical_infrastructure?.partnerships && (
                <div>
                  <SysLabel>Partnerships</SysLabel>
                  <p className="mt-0.5 text-ds-text-secondary leading-snug">{rp.technical_infrastructure.partnerships}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Row 5: Budget breakdown + subawardees */}
        <div className="grid grid-cols-2 divide-x divide-ds-border">
          {/* Budget */}
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2 pb-0.5 border-b border-ds-border">
              <CurrencyDollar className="w-3 h-3 text-ds-text-muted" weight="bold" />
              <SysLabel>Budget Breakdown · {fmtUSD(fp.total_requested_usd)} total{fp.cost_share_contributed_usd ? ` + ${fmtUSD(fp.cost_share_contributed_usd)} cost share` : ''}</SysLabel>
            </div>
            <table className="w-full text-[11px]">
              <tbody className="divide-y divide-ds-border/50">
                {fp.breakdown.map((item, i) => (
                  <tr key={i} className="hover:bg-ds-shell/30">
                    <td className="py-1 pr-3 text-ds-text-secondary">{item.category}</td>
                    <td className="py-1 pr-3 font-mono text-ds-text text-right whitespace-nowrap">{fmtUSD(item.amount_usd)}</td>
                    <td className="py-1 font-mono text-[10px] text-ds-text-muted text-right whitespace-nowrap">
                      {item.percent_of_total != null ? `${item.percent_of_total}%` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {fp.requested_instrument_type && (
              <p className="mt-2 font-mono text-[10px] text-ds-text-muted">
                Instrument: <span className="text-ds-text-secondary">{fp.requested_instrument_type}</span>
              </p>
            )}
          </div>

          {/* Subawardees or Project Goals */}
          <div className="px-4 py-3 space-y-3">
            {subs.length > 0 && (
              <PanelSection label={`Subawardees & Partners · ${subs.length}`}>
                <div className="space-y-1.5">
                  {subs.map((s, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <IdentificationCard className="w-3 h-3 text-ds-text-muted mt-0.5 shrink-0" weight="bold" />
                      <div>
                        <p className="font-semibold text-ds-text">{s.organization_name}</p>
                        <p className="text-ds-text-muted leading-snug">{s.role_description}</p>
                        <p className="font-mono text-[10px] text-ds-text-muted mt-0.5">
                          {fmtUSD(s.award_amount_usd)}
                          {s.relationship_type ? ` · ${s.relationship_type}` : ''}
                          {s.cmmc_level_required != null ? ` · CMMC-${s.cmmc_level_required}` : ''}
                          {s.facility_security_clearance ? ` · ${s.facility_security_clearance}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </PanelSection>
            )}

            {/* Project goals summary */}
            <PanelSection label="Primary Objective">
              <p className="text-ds-text-secondary leading-relaxed">{pg.primary_objective}</p>
              {pg.fundamental_research_claim && (
                <span className="mt-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-900/25 border border-emerald-700/35 font-mono text-[10px] text-emerald-300 uppercase tracking-wide">
                  <CheckCircle className="w-2.5 h-2.5" weight="bold" /> Fundamental Research
                </span>
              )}
              {pg.relationship_to_i2o_thrust_areas?.length && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {pg.relationship_to_i2o_thrust_areas.map((t, i) => (
                    <span key={i} className="px-1.5 py-0.5 border border-ds-primary/35 bg-ds-primary/10 font-mono text-[10px] text-ds-primary tracking-wide">
                      {t.thrust_area}
                    </span>
                  ))}
                </div>
              )}
            </PanelSection>
          </div>
        </div>

        {/* Row 6: Compliance + submission metadata */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2 pb-0.5 border-b border-ds-border">
            <ShieldCheck className="w-3 h-3 text-ds-text-muted" weight="bold" />
            <SysLabel>Compliance &amp; Submission</SysLabel>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {/* Compliance flags */}
            <div className="space-y-1">
              <SysLabel>Regulatory</SysLabel>
              <div className="flex flex-wrap gap-1 mt-1">
                <CompliancePill ok={!exportApplicable} label="Export Ctrl" />
                <CompliancePill ok={!classifiedWork} label="Unclassified" />
                {cc.human_subjects_research && (
                  <CompliancePill ok={!cc.human_subjects_research.involved} label="No Human Subj." />
                )}
                {cc.animal_research && (
                  <CompliancePill ok={!cc.animal_research.involved} label="No Animal Res." />
                )}
                {pg.fundamental_research_claim !== undefined && (
                  <CompliancePill ok={!!pg.fundamental_research_claim} label="Fund. Research" />
                )}
              </div>
            </div>
            {/* Checklist */}
            {checklist && (
              <div className="space-y-1">
                <SysLabel>Submission Checklist</SysLabel>
                <div className="flex flex-wrap gap-1 mt-1">
                  {checklist.sam_registration_verified !== undefined && (
                    <CompliancePill ok={!!checklist.sam_registration_verified} label="SAM" />
                  )}
                  {checklist.cmmc_status_verified !== undefined && (
                    <CompliancePill ok={!!checklist.cmmc_status_verified} label="CMMC" />
                  )}
                  {checklist.security_clearance_verified !== undefined && (
                    <CompliancePill ok={!!checklist.security_clearance_verified} label="Clearance" />
                  )}
                  {checklist.export_control_review_completed !== undefined && (
                    <CompliancePill ok={!!checklist.export_control_review_completed} label="EC Review" />
                  )}
                  {checklist.cost_accounting_standards_compliant !== undefined && (
                    <CompliancePill ok={!!checklist.cost_accounting_standards_compliant} label="CAS" />
                  )}
                  {checklist.representations_certifications_completed !== undefined && (
                    <CompliancePill ok={!!checklist.representations_certifications_completed} label="Reps & Certs" />
                  )}
                </div>
              </div>
            )}
            {/* Submission metadata */}
            {meta && (
              <div className="space-y-1">
                <SysLabel>Submission Info</SysLabel>
                <div className="mt-1 space-y-0.5">
                  {meta.baa_number && (
                    <p className="font-mono text-[10px] text-ds-text-muted">
                      BAA <span className="text-ds-text">{meta.baa_number}</span>
                    </p>
                  )}
                  {meta.submission_type && (
                    <p className="font-mono text-[10px] text-ds-text-muted">
                      Type: <span className="text-ds-text">{meta.submission_type}</span>
                    </p>
                  )}
                  {meta.invited_to_propose && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-900/25 border border-emerald-700/35 font-mono text-[10px] text-emerald-300 uppercase tracking-wide">
                      <CheckCircle className="w-2.5 h-2.5" weight="bold" /> Invited to Propose
                    </span>
                  )}
                  {meta.document_version && (
                    <p className="font-mono text-[10px] text-ds-text-muted">
                      Rev. <span className="text-ds-text">{meta.document_version}</span>
                      {meta.prepared_by ? ` · ${meta.prepared_by}` : ''}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
          {cc.special_considerations && (
            <p className="mt-2 text-ds-text-muted italic leading-snug">{cc.special_considerations}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── main export ────────────────────────────────────────────────────────────────

export default function OrganizationContextJSONUpload({
  baa,
  onSubmit,
  onContinue,
}: OrganizationContextJSONUploadProps) {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isValidating, setIsValidating] = useState(false);

  const handleDownloadTemplate = async () => {
    setIsDownloading(true);
    try {
      const response = await fetch('/api/organization-context-template');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'organization-context-template.json';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Failed to download template. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      setValidationResult({ valid: false, errors: [{ field: 'file', message: 'Please upload a JSON file', path: 'file' }] });
      return;
    }
    setIsValidating(true);
    setValidationResult(null);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = validateOrganizationContext(data);
      setValidationResult(result);
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: [
          {
            field: 'file',
            message: error instanceof SyntaxError
              ? 'Invalid JSON format. Please check your file syntax.'
              : 'Failed to parse file. Please try again.',
            path: 'file',
          },
        ],
      });
    } finally {
      setIsValidating(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/json': ['.json'] },
    maxFiles: 1,
    disabled: isValidating,
  });

  return (
    <div className="w-full space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-ds-text">
          Organization Context
        </h2>
        <button
          onClick={handleDownloadTemplate}
          disabled={isDownloading}
          className="flex items-center gap-1.5 border border-ds-border bg-ds-shell px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ds-text-secondary hover:border-ds-border-strong hover:text-ds-text transition-colors disabled:opacity-50"
        >
          {isDownloading ? (
            <><CircleNotch className="w-3 h-3 animate-spin" weight="bold" /><span>Generating...</span></>
          ) : (
            <><DownloadSimple className="w-3 h-3" weight="bold" /><span>Download Template</span></>
          )}
        </button>
      </div>

      {/* Upload dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed p-4 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-ds-accent bg-ds-accent/5'
            : validationResult?.valid
            ? 'border-emerald-400 bg-emerald-50'
            : validationResult && !validationResult.valid
            ? 'border-red-400 bg-red-50'
            : 'border-ds-border bg-ds-shell/30 hover:border-ds-border-strong'
        } ${isValidating ? 'cursor-not-allowed opacity-50' : ''}`}
      >
        <input {...getInputProps()} />

        {isValidating ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <CircleNotch className="h-4 w-4 animate-spin text-ds-primary" weight="bold" />
            <span className="font-mono text-[11px] text-ds-text-muted uppercase tracking-wide">Validating schema...</span>
          </div>
        ) : validationResult?.valid ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <CheckCircle className="h-4 w-4 text-emerald-400" weight="bold" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-emerald-700">Schema valid — drop a new file to replace</span>
          </div>
        ) : validationResult && !validationResult.valid ? (
          <div className="flex items-center justify-center gap-2 py-2">
            <XCircle className="h-4 w-4 text-red-400" weight="bold" />
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-red-600">Validation failed — see errors below</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center border border-ds-border bg-ds-shell">
              <UploadSimple className="w-4 h-4 text-ds-text-secondary" weight="bold" />
            </div>
            <div className="text-left">
              <p className="font-mono text-[11px] font-semibold uppercase tracking-wide text-ds-text">
                {isDragActive ? 'Release to ingest' : 'Drag context JSON file here'}
              </p>
              <p className="font-mono text-[10px] text-ds-text-muted mt-0.5">or click to browse · .json · DARPA BAA org context</p>
            </div>
          </div>
        )}
      </div>

      {/* Validation errors */}
      {validationResult && !validationResult.valid && validationResult.errors.length > 0 && (
        <div className="border border-red-300 bg-red-50 p-3">
          <h3 className="flex items-center gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-red-600 mb-2">
            <WarningCircle className="w-3.5 h-3.5" weight="bold" />
            {validationResult.errors.length} Validation Error{validationResult.errors.length !== 1 ? 's' : ''}
          </h3>
          <ul className="space-y-1 max-h-48 overflow-y-auto">
            {validationResult.errors.map((err, i) => (
              <li key={i} className="text-[11px]">
                <span className="font-mono font-semibold text-red-600">{err.path}:</span>{' '}
                <span className="text-red-500">{err.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Rich profile display */}
      {validationResult?.valid && validationResult.data && (
        <>
          <OrgContextProfile data={validationResult.data} />
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                if (validationResult.valid && validationResult.data) {
                  onSubmit(convertJSONToContext(validationResult.data));
                  if (onContinue) onContinue();
                }
              }}
              className="flex items-center gap-1.5 border border-emerald-600 bg-emerald-600 px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition-colors hover:bg-emerald-700"
            >
              <CheckCircle className="w-3.5 h-3.5" weight="bold" />
              Continue to Review &amp; Plan
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ── converter ──────────────────────────────────────────────────────────────────

function convertJSONToContext(json: OrganizationContextJSON): OrganizationContext {
  const contact = json.primary_contact ?? (json.organization.primary_contact as any);
  const orgName =
    json.organization.legal_name || json.organization.name || 'Unknown Organization';
  const institution =
    json.organization.institution_parent || json.organization.institution || '';
  const description =
    json.organization.description ||
    json.research_profile.research_description ||
    json.research_profile.prior_experience ||
    '';

  return {
    id: `context-${Date.now()}`,
    organizationName: orgName,
    labDescription: `${json.organization.type}${institution ? ` at ${institution}` : ''}. ${description}`.trim(),
    researchFocus: json.research_profile.focus_areas.join(', '),
    priorWork: [
      json.research_profile.research_description || json.research_profile.prior_experience || '',
      ...(json.research_profile.prior_darpa_awards || []).map(
        (a) => `DARPA ${a.program_name} (${a.award_number || 'N/A'}): ${a.outcomes || ''}`
      ),
    ]
      .filter(Boolean)
      .join('\n'),
    fundingAllocationPlan: json.funding_plan.breakdown
      .map((b) => `${b.category}: $${b.amount_usd.toLocaleString()} - ${b.notes}`)
      .join('\n'),
    teamMembers: json.team.map((member, index) => ({
      id: member.team_member_id || `member-${index + 1}`,
      name: member.name,
      role: member.title || member.role,
      email: '',
    })),
  };
}
