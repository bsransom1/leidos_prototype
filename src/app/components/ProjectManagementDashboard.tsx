import { useState } from "react";
import { Link } from "react-router";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  DollarSign,
  Users,
  FileText,
  TrendingUp,
  Shield,
  Target,
  ChevronDown,
  ChevronUp,
  Eye,
  Filter,
  Search,
  Activity,
  Layers,
  Flag,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

type DashboardView = "overview" | "timeline" | "budget" | "risks" | "deliverables";

interface ProjectSummary {
  id: string;
  title: string;
  status: "active" | "on-track" | "at-risk" | "completed" | "planning";
  progress: number;
  budget: number;
  spent: number;
  team: number;
  startDate: string;
  endDate: string;
  solicitation: string;
  contractNumber: string;
  tasksTotal: number;
  tasksCompleted: number;
  tasksBlocked: number;
  confidence: number;
  proposalId: string;
}

interface Risk {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  project: string;
  projectId: string;
  status: "open" | "mitigating" | "resolved";
  description: string;
  owner: string;
  dateIdentified: string;
}

interface Deliverable {
  id: string;
  title: string;
  project: string;
  projectId: string;
  dueDate: string;
  status: "submitted" | "pending" | "overdue" | "approved";
  type: "CDRL" | "Report" | "Prototype" | "Review" | "Software";
}

interface BudgetMonth {
  month: string;
  planned: number;
  actual: number;
  forecast: number;
}

const allProjects: ProjectSummary[] = [
  {
    id: "proj1",
    title: "Autonomous ISR Platform",
    status: "active",
    progress: 18,
    budget: 4200000,
    spent: 756000,
    team: 12,
    startDate: "Feb 15, 2026",
    endDate: "Aug 15, 2027",
    solicitation: "DARPA-BAA-26-03",
    contractNumber: "FA8750-26-C-0142",
    tasksTotal: 6,
    tasksCompleted: 1,
    tasksBlocked: 1,
    confidence: 89,
    proposalId: "p2",
  },
  {
    id: "proj2",
    title: "Next-Gen C2 Decision Support",
    status: "on-track",
    progress: 35,
    budget: 6800000,
    spent: 2380000,
    team: 24,
    startDate: "Jan 5, 2026",
    endDate: "Jun 30, 2027",
    solicitation: "DARPA-HR001126S0001",
    contractNumber: "W911NF-26-C-0087",
    tasksTotal: 5,
    tasksCompleted: 2,
    tasksBlocked: 0,
    confidence: 91,
    proposalId: "p4",
  },
  {
    id: "proj3",
    title: "SIGINT Processing Upgrade",
    status: "at-risk",
    progress: 72,
    budget: 2100000,
    spent: 1890000,
    team: 8,
    startDate: "Oct 1, 2025",
    endDate: "Mar 31, 2026",
    solicitation: "BAA-2025-042",
    contractNumber: "N00014-25-C-0218",
    tasksTotal: 5,
    tasksCompleted: 2,
    tasksBlocked: 1,
    confidence: 65,
    proposalId: "",
  },
  {
    id: "proj4",
    title: "Secure Mesh Networking",
    status: "completed",
    progress: 100,
    budget: 1500000,
    spent: 1420000,
    team: 6,
    startDate: "Jun 1, 2025",
    endDate: "Dec 31, 2025",
    solicitation: "DARPA-BAA-25-08",
    contractNumber: "FA8702-25-C-0055",
    tasksTotal: 0,
    tasksCompleted: 0,
    tasksBlocked: 0,
    confidence: 95,
    proposalId: "",
  },
];

