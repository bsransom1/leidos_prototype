'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Download, Upload, FileText, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { BAA, OrganizationContext } from '@/types';
import { OrganizationContextJSON, ValidationResult } from '@/types/organization-context';
import { validateOrganizationContext } from '@/lib/validation';

interface OrganizationContextJSONUploadProps {
  baa: BAA;
  onSubmit: (context: OrganizationContext) => void;
}

export default function OrganizationContextJSONUpload({ baa, onSubmit }: OrganizationContextJSONUploadProps) {
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
    } catch (error) {
      console.error('Failed to download template:', error);
      alert('Failed to download template. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      setValidationResult({
        valid: false,
        errors: [{ field: 'file', message: 'Please upload a JSON file', path: 'file' }],
      });
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = validateOrganizationContext(data);

      setValidationResult(result);

      // If valid, convert to OrganizationContext format and submit
      if (result.valid && result.data) {
        // Convert JSON format to OrganizationContext format
        const context: OrganizationContext = convertJSONToContext(result.data);
        onSubmit(context);
      }
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
  }, [onSubmit]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/json': ['.json'],
    },
    maxFiles: 1,
    disabled: isValidating,
  });

  return (
    <div className="w-full">
      <div className="mb-3">
        <h2 className="text-base font-semibold text-[#1a1a1a]">Organization Context</h2>
      </div>

      {/* Download Template Section */}
      <div className="mb-3">
        <div className="bg-[#f9fafb] border border-[#d1d5db] p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-xs font-semibold text-[#1a1a1a] mb-0.5">Template Download</h3>
            </div>
            <button
              onClick={handleDownloadTemplate}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a1a1a] text-white text-xs font-medium hover:bg-[#374151] transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-[#1a1a1a]"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Upload Section */}
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-[#1a1a1a] mb-2">Ingest Context Data</h3>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed p-5 text-center cursor-pointer ${
            isDragActive
              ? 'border-[#2563eb] bg-[#eff6ff]'
              : validationResult?.valid
              ? 'border-[#059669] bg-[#ecfdf5]'
              : validationResult && !validationResult.valid
              ? 'border-[#dc2626] bg-[#fef2f2]'
              : 'border-[#d1d5db] hover:border-[#9ca3af] bg-white'
          } ${isValidating ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          
          {isValidating ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-8 h-8 text-[#2563eb] animate-spin mb-2" />
              <p className="text-xs text-[#6b7280]">Validating schema...</p>
            </div>
          ) : validationResult?.valid ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="w-8 h-8 text-[#059669] mb-2" />
              <p className="text-sm font-medium text-[#065f46] mb-1">Validation Complete</p>
            </div>
          ) : validationResult && !validationResult.valid ? (
            <div className="flex flex-col items-center">
              <XCircle className="w-8 h-8 text-[#dc2626] mb-2" />
              <p className="text-sm font-medium text-[#991b1b] mb-1">Validation Failed</p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-[#f3f4f6] border border-[#d1d5db] flex items-center justify-center mb-3">
                <Upload className="w-6 h-6 text-[#374151]" />
              </div>
              <p className="text-sm font-medium text-[#1a1a1a] mb-1">
                {isDragActive ? 'Release to ingest file' : 'Drag context JSON file here'}
              </p>
              <p className="text-xs text-[#6b7280] mb-3">or</p>
              <button className="px-4 py-1.5 bg-[#1a1a1a] text-white text-xs font-medium hover:bg-[#374151] transition-colors border border-[#1a1a1a]">
                Select File
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Validation Errors */}
      {validationResult && !validationResult.valid && validationResult.errors.length > 0 && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-[#991b1b] mb-2 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            Validation Errors ({validationResult.errors.length})
          </h3>
          <div className="bg-[#fef2f2] border border-[#fecaca] p-3 max-h-64 overflow-y-auto">
            <ul className="space-y-1.5">
              {validationResult.errors.map((error, index) => (
                <li key={index} className="text-xs">
                  <span className="font-medium text-[#991b1b] mono">{error.path}:</span>{' '}
                  <span className="text-[#b91c1c]">{error.message}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {validationResult?.valid && validationResult.data && (
        <div className="mb-3">
          <h3 className="text-xs font-semibold text-[#1a1a1a] mb-2">Context Data Summary</h3>
          <div className="bg-[#f9fafb] border border-[#d1d5db] p-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-[#6b7280] mb-0.5">Organization</p>
                <p className="text-[#1a1a1a] font-medium">{validationResult.data.organization.name}</p>
                <p className="text-[#6b7280] text-xs mt-0.5">{validationResult.data.organization.institution}</p>
              </div>
              <div>
                <p className="text-[#6b7280] mb-0.5">Primary Contact</p>
                <p className="text-[#1a1a1a] font-medium">{validationResult.data.organization.primary_contact.name}</p>
                <p className="text-[#6b7280] text-xs mt-0.5 mono">{validationResult.data.organization.primary_contact.email}</p>
              </div>
              <div>
                <p className="text-[#6b7280] mb-0.5">Focus Areas</p>
                <p className="text-[#1a1a1a] font-medium">{validationResult.data.research_profile.focus_areas.length} areas defined</p>
              </div>
              <div>
                <p className="text-[#6b7280] mb-0.5">Team Composition</p>
                <p className="text-[#1a1a1a] font-medium">{validationResult.data.team.length} team members</p>
              </div>
              <div className="col-span-2">
                <p className="text-[#6b7280] mb-0.5">Total Funding Requested</p>
                <p className="text-[#1a1a1a] font-medium mono">${validationResult.data.funding_plan.total_requested_usd.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Convert OrganizationContextJSON to OrganizationContext format
function convertJSONToContext(json: OrganizationContextJSON): OrganizationContext {
  return {
    id: `context-${Date.now()}`,
    organizationName: json.organization.name,
    labDescription: `${json.organization.type} at ${json.organization.institution}. ${json.research_profile.prior_experience}`,
    researchFocus: json.research_profile.focus_areas.join(', '),
    priorWork: json.research_profile.prior_experience,
    fundingAllocationPlan: json.funding_plan.breakdown.map(b => `${b.category}: $${b.amount_usd.toLocaleString()} - ${b.notes}`).join('\n'),
    teamMembers: json.team.map((member, index) => ({
      id: `member-${index + 1}`,
      name: member.name,
      role: member.role,
      email: '', // Not in JSON schema, but required by OrganizationContext
    })),
  };
}
