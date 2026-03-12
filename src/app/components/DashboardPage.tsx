import { useState } from "react";
import { Link } from "react-router";
import {
  Plus,
  Eye,
  Trash2,
  Calendar,
  TrendingUp,
  FileText,
  Award,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Search,
  FolderKanban,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

type ProposalStatus = "generated" | "in-review" | "awarded" | "rejected" | "draft";
type ProjectStatus = "active" | "on-track" | "at-risk" | "completed" | "planning";

interface Proposal {
  id: string;
  title: string;
  status: ProposalStatus;
  created: string;
  confidence: number;
  solicitation: string;
}

interface Project {
  id: string;
  title: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  progress: number;
  budget: string;
  team: number;
  proposalId: string;
}

const proposals: Proposal[] = [
  { id: "p1", title: "Proposal for Leidos GenAI Notes (1)", status: "generated", created: "Feb 12, 2026", confidence: 72, solicitation: "BAA-2026-001" },
  { id: "p2", title: "Autonomous ISR Platform Proposal", status: "awarded", created: "Jan 28, 2026", confidence: 89, solicitation: "DARPA-BAA-26-03" },
  { id: "p3", title: "Cyber Resilience Framework (DARPA)", status: "in-review", created: "Feb 20, 2026", confidence: 65, solicitation: "BAA-2026-015" },
  { id: "p4", title: "Next-Gen C2 Decision Support", status: "awarded", created: "Dec 15, 2025", confidence: 91, solicitation: "DARPA-HR001126S0001" },
  { id: "p5", title: "Quantum Network Security Protocol", status: "rejected", created: "Jan 10, 2026", confidence: 42, solicitation: "BAA-2026-008" },
  { id: "p6", title: "ML-Enhanced Threat Detection", status: "in-review", created: "Mar 1, 2026", confidence: 78, solicitation: "DARPA-BAA-26-12" },
  { id: "p7", title: "Edge Computing for Tactical Ops", status: "draft", created: "Mar 4, 2026", confidence: 0, solicitation: "BAA-2026-022" },
];

const projects: Project[] = [
  { id: "proj1", title: "Autonomous ISR Platform", status: "active", startDate: "Feb 15, 2026", endDate: "Aug 15, 2027", progress: 18, budget: "$4.2M", team: 12, proposalId: "p2" },
  { id: "proj2", title: "Next-Gen C2 Decision Support", status: "on-track", startDate: "Jan 5, 2026", endDate: "Jun 30, 2027", progress: 35, budget: "$6.8M", team: 24, proposalId: "p4" },
  { id: "proj3", title: "SIGINT Processing Upgrade", status: "at-risk", startDate: "Oct 1, 2025", endDate: "Mar 31, 2026", progress: 72, budget: "$2.1M", team: 8, proposalId: "" },
  { id: "proj4", title: "Secure Mesh Networking", status: "completed", startDate: "Jun 1, 2025", endDate: "Dec 31, 2025", progress: 100, budget: "$1.5M", team: 6, proposalId: "" },
];

const pipelineData = [
  { name: "Jan", submitted: 3, awarded: 1 },
  { name: "Feb", submitted: 5, awarded: 2 },
  { name: "Mar", submitted: 2, awarded: 0 },
];

const statusDistribution = [
  { name: "Generated", value: 1, color: "#0d9488" },
  { name: "In Review", value: 2, color: "#f59e0b" },
  { name: "Awarded", value: 2, color: "#10b981" },
  { name: "Rejected", value: 1, color: "#ef4444" },
  { name: "Draft", value: 1, color: "#94a3b8" },
];

const statusColors: Record<ProposalStatus, string> = {
  generated: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "in-review": "bg-amber-50 text-amber-700 border border-amber-200",
  awarded: "bg-green-50 text-green-700 border border-green-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
  draft: "bg-gray-50 text-gray-500 border border-gray-200",
};

const projectStatusColors: Record<ProjectStatus, string> = {
  active: "bg-blue-50 text-blue-700 border border-blue-200",
  "on-track": "bg-green-50 text-green-700 border border-green-200",
  "at-risk": "bg-red-50 text-red-700 border border-red-200",
  completed: "bg-gray-50 text-gray-600 border border-gray-200",
  planning: "bg-purple-50 text-purple-700 border border-purple-200",
};

type TabView = "overview" | "proposals" | "projects";

export function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabView>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredProposals = proposals.filter((p) => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredProjects = projects.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { label: "Total Proposals", value: proposals.length, icon: FileText, color: "text-foreground" },
    { label: "Awarded", value: proposals.filter((p) => p.status === "awarded").length, icon: Award, color: "text-green-600" },
    { label: "In Review", value: proposals.filter((p) => p.status === "in-review").length, icon: Clock, color: "text-amber-600" },
    { label: "Active Projects", value: projects.filter((p) => p.status !== "completed").length, icon: TrendingUp, color: "text-blue-600" },
    { label: "At Risk", value: projects.filter((p) => p.status === "at-risk").length, icon: AlertTriangle, color: "text-red-600" },
    { label: "Avg Confidence", value: `${Math.round(proposals.filter((p) => p.confidence > 0).reduce((a, b) => a + b.confidence, 0) / proposals.filter((p) => p.confidence > 0).length)}%`, icon: CheckCircle2, color: "text-emerald-600" },
  ];

  const tabs: { key: TabView; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "proposals", label: "Proposals" },
    { key: "projects", label: "Projects" },
  ];

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header row */}
      <div className="flex items-center justify-between mb-6">
        <h1>Dashboard</h1>
        <Link
          to="/create"
          className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors no-underline"
        >
          <Plus className="w-4 h-4" />
          Create New Proposal
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm transition-colors relative ${
              activeTab === tab.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-white rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className={`w-4 h-4 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-2xl">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg border border-border p-5">
              <h3 className="mb-4">Proposal Pipeline</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={pipelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="submitted" fill="#030213" name="Submitted" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="awarded" fill="#0d9488" name="Awarded" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg border border-border p-5">
              <h3 className="mb-4">Status Distribution</h3>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {statusDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-2">
                {statusDistribution.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-border">
            <div className="p-5 border-b border-border">
              <h3>Recent Proposals</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Title</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Confidence</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Created</th>
                  <th className="text-right px-5 py-3 text-sm text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposals.slice(0, 5).map((proposal) => (
                  <tr key={proposal.id} className="border-b border-border last:border-b-0 hover:bg-[#f8f8f8] transition-colors">
                    <td className="px-5 py-3 text-sm">{proposal.title}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs ${statusColors[proposal.status]}`}>
                        {proposal.status}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${proposal.confidence}%`,
                              backgroundColor: proposal.confidence >= 75 ? "#10b981" : proposal.confidence >= 50 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{proposal.confidence}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {proposal.created}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/proposal/${proposal.id}`}
                          className="flex items-center gap-1.5 px-3 py-1 border border-border rounded-md text-sm hover:bg-accent transition-colors no-underline text-foreground"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </Link>
                        <button className="p-1 text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Proposals Tab */}
      {activeTab === "proposals" && (
        <div className="bg-white rounded-lg border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search proposals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-border rounded-md bg-[#f8f8f8] text-sm focus:outline-none focus:ring-1 focus:ring-black"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="text-sm border border-border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-black"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="generated">Generated</option>
                  <option value="in-review">In Review</option>
                  <option value="awarded">Awarded</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-sm text-muted-foreground">Title</th>
                <th className="text-left px-5 py-3 text-sm text-muted-foreground">Solicitation</th>
                <th className="text-left px-5 py-3 text-sm text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 text-sm text-muted-foreground">Confidence</th>
                <th className="text-left px-5 py-3 text-sm text-muted-foreground">Created</th>
                <th className="text-right px-5 py-3 text-sm text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProposals.map((proposal) => (
                <tr key={proposal.id} className="border-b border-border last:border-b-0 hover:bg-[#f8f8f8] transition-colors">
                  <td className="px-5 py-3 text-sm">{proposal.title}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{proposal.solicitation}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs ${statusColors[proposal.status]}`}>
                      {proposal.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${proposal.confidence}%`,
                            backgroundColor: proposal.confidence >= 75 ? "#10b981" : proposal.confidence >= 50 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{proposal.confidence}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {proposal.created}
                    </div>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/proposal/${proposal.id}`}
                        className="flex items-center gap-1.5 px-3 py-1 border border-border rounded-md text-sm hover:bg-accent transition-colors no-underline text-foreground"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Link>
                      <button className="p-1 text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredProposals.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">
                    No proposals found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === "projects" && (
        <div className="bg-white rounded-lg border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-border rounded-md bg-[#f8f8f8] text-sm focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <Link
              to="/projects"
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 transition-colors no-underline"
            >
              <FolderKanban className="w-4 h-4" />
              Project Management
            </Link>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-5 py-3 text-sm text-muted-foreground">Project</th>
                <th className="text-left px-5 py-3 text-sm text-muted-foreground">Status</th>
                <th className="text-left px-5 py-3 text-sm text-muted-foreground">Progress</th>
                <th className="text-left px-5 py-3 text-sm text-muted-foreground">Budget</th>
                <th className="text-left px-5 py-3 text-sm text-muted-foreground">Team</th>
                <th className="text-left px-5 py-3 text-sm text-muted-foreground">Timeline</th>
                <th className="text-right px-5 py-3 text-sm text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.map((project) => (
                <tr key={project.id} className="border-b border-border last:border-b-0 hover:bg-[#f8f8f8] transition-colors">
                  <td className="px-5 py-3 text-sm">{project.title}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-xs ${projectStatusColors[project.status]}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-black"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm">{project.budget}</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">{project.team} members</td>
                  <td className="px-5 py-3 text-sm text-muted-foreground">
                    {project.startDate} - {project.endDate}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to={`/project/${project.id}`}
                      className="flex items-center gap-1.5 px-3 py-1 border border-border rounded-md text-sm hover:bg-accent transition-colors no-underline text-foreground inline-flex"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}