const risks: Risk[] = [
  {
    id: "r1",
    title: "Hardware delivery delay impacting Performance Optimization",
    severity: "critical",
    project: "SIGINT Processing Upgrade",
    projectId: "proj3",
    status: "open",
    description: "Vendor hardware shipment delayed by 3 weeks. Performance optimization task blocked.",
    owner: "E. Thompson",
    dateIdentified: "Mar 1, 2026",
  },
  {
    id: "r2",
    title: "Budget overrun - 90% spent at 72% completion",
    severity: "high",
    project: "SIGINT Processing Upgrade",
    projectId: "proj3",
    status: "mitigating",
    description: "Current burn rate exceeds planned trajectory. Request for additional funds in review.",
    owner: "bsransom",
    dateIdentified: "Mar 3, 2026",
  },
  {
    id: "r3",
    title: "Security clearance pending for new team member",
    severity: "medium",
    project: "Autonomous ISR Platform",
    projectId: "proj1",
    status: "open",
    description: "M. Johnson awaiting TS/SCI clearance. Security hardening task blocked until resolved.",
    owner: "bsransom",
    dateIdentified: "Feb 20, 2026",
  },
  {
    id: "r4",
    title: "ML model accuracy below threshold in edge cases",
    severity: "medium",
    project: "Autonomous ISR Platform",
    projectId: "proj1",
    status: "mitigating",
    description: "Model achieves 87% accuracy vs. 95% target on adversarial test data. Additional training required.",
    owner: "A. Patel",
    dateIdentified: "Mar 2, 2026",
  },
  {
    id: "r5",
    title: "Third-party API deprecation notice",
    severity: "low",
    project: "Next-Gen C2 Decision Support",
    projectId: "proj2",
    status: "open",
    description: "Intelligence feed API v2 will be deprecated in Q4 2026. Migration plan needed.",
    owner: "D. Roberts",
    dateIdentified: "Feb 28, 2026",
  },
];

const deliverables: Deliverable[] = [
  { id: "d1", title: "System Requirements Document (SRD)", project: "Autonomous ISR Platform", projectId: "proj1", dueDate: "Mar 15, 2026", status: "pending", type: "CDRL" },
  { id: "d2", title: "Preliminary Design Review (PDR)", project: "Autonomous ISR Platform", projectId: "proj1", dueDate: "Apr 30, 2026", status: "pending", type: "Review" },
  { id: "d3", title: "Monthly Status Report - Feb 2026", project: "Next-Gen C2 Decision Support", projectId: "proj2", dueDate: "Mar 5, 2026", status: "submitted", type: "Report" },
  { id: "d4", title: "Phase 2 Software Build", project: "Next-Gen C2 Decision Support", projectId: "proj2", dueDate: "May 30, 2026", status: "pending", type: "Software" },
  { id: "d5", title: "Final Acceptance Test Report", project: "SIGINT Processing Upgrade", projectId: "proj3", dueDate: "Mar 31, 2026", status: "overdue", type: "Report" },
  { id: "d6", title: "Data Migration Validation", project: "SIGINT Processing Upgrade", projectId: "proj3", dueDate: "Mar 10, 2026", status: "overdue", type: "CDRL" },
  { id: "d7", title: "UI/UX Prototype Demo", project: "Next-Gen C2 Decision Support", projectId: "proj2", dueDate: "Mar 30, 2026", status: "pending", type: "Prototype" },
  { id: "d8", title: "Security Assessment Report", project: "Autonomous ISR Platform", projectId: "proj1", dueDate: "Jun 15, 2026", status: "pending", type: "Report" },
  { id: "d9", title: "Final Delivery Package", project: "Secure Mesh Networking", projectId: "proj4", dueDate: "Dec 31, 2025", status: "approved", type: "CDRL" },
];

const budgetData: BudgetMonth[] = [
  { month: "Oct 25", planned: 210, actual: 195, forecast: 195 },
  { month: "Nov 25", planned: 420, actual: 415, forecast: 415 },
  { month: "Dec 25", planned: 680, actual: 710, forecast: 710 },
  { month: "Jan 26", planned: 980, actual: 1050, forecast: 1050 },
  { month: "Feb 26", planned: 1350, actual: 1480, forecast: 1480 },
  { month: "Mar 26", planned: 1780, actual: 0, forecast: 1920 },
  { month: "Apr 26", planned: 2200, actual: 0, forecast: 2400 },
  { month: "May 26", planned: 2650, actual: 0, forecast: 2920 },
];

