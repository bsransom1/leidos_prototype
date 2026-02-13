'use client';

import { useState } from 'react';
import { Calendar, DollarSign, Target, FileText, Plus, X } from 'lucide-react';
import { Project, Milestone, Deliverable, BudgetAllocation } from '@/types';

interface ProjectSetupProps {
  proposalId: string;
  onSubmit: (project: Project) => void;
}

export default function ProjectSetup({ proposalId, onSubmit }: ProjectSetupProps) {
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [budgetAllocations, setBudgetAllocations] = useState<BudgetAllocation[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const project: Project = {
      id: `project-${Date.now()}`,
      proposalId,
      name: projectName,
      timeline: {
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        phases: [],
      },
      milestones,
      deliverables,
      budget: budgetAllocations,
    };

    onSubmit(project);
  };

  const addMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: `milestone-${Date.now()}`,
        name: '',
        dueDate: new Date(),
        status: 'pending',
        deliverables: [],
      },
    ]);
  };

  const addDeliverable = () => {
    setDeliverables([
      ...deliverables,
      {
        id: `deliverable-${Date.now()}`,
        name: '',
        description: '',
        dueDate: new Date(),
        status: 'pending',
        confidence: 75,
      },
    ]);
  };

  const addBudgetAllocation = () => {
    setBudgetAllocations([
      ...budgetAllocations,
      {
        id: `budget-${Date.now()}`,
        teamId: '',
        teamName: '',
        timePeriod: {
          start: new Date(),
          end: new Date(),
        },
        amount: 0,
        deliverables: [],
      },
    ]);
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Post-Award Project Setup</h2>
        <p className="text-slate-600">
          Configure timelines, milestones, deliverables, and budget allocations for your awarded project
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Info */}
        <div className="bg-slate-50 rounded-lg p-6">
          <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Project Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Milestones */}
        <div className="bg-slate-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5" />
              Milestones
            </h3>
            <button
              type="button"
              onClick={addMilestone}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add Milestone
            </button>
          </div>
          <div className="space-y-3">
            {milestones.map((milestone, index) => (
              <div key={milestone.id} className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Milestone name"
                    value={milestone.name}
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[index].name = e.target.value;
                      setMilestones(updated);
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="date"
                    value={milestone.dueDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const updated = [...milestones];
                      updated[index].dueDate = new Date(e.target.value);
                      setMilestones(updated);
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            ))}
            {milestones.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">
                No milestones added yet. Click "Add Milestone" to get started.
              </p>
            )}
          </div>
        </div>

        {/* Deliverables */}
        <div className="bg-slate-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Deliverables
            </h3>
            <button
              type="button"
              onClick={addDeliverable}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add Deliverable
            </button>
          </div>
          <div className="space-y-3">
            {deliverables.map((deliverable, index) => (
              <div key={deliverable.id} className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Deliverable name"
                    value={deliverable.name}
                    onChange={(e) => {
                      const updated = [...deliverables];
                      updated[index].name = e.target.value;
                      setDeliverables(updated);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <textarea
                    placeholder="Description"
                    value={deliverable.description}
                    onChange={(e) => {
                      const updated = [...deliverables];
                      updated[index].description = e.target.value;
                      setDeliverables(updated);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="date"
                      value={deliverable.dueDate.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const updated = [...deliverables];
                        updated[index].dueDate = new Date(e.target.value);
                        setDeliverables(updated);
                      }}
                      className="px-3 py-2 border border-slate-300 rounded-lg"
                    />
                    <input
                      type="number"
                      placeholder="Confidence %"
                      value={deliverable.confidence}
                      onChange={(e) => {
                        const updated = [...deliverables];
                        updated[index].confidence = parseInt(e.target.value) || 0;
                        setDeliverables(updated);
                      }}
                      className="px-3 py-2 border border-slate-300 rounded-lg"
                      min="0"
                      max="100"
                    />
                  </div>
                </div>
              </div>
            ))}
            {deliverables.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">
                No deliverables added yet. Click "Add Deliverable" to get started.
              </p>
            )}
          </div>
        </div>

        {/* Budget Allocations */}
        <div className="bg-slate-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Budget Allocations
            </h3>
            <button
              type="button"
              onClick={addBudgetAllocation}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              Add Allocation
            </button>
          </div>
          <div className="space-y-3">
            {budgetAllocations.map((allocation, index) => (
              <div key={allocation.id} className="bg-white p-4 rounded-lg border border-slate-200">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Team name"
                    value={allocation.teamName}
                    onChange={(e) => {
                      const updated = [...budgetAllocations];
                      updated[index].teamName = e.target.value;
                      setBudgetAllocations(updated);
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="number"
                    placeholder="Amount ($)"
                    value={allocation.amount || ''}
                    onChange={(e) => {
                      const updated = [...budgetAllocations];
                      updated[index].amount = parseFloat(e.target.value) || 0;
                      setBudgetAllocations(updated);
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="date"
                    placeholder="Start date"
                    value={allocation.timePeriod.start.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const updated = [...budgetAllocations];
                      updated[index].timePeriod.start = new Date(e.target.value);
                      setBudgetAllocations(updated);
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="date"
                    placeholder="End date"
                    value={allocation.timePeriod.end.toISOString().split('T')[0]}
                    onChange={(e) => {
                      const updated = [...budgetAllocations];
                      updated[index].timePeriod.end = new Date(e.target.value);
                      setBudgetAllocations(updated);
                    }}
                    className="px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>
            ))}
            {budgetAllocations.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">
                No budget allocations added yet. Click "Add Allocation" to get started.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}
