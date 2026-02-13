'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { BAA, OrganizationContext, TeamMember } from '@/types';

interface OrganizationContextFormProps {
  baa: BAA;
  onSubmit: (context: OrganizationContext) => void;
}

export default function OrganizationContextForm({ baa, onSubmit }: OrganizationContextFormProps) {
  const [formData, setFormData] = useState({
    organizationName: '',
    labDescription: '',
    researchFocus: '',
    priorWork: '',
    fundingAllocationPlan: '',
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([
    { id: '1', name: '', role: '', email: '' },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const context: OrganizationContext = {
      id: `context-${Date.now()}`,
      ...formData,
      teamMembers: teamMembers.filter(m => m.name && m.role),
    };

    onSubmit(context);
  };

  const addTeamMember = () => {
    setTeamMembers([
      ...teamMembers,
      { id: `${Date.now()}`, name: '', role: '', email: '' },
    ]);
  };

  const removeTeamMember = (id: string) => {
    if (teamMembers.length > 1) {
      setTeamMembers(teamMembers.filter(m => m.id !== id));
    }
  };

  const updateTeamMember = (id: string, field: keyof TeamMember, value: string) => {
    setTeamMembers(
      teamMembers.map(m => (m.id === id ? { ...m, [field]: value } : m))
    );
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Organization Context</h2>
        <p className="text-slate-600">
          Provide information about your organization to help generate a tailored proposal
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Organization/Lab Name *
          </label>
          <input
            type="text"
            required
            value={formData.organizationName}
            onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., UCI Research Lab"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Lab Description *
          </label>
          <textarea
            required
            value={formData.labDescription}
            onChange={(e) => setFormData({ ...formData, labDescription: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe your research lab, its mission, and key focus areas..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Research Focus *
          </label>
          <input
            type="text"
            required
            value={formData.researchFocus}
            onChange={(e) => setFormData({ ...formData, researchFocus: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Machine Learning, Cybersecurity, Biomedical Engineering"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Prior Work & Experience
          </label>
          <textarea
            value={formData.priorWork}
            onChange={(e) => setFormData({ ...formData, priorWork: e.target.value })}
            rows={4}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe relevant prior work, publications, or projects..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Funding Allocation Plan
          </label>
          <textarea
            value={formData.fundingAllocationPlan}
            onChange={(e) => setFormData({ ...formData, fundingAllocationPlan: e.target.value })}
            rows={3}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Describe how funding will be allocated across teams, time periods, and deliverables..."
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-slate-700">
              Team Members
            </label>
            <button
              type="button"
              onClick={addTeamMember}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Plus className="w-4 h-4" />
              Add Member
            </button>
          </div>

          <div className="space-y-3">
            {teamMembers.map((member, index) => (
              <div key={member.id} className="flex gap-3 items-start">
                <div className="flex-1 grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    value={member.name}
                    onChange={(e) => updateTeamMember(member.id, 'name', e.target.value)}
                    placeholder="Name"
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="text"
                    value={member.role}
                    onChange={(e) => updateTeamMember(member.id, 'role', e.target.value)}
                    placeholder="Role"
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="email"
                    value={member.email}
                    onChange={(e) => updateTeamMember(member.id, 'email', e.target.value)}
                    placeholder="Email"
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {teamMembers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTeamMember(member.id)}
                    className="p-2 text-slate-400 hover:text-red-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Generate Proposal
          </button>
        </div>
      </form>
    </div>
  );
}