const projectBudgetBreakdown = [
  { name: "ISR Platform", budget: 4200, spent: 756, color: "#030213" },
  { name: "C2 Decision", budget: 6800, spent: 2380, color: "#0d9488" },
  { name: "SIGINT", budget: 2100, spent: 1890, color: "#ef4444" },
  { name: "Mesh Net", budget: 1500, spent: 1420, color: "#94a3b8" },
];

const timelineData = [
  { name: "Oct", tasks: 4, completed: 4 },
  { name: "Nov", tasks: 6, completed: 5 },
  { name: "Dec", tasks: 8, completed: 7 },
  { name: "Jan", tasks: 10, completed: 8 },
  { name: "Feb", tasks: 12, completed: 9 },
  { name: "Mar", tasks: 8, completed: 3 },
];

const taskDistribution = [
  { name: "Completed", value: 5, color: "#10b981" },
  { name: "In Progress", value: 4, color: "#3b82f6" },
  { name: "Pending", value: 4, color: "#94a3b8" },
  { name: "Blocked", value: 2, color: "#ef4444" },
];

const statusColors: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border border-blue-200",
  "on-track": "bg-green-50 text-green-700 border border-green-200",
  "at-risk": "bg-red-50 text-red-700 border border-red-200",
  completed: "bg-gray-50 text-gray-600 border border-gray-200",
  planning: "bg-purple-50 text-purple-700 border border-purple-200",
};

const severityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-800 border border-red-300",
  high: "bg-orange-50 text-orange-700 border border-orange-200",
  medium: "bg-amber-50 text-amber-700 border border-amber-200",
  low: "bg-blue-50 text-blue-600 border border-blue-200",
};

const riskStatusColors: Record<string, string> = {
  open: "bg-red-50 text-red-700 border border-red-200",
  mitigating: "bg-amber-50 text-amber-700 border border-amber-200",
  resolved: "bg-green-50 text-green-700 border border-green-200",
};

const deliverableStatusColors: Record<string, string> = {
  submitted: "bg-blue-50 text-blue-700 border border-blue-200",
  pending: "bg-gray-50 text-gray-600 border border-gray-200",
  overdue: "bg-red-50 text-red-700 border border-red-200",
  approved: "bg-green-50 text-green-700 border border-green-200",
};

const formatCurrency = (val: number) => `$${(val / 1000000).toFixed(1)}M`;

export function ProjectManagementDashboard() {
  const [activeView, setActiveView] = useState<DashboardView>("overview");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedRisk, setExpandedRisk] = useState<string | null>(null);
  const [deliverableFilter, setDeliverableFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");

  const activeProjects = allProjects.filter((p) => p.status !== "completed");
  const totalBudget = allProjects.reduce((a, p) => a + p.budget, 0);
  const totalSpent = allProjects.reduce((a, p) => a + p.spent, 0);
  const totalTeam = allProjects.reduce((a, p) => a + p.team, 0);
  const totalTasks = allProjects.reduce((a, p) => a + p.tasksTotal, 0);
  const completedTasks = allProjects.reduce((a, p) => a + p.tasksCompleted, 0);
  const blockedTasks = allProjects.reduce((a, p) => a + p.tasksBlocked, 0);
  const openRisks = risks.filter((r) => r.status !== "resolved").length;
  const overdueDeliverables = deliverables.filter((d) => d.status === "overdue").length;

  const filteredDeliverables = deliverables.filter((d) => {
    const matchesFilter = deliverableFilter === "all" || d.status === deliverableFilter;
    const matchesSearch = d.title.toLowerCase().includes(searchTerm.toLowerCase()) || d.project.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const filteredRisks = risks.filter((r) => {
    const matchesFilter = riskFilter === "all" || r.severity === riskFilter;
    return matchesFilter;
  });

  const views: { key: DashboardView; label: string; icon: typeof BarChart3 }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "timeline", label: "Timeline", icon: Calendar },
    { key: "budget", label: "Budget", icon: DollarSign },
    { key: "risks", label: "Risks", icon: Shield },
    { key: "deliverables", label: "Deliverables", icon: FileText },
  ];

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-1 hover:bg-accent rounded transition-colors text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h1>Project Management</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Portfolio overview across all active BAA/DARPA programs
              </p>
            </div>
            <Link
              to="/"
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-md text-sm hover:bg-accent transition-colors no-underline text-foreground"
            >
              <Layers className="w-4 h-4" />
              Proposal Pipeline
            </Link>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {views.map((view) => (
          <button
            key={view.key}
            onClick={() => setActiveView(view.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors relative ${
              activeView === view.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <view.icon className="w-4 h-4" />
            {view.label}
            {view.key === "risks" && openRisks > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">{openRisks}</span>
            )}
            {view.key === "deliverables" && overdueDeliverables > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-xs">{overdueDeliverables}</span>
            )}
            {activeView === view.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW ===== */}
      {activeView === "overview" && (
        <>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {[
              { label: "Active Projects", value: activeProjects.length, icon: Activity, color: "text-blue-600" },
              { label: "Total Budget", value: formatCurrency(totalBudget), icon: DollarSign, color: "text-foreground" },
              { label: "Total Spent", value: formatCurrency(totalSpent), icon: TrendingUp, color: "text-amber-600" },
              { label: "Team Size", value: totalTeam, icon: Users, color: "text-foreground" },
              { label: "Total Tasks", value: totalTasks, icon: Target, color: "text-foreground" },
              { label: "Completed", value: completedTasks, icon: CheckCircle2, color: "text-green-600" },
              { label: "Blocked", value: blockedTasks, icon: AlertTriangle, color: "text-red-600" },
              { label: "Open Risks", value: openRisks, icon: Shield, color: "text-red-600" },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-lg border border-border p-3">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  <span className="text-xs text-muted-foreground">{stat.label}</span>
                </div>
                <p className="text-xl">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg border border-border p-5">
              <h3 className="mb-4">Task Completion Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="tasks" fill="#e5e7eb" name="Total Tasks" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="completed" fill="#030213" name="Completed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg border border-border p-5">
              <h3 className="mb-4">Task Status Distribution</h3>
              <div className="flex items-center justify-center">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={taskDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {taskDistribution.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 justify-center mt-1">
                {taskDistribution.map((s) => (
                  <div key={s.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    {s.name} ({s.value})
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Project Cards */}
          <div className="bg-white rounded-lg border border-border">
            <div className="p-5 border-b border-border">
              <h3>All Projects</h3>
            </div>
            <div className="divide-y divide-border">
              {allProjects.map((project) => (
                <div
                  key={project.id}
                  className="p-5 hover:bg-[#f8f8f8] transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <h4>{project.title}</h4>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs ${statusColors[project.status]}`}>
                        {project.status}
                      </span>
                    </div>
                    <Link
                      to={`/project/${project.id}`}
                      className="flex items-center gap-1.5 px-3 py-1 border border-border rounded-md text-sm hover:bg-accent transition-colors no-underline text-foreground"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Manage
                    </Link>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Progress</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${project.progress}%`,
                              backgroundColor: project.status === "at-risk" ? "#ef4444" : "#030213",
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">{project.progress}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Budget</p>
                      <p className="text-sm">{formatCurrency(project.budget)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(project.spent)} spent ({Math.round((project.spent / project.budget) * 100)}%)
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Tasks</p>
                      <p className="text-sm">
                        {project.tasksCompleted}/{project.tasksTotal} completed
                      </p>
                      {project.tasksBlocked > 0 && (
                        <p className="text-xs text-red-500">{project.tasksBlocked} blocked</p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Team</p>
                      <p className="text-sm">{project.team} members</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Contract</p>
                      <p className="text-sm">{project.contractNumber}</p>
                      <p className="text-xs text-muted-foreground">{project.solicitation}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== TIMELINE ===== */}
      {activeView === "timeline" && (
        <>
          <div className="bg-white rounded-lg border border-border p-5 mb-6">
            <h3 className="mb-5">Program Timeline</h3>
            <div className="space-y-6">
              {allProjects.map((project) => {
                const startDate = new Date(project.startDate);
                const endDate = new Date(project.endDate);
                const today = new Date("2026-03-06");
                const totalDuration = endDate.getTime() - startDate.getTime();
                const elapsed = Math.max(0, today.getTime() - startDate.getTime());
                const elapsedPct = Math.min(100, (elapsed / totalDuration) * 100);

                return (
                  <div key={project.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/project/${project.id}`}
                          className="text-sm text-foreground no-underline hover:underline"
                        >
                          {project.title}
                        </Link>
                        <span className={`inline-block px-2 py-0.5 rounded text-xs ${statusColors[project.status]}`}>
                          {project.status}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {project.startDate} &ndash; {project.endDate}
                      </span>
                    </div>
                    <div className="relative h-8 bg-gray-50 rounded border border-border overflow-hidden">
                      {/* Progress bar */}
                      <div
                        className="absolute top-0 left-0 h-full rounded-l"
                        style={{
                          width: `${project.progress}%`,
                          backgroundColor: project.status === "at-risk" ? "#fecaca" : project.status === "completed" ? "#d1fae5" : "#e5e7eb",
                        }}
                      />
                      {/* Today marker */}
                      {project.status !== "completed" && (
                        <div
                          className="absolute top-0 h-full w-px bg-black"
                          style={{ left: `${elapsedPct}%` }}
                        >
                          <div className="absolute -top-0.5 -left-1 w-2 h-2 bg-black rounded-full" />
                        </div>
                      )}
                      {/* Labels */}
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs text-muted-foreground">{project.progress}% complete</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-px h-3 bg-black" />
              <span>Today (Mar 6, 2026)</span>
            </div>
          </div>

          {/* Upcoming Milestones */}
          <div className="bg-white rounded-lg border border-border p-5">
            <h3 className="mb-5">Upcoming Milestones</h3>
            <div className="space-y-3">
              {[
                { title: "Phase 1: Requirements & Design", project: "Autonomous ISR Platform", date: "Mar 30, 2026", status: "current", projectId: "proj1" },
                { title: "Migration Complete", project: "SIGINT Processing Upgrade", date: "Mar 1, 2026", status: "current", projectId: "proj3" },
                { title: "Final Delivery", project: "SIGINT Processing Upgrade", date: "Mar 31, 2026", status: "upcoming", projectId: "proj3" },
                { title: "Phase 2: Core Systems", project: "Next-Gen C2 Decision Support", date: "May 30, 2026", status: "current", projectId: "proj2" },
                { title: "Phase 2: Core Development", project: "Autonomous ISR Platform", date: "Jul 30, 2026", status: "upcoming", projectId: "proj1" },
              ].map((ms, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${ms.status === "current" ? "bg-black" : "bg-gray-300"}`} />
                    <div>
                      <p className="text-sm">{ms.title}</p>
                      <p className="text-xs text-muted-foreground">{ms.project}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{ms.date}</span>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs ${ms.status === "current" ? "bg-black text-white" : "bg-gray-50 text-gray-500 border border-gray-200"}`}>
                      {ms.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== BUDGET ===== */}
      {activeView === "budget" && (
        <>
          {/* Budget Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Portfolio Budget</p>
              <p className="text-2xl">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="bg-white rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">Total Spent</p>
              <p className="text-2xl">{formatCurrency(totalSpent)}</p>
              <p className="text-xs text-muted-foreground mt-1">{Math.round((totalSpent / totalBudget) * 100)}% of budget</p>
            </div>
            <div className="bg-white rounded-lg border border-border p-4">
              <p className="text-xs text-muted-foreground mb-1">Remaining</p>
              <p className="text-2xl">{formatCurrency(totalBudget - totalSpent)}</p>
            </div>
            <div className={`rounded-lg border p-4 ${totalSpent / totalBudget > 0.85 ? "bg-red-50 border-red-200" : "bg-white border-border"}`}>
              <p className="text-xs text-muted-foreground mb-1">Budget Health</p>
              <p className={`text-2xl ${totalSpent / totalBudget > 0.85 ? "text-red-600" : "text-green-600"}`}>
                {totalSpent / totalBudget > 0.85 ? "At Risk" : "Healthy"}
              </p>
            </div>
          </div>

          {/* Budget Burn Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg border border-border p-5">
              <h3 className="mb-4">Cumulative Budget Burn ($K)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={budgetData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(val: number) => `$${val}K`} />
                  <Area type="monotone" dataKey="planned" stroke="#94a3b8" fill="#f1f5f9" strokeDasharray="5 5" name="Planned" />
                  <Area type="monotone" dataKey="actual" stroke="#030213" fill="#e5e7eb" name="Actual" />
                  <Line type="monotone" dataKey="forecast" stroke="#ef4444" strokeDasharray="3 3" name="Forecast" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-white rounded-lg border border-border p-5">
              <h3 className="mb-4">Budget by Project ($K)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={projectBudgetBreakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip formatter={(val: number) => `$${val}K`} />
                  <Bar dataKey="budget" fill="#e5e7eb" name="Budget" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="spent" fill="#030213" name="Spent" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Per-project budget table */}
          <div className="bg-white rounded-lg border border-border">
            <div className="p-5 border-b border-border">
              <h3>Budget Details by Project</h3>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Project</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Contract</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Budget</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Spent</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Remaining</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Burn Rate</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {allProjects.map((project) => {
                  const burnRate = Math.round((project.spent / project.budget) * 100);
                  const isOverBurn = burnRate > project.progress + 10;
                  return (
                    <tr key={project.id} className="border-b border-border last:border-b-0 hover:bg-[#f8f8f8] transition-colors">
                      <td className="px-5 py-3 text-sm">
                        <Link to={`/project/${project.id}`} className="text-foreground no-underline hover:underline">
                          {project.title}
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-sm text-muted-foreground">{project.contractNumber}</td>
                      <td className="px-5 py-3 text-sm">{formatCurrency(project.budget)}</td>
                      <td className="px-5 py-3 text-sm">{formatCurrency(project.spent)}</td>
                      <td className="px-5 py-3 text-sm">{formatCurrency(project.budget - project.spent)}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${burnRate}%`,
                                backgroundColor: isOverBurn ? "#ef4444" : "#030213",
                              }}
                            />
                          </div>
                          <span className={`text-xs ${isOverBurn ? "text-red-600" : "text-muted-foreground"}`}>
                            {burnRate}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded text-xs ${isOverBurn ? "bg-red-50 text-red-700 border border-red-200" : "bg-green-50 text-green-700 border border-green-200"}`}>
                          {isOverBurn ? "Over Budget" : "On Track"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== RISKS ===== */}
      {activeView === "risks" && (
        <>
          {/* Risk Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Critical", value: risks.filter((r) => r.severity === "critical").length, color: "text-red-600", bg: "bg-red-50 border-red-200" },
              { label: "High", value: risks.filter((r) => r.severity === "high").length, color: "text-orange-600", bg: "bg-orange-50 border-orange-200" },
              { label: "Medium", value: risks.filter((r) => r.severity === "medium").length, color: "text-amber-600", bg: "bg-amber-50 border-amber-200" },
              { label: "Low", value: risks.filter((r) => r.severity === "low").length, color: "text-blue-600", bg: "bg-blue-50 border-blue-200" },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-lg border p-4 ${stat.bg}`}>
                <p className="text-xs text-muted-foreground mb-1">{stat.label} Risks</p>
                <p className={`text-2xl ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3 mb-4">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="text-sm border border-border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Risk Register */}
          <div className="bg-white rounded-lg border border-border">
            <div className="p-5 border-b border-border">
              <h3>Risk Register</h3>
            </div>
            <div className="divide-y divide-border">
              {filteredRisks.map((risk) => (
                <div key={risk.id} className="hover:bg-[#f8f8f8] transition-colors">
                  <button
                    onClick={() => setExpandedRisk(expandedRisk === risk.id ? null : risk.id)}
                    className="w-full px-5 py-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Flag className={`w-4 h-4 shrink-0 ${risk.severity === "critical" ? "text-red-600" : risk.severity === "high" ? "text-orange-500" : risk.severity === "medium" ? "text-amber-500" : "text-blue-500"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{risk.title}</p>
                        <p className="text-xs text-muted-foreground">{risk.project}</p>
                      </div>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs ${severityColors[risk.severity]}`}>
                        {risk.severity}
                      </span>
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs ${riskStatusColors[risk.status]}`}>
                        {risk.status}
                      </span>
                    </div>
                    {expandedRisk === risk.id ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground ml-3 shrink-0" />
                    )}
                  </button>
                  {expandedRisk === risk.id && (
                    <div className="px-5 pb-4 pt-0">
                      <div className="bg-[#f8f8f8] rounded-lg p-4 ml-7">
                        <p className="text-sm mb-3">{risk.description}</p>
                        <div className="flex gap-6 text-xs text-muted-foreground">
                          <span>Owner: {risk.owner}</span>
                          <span>Identified: {risk.dateIdentified}</span>
                          <Link to={`/project/${risk.projectId}`} className="text-foreground underline">
                            View Project
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== DELIVERABLES ===== */}
      {activeView === "deliverables" && (
        <>
          {/* Deliverable Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Total", value: deliverables.length, bg: "bg-white border-border" },
              { label: "Pending", value: deliverables.filter((d) => d.status === "pending").length, bg: "bg-white border-border" },
              { label: "Overdue", value: overdueDeliverables, bg: "bg-red-50 border-red-200" },
              { label: "Approved", value: deliverables.filter((d) => d.status === "approved").length, bg: "bg-green-50 border-green-200" },
            ].map((stat) => (
              <div key={stat.label} className={`rounded-lg border p-4 ${stat.bg}`}>
                <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-2xl">{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search deliverables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-border rounded-md bg-[#f8f8f8] text-sm focus:outline-none focus:ring-1 focus:ring-black"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                value={deliverableFilter}
                onChange={(e) => setDeliverableFilter(e.target.value)}
                className="text-sm border border-border rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-1 focus:ring-black"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="submitted">Submitted</option>
                <option value="overdue">Overdue</option>
                <option value="approved">Approved</option>
              </select>
            </div>
          </div>

          {/* Deliverables Table */}
          <div className="bg-white rounded-lg border border-border">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Deliverable</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Type</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Project</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Due Date</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Status</th>
                  <th className="text-right px-5 py-3 text-sm text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliverables.map((del) => (
                  <tr key={del.id} className="border-b border-border last:border-b-0 hover:bg-[#f8f8f8] transition-colors">
                    <td className="px-5 py-3 text-sm">{del.title}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 border border-border rounded bg-gray-50 text-muted-foreground">
                        {del.type}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{del.project}</td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {del.dueDate}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs ${deliverableStatusColors[del.status]}`}>
                        {del.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        to={`/project/${del.projectId}`}
                        className="flex items-center gap-1.5 px-3 py-1 border border-border rounded-md text-sm hover:bg-accent transition-colors no-underline text-foreground inline-flex"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredDeliverables.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground text-sm">
                      No deliverables found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
