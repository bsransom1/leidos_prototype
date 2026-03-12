import { useState } from "react";
import { useParams, Link } from "react-router";
import {
  ArrowLeft,
  Users,
  Calendar,
  DollarSign,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Plus,
  MoreHorizontal,
  FileText,
  MessageSquare,
  Milestone,
  ChevronRight,
  UserPlus,
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: "completed" | "in-progress" | "pending" | "blocked";
  assignee: string;
  dueDate: string;
  priority: "high" | "medium" | "low";
}

interface MilestoneItem {
  id: string;
  title: string;
  date: string;
  status: "completed" | "current" | "upcoming";
}

interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  initials: string;
}

interface ActivityItem {
  id: string;
  action: string;
  user: string;
  time: string;
}

const projectsData: Record<string, {
  title: string;
  status: string;
  description: string;
  startDate: string;
  endDate: string;
  progress: number;
  budget: string;
  spent: string;
  solicitation: string;
  contractNumber: string;
  tasks: Task[];
  milestones: MilestoneItem[];
  team: TeamMember[];
  activities: ActivityItem[];
}> = {
  proj1: {
    title: "Autonomous ISR Platform",
    status: "active",
    description: "Development of autonomous intelligence, surveillance, and reconnaissance platform leveraging advanced AI/ML capabilities for real-time data processing and threat identification.",
    startDate: "Feb 15, 2026",
    endDate: "Aug 15, 2027",
    progress: 18,
    budget: "$4,200,000",
    spent: "$756,000",
    solicitation: "DARPA-BAA-26-03",
    contractNumber: "FA8750-26-C-0142",
    tasks: [
      { id: "t1", title: "System Architecture Design", status: "completed", assignee: "J. Martinez", dueDate: "Mar 15, 2026", priority: "high" },
      { id: "t2", title: "Sensor Integration Framework", status: "in-progress", assignee: "S. Chen", dueDate: "Apr 30, 2026", priority: "high" },
      { id: "t3", title: "ML Model Training Pipeline", status: "in-progress", assignee: "A. Patel", dueDate: "May 15, 2026", priority: "medium" },
      { id: "t4", title: "Edge Processing Module", status: "pending", assignee: "R. Kim", dueDate: "Jun 30, 2026", priority: "medium" },
      { id: "t5", title: "Communications Protocol", status: "pending", assignee: "L. Williams", dueDate: "Jul 15, 2026", priority: "low" },
      { id: "t6", title: "Security Hardening", status: "blocked", assignee: "M. Johnson", dueDate: "Aug 1, 2026", priority: "high" },
    ],
    milestones: [
      { id: "m1", title: "Phase 1: Requirements & Design", date: "Mar 30, 2026", status: "current" },
      { id: "m2", title: "Phase 2: Core Development", date: "Jul 30, 2026", status: "upcoming" },
      { id: "m3", title: "Phase 3: Integration Testing", date: "Dec 30, 2026", status: "upcoming" },
      { id: "m4", title: "Phase 4: Field Testing", date: "Apr 30, 2027", status: "upcoming" },
      { id: "m5", title: "Final Delivery", date: "Aug 15, 2027", status: "upcoming" },
    ],
    team: [
      { id: "tm1", name: "bsransom", role: "Program Manager", email: "bsransom@uci.edu", initials: "B" },
      { id: "tm2", name: "J. Martinez", role: "Lead Engineer", email: "j.martinez@leidos.com", initials: "JM" },
      { id: "tm3", name: "S. Chen", role: "Senior Developer", email: "s.chen@leidos.com", initials: "SC" },
      { id: "tm4", name: "A. Patel", role: "ML Engineer", email: "a.patel@leidos.com", initials: "AP" },
      { id: "tm5", name: "R. Kim", role: "Systems Engineer", email: "r.kim@leidos.com", initials: "RK" },
    ],
    activities: [
      { id: "a1", action: "Updated task 'Sensor Integration Framework' status to in-progress", user: "S. Chen", time: "2 hours ago" },
      { id: "a2", action: "Added milestone 'Phase 4: Field Testing'", user: "bsransom", time: "1 day ago" },
      { id: "a3", action: "Completed task 'System Architecture Design'", user: "J. Martinez", time: "2 days ago" },
      { id: "a4", action: "Budget report submitted for Q1 review", user: "bsransom", time: "3 days ago" },
      { id: "a5", action: "Added A. Patel to team", user: "bsransom", time: "5 days ago" },
    ],
  },
  proj2: {
    title: "Next-Gen C2 Decision Support",
    status: "on-track",
    description: "Building next-generation command and control decision support system with real-time intelligence fusion and AI-assisted operational planning capabilities.",
    startDate: "Jan 5, 2026",
    endDate: "Jun 30, 2027",
    progress: 35,
    budget: "$6,800,000",
    spent: "$2,380,000",
    solicitation: "DARPA-HR001126S0001",
    contractNumber: "W911NF-26-C-0087",
    tasks: [
      { id: "t1", title: "Data Fusion Architecture", status: "completed", assignee: "D. Roberts", dueDate: "Feb 15, 2026", priority: "high" },
      { id: "t2", title: "Decision Engine Core", status: "completed", assignee: "T. Nakamura", dueDate: "Mar 1, 2026", priority: "high" },
      { id: "t3", title: "UI/UX Prototype", status: "in-progress", assignee: "K. Lee", dueDate: "Mar 30, 2026", priority: "medium" },
      { id: "t4", title: "Real-time Data Pipeline", status: "in-progress", assignee: "V. Singh", dueDate: "Apr 15, 2026", priority: "high" },
      { id: "t5", title: "Simulation Environment", status: "pending", assignee: "P. Brown", dueDate: "May 30, 2026", priority: "medium" },
    ],
    milestones: [
      { id: "m1", title: "Phase 1: Foundation", date: "Feb 28, 2026", status: "completed" },
      { id: "m2", title: "Phase 2: Core Systems", date: "May 30, 2026", status: "current" },
      { id: "m3", title: "Phase 3: Integration", date: "Oct 30, 2026", status: "upcoming" },
      { id: "m4", title: "Final Delivery", date: "Jun 30, 2027", status: "upcoming" },
    ],
    team: [
      { id: "tm1", name: "bsransom", role: "Program Manager", email: "bsransom@uci.edu", initials: "B" },
      { id: "tm2", name: "D. Roberts", role: "Technical Lead", email: "d.roberts@leidos.com", initials: "DR" },
      { id: "tm3", name: "T. Nakamura", role: "AI Engineer", email: "t.nakamura@leidos.com", initials: "TN" },
      { id: "tm4", name: "K. Lee", role: "UX Designer", email: "k.lee@leidos.com", initials: "KL" },
    ],
    activities: [
      { id: "a1", action: "Completed milestone 'Phase 1: Foundation'", user: "D. Roberts", time: "4 days ago" },
      { id: "a2", action: "Started task 'UI/UX Prototype'", user: "K. Lee", time: "5 days ago" },
      { id: "a3", action: "Monthly progress report submitted", user: "bsransom", time: "1 week ago" },
    ],
  },
  proj3: {
    title: "SIGINT Processing Upgrade",
    status: "at-risk",
    description: "Modernization of signals intelligence processing pipeline with enhanced throughput and reduced latency for mission-critical operations.",
    startDate: "Oct 1, 2025",
    endDate: "Mar 31, 2026",
    progress: 72,
    budget: "$2,100,000",
    spent: "$1,890,000",
    solicitation: "BAA-2025-042",
    contractNumber: "N00014-25-C-0218",
    tasks: [
      { id: "t1", title: "Legacy System Analysis", status: "completed", assignee: "H. Foster", dueDate: "Nov 15, 2025", priority: "high" },
      { id: "t2", title: "New Pipeline Architecture", status: "completed", assignee: "H. Foster", dueDate: "Dec 30, 2025", priority: "high" },
      { id: "t3", title: "Data Migration", status: "in-progress", assignee: "C. Davis", dueDate: "Feb 28, 2026", priority: "high" },
      { id: "t4", title: "Performance Optimization", status: "blocked", assignee: "E. Thompson", dueDate: "Mar 15, 2026", priority: "high" },
      { id: "t5", title: "Acceptance Testing", status: "pending", assignee: "H. Foster", dueDate: "Mar 31, 2026", priority: "high" },
    ],
    milestones: [
      { id: "m1", title: "Analysis Complete", date: "Nov 30, 2025", status: "completed" },
      { id: "m2", title: "Architecture Approved", date: "Jan 15, 2026", status: "completed" },
      { id: "m3", title: "Migration Complete", date: "Mar 1, 2026", status: "current" },
      { id: "m4", title: "Final Delivery", date: "Mar 31, 2026", status: "upcoming" },
    ],
    team: [
      { id: "tm1", name: "bsransom", role: "Program Manager", email: "bsransom@uci.edu", initials: "B" },
      { id: "tm2", name: "H. Foster", role: "Lead Architect", email: "h.foster@leidos.com", initials: "HF" },
      { id: "tm3", name: "C. Davis", role: "Data Engineer", email: "c.davis@leidos.com", initials: "CD" },
    ],
    activities: [
      { id: "a1", action: "Flagged 'Performance Optimization' as blocked - pending hardware delivery", user: "E. Thompson", time: "1 day ago" },
      { id: "a2", action: "Budget overrun warning - 90% spent at 72% completion", user: "System", time: "2 days ago" },
    ],
  },
  proj4: {
    title: "Secure Mesh Networking",
    status: "completed",
    description: "Implementation of secure mesh networking protocol for tactical field communications with zero-trust architecture.",
    startDate: "Jun 1, 2025",
    endDate: "Dec 31, 2025",
    progress: 100,
    budget: "$1,500,000",
    spent: "$1,420,000",
    solicitation: "DARPA-BAA-25-08",
    contractNumber: "FA8702-25-C-0055",
    tasks: [],
    milestones: [
      { id: "m1", title: "Design Review", date: "Jul 15, 2025", status: "completed" },
      { id: "m2", title: "Prototype Delivery", date: "Sep 30, 2025", status: "completed" },
      { id: "m3", title: "Final Delivery", date: "Dec 31, 2025", status: "completed" },
    ],
    team: [
      { id: "tm1", name: "bsransom", role: "Program Manager", email: "bsransom@uci.edu", initials: "B" },
    ],
    activities: [
      { id: "a1", action: "Project completed and archived", user: "bsransom", time: "Jan 5, 2026" },
    ],
  },
};

const taskStatusIcon: Record<string, JSX.Element> = {
  completed: <CheckCircle2 className="w-4 h-4 text-green-600" />,
  "in-progress": <Clock className="w-4 h-4 text-blue-600" />,
  pending: <Circle className="w-4 h-4 text-gray-400" />,
  blocked: <AlertTriangle className="w-4 h-4 text-red-500" />,
};

const taskStatusLabel: Record<string, string> = {
  completed: "bg-green-50 text-green-700 border border-green-200",
  "in-progress": "bg-blue-50 text-blue-700 border border-blue-200",
  pending: "bg-gray-50 text-gray-500 border border-gray-200",
  blocked: "bg-red-50 text-red-700 border border-red-200",
};

const priorityLabel: Record<string, string> = {
  high: "text-red-600",
  medium: "text-amber-600",
  low: "text-gray-500",
};

const projectStatusColors: Record<string, string> = {
  active: "bg-blue-50 text-blue-700 border border-blue-200",
  "on-track": "bg-green-50 text-green-700 border border-green-200",
  "at-risk": "bg-red-50 text-red-700 border border-red-200",
  completed: "bg-gray-50 text-gray-600 border border-gray-200",
  planning: "bg-purple-50 text-purple-700 border border-purple-200",
};

type DetailTab = "tasks" | "milestones" | "team" | "activity";

export function ProjectDetailPage() {
  const { projectId } = useParams();
  const [activeTab, setActiveTab] = useState<DetailTab>("tasks");
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const project = projectsData[projectId || "proj1"];
  if (!project) {
    return (
      <div className="px-6 py-12 text-center">
        <p className="text-muted-foreground">Project not found.</p>
        <Link to="/" className="text-sm text-foreground underline mt-2 inline-block">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const tabs: { key: DetailTab; label: string; icon: typeof FileText }[] = [
    { key: "tasks", label: "Tasks", icon: CheckCircle2 },
    { key: "milestones", label: "Milestones", icon: Milestone },
    { key: "team", label: "Team", icon: Users },
    { key: "activity", label: "Activity", icon: MessageSquare },
  ];

  const taskCounts = {
    total: project.tasks.length,
    completed: project.tasks.filter((t) => t.status === "completed").length,
    inProgress: project.tasks.filter((t) => t.status === "in-progress").length,
    blocked: project.tasks.filter((t) => t.status === "blocked").length,
  };

  return (
    <div className="px-6 py-6 max-w-[1400px] mx-auto">
      {/* Back + Title */}
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="p-1 hover:bg-accent rounded transition-colors text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1>{project.title}</h1>
            <span className={`inline-block px-2.5 py-0.5 rounded text-xs ${projectStatusColors[project.status]}`}>
              {project.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{project.description}</p>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <Calendar className="w-3.5 h-3.5" />
            Timeline
          </div>
          <p className="text-sm">{project.startDate} &ndash; {project.endDate}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <DollarSign className="w-3.5 h-3.5" />
            Budget
          </div>
          <p className="text-sm">{project.budget}</p>
          <p className="text-xs text-muted-foreground mt-1">Spent: {project.spent}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <FileText className="w-3.5 h-3.5" />
            Contract
          </div>
          <p className="text-sm">{project.contractNumber}</p>
          <p className="text-xs text-muted-foreground mt-1">{project.solicitation}</p>
        </div>
        <div className="bg-white rounded-lg border border-border p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs mb-2">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Progress
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-black rounded-full" style={{ width: `${project.progress}%` }} />
            </div>
            <span className="text-sm">{project.progress}%</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors relative ${
              activeTab === tab.key
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {activeTab === tab.key && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black" />
            )}
          </button>
        ))}
      </div>

      {/* Tasks */}
      {activeTab === "tasks" && (
        <div className="bg-white rounded-lg border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3>Tasks</h3>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{taskCounts.completed}/{taskCounts.total} completed</span>
                <span>&middot;</span>
                <span>{taskCounts.inProgress} in progress</span>
                {taskCounts.blocked > 0 && (
                  <>
                    <span>&middot;</span>
                    <span className="text-red-500">{taskCounts.blocked} blocked</span>
                  </>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowAddTask(!showAddTask)}
              className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md text-sm hover:bg-gray-800 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Task
            </button>
          </div>
          {showAddTask && (
            <div className="p-5 border-b border-border bg-[#f8f8f8] flex items-center gap-3">
              <input
                type="text"
                placeholder="Enter task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-md text-sm bg-white focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button
                onClick={() => { setNewTaskTitle(""); setShowAddTask(false); }}
                className="px-4 py-2 bg-black text-white rounded-md text-sm hover:bg-gray-800 transition-colors"
              >
                Add
              </button>
              <button
                onClick={() => setShowAddTask(false)}
                className="px-4 py-2 border border-border rounded-md text-sm hover:bg-accent transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
          {project.tasks.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground w-8"></th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Task</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Status</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Assignee</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Priority</th>
                  <th className="text-left px-5 py-3 text-sm text-muted-foreground">Due Date</th>
                  <th className="text-right px-5 py-3 text-sm text-muted-foreground w-10"></th>
                </tr>
              </thead>
              <tbody>
                {project.tasks.map((task) => (
                  <tr key={task.id} className="border-b border-border last:border-b-0 hover:bg-[#f8f8f8] transition-colors">
                    <td className="pl-5 py-3">{taskStatusIcon[task.status]}</td>
                    <td className="px-5 py-3 text-sm">{task.title}</td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-xs ${taskStatusLabel[task.status]}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{task.assignee}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs ${priorityLabel[task.priority]}`}>{task.priority}</span>
                    </td>
                    <td className="px-5 py-3 text-sm text-muted-foreground">{task.dueDate}</td>
                    <td className="pr-5 py-3 text-right">
                      <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-muted-foreground text-sm">
              No tasks for this project.
            </div>
          )}
        </div>
      )}

      {/* Milestones */}
      {activeTab === "milestones" && (
        <div className="bg-white rounded-lg border border-border p-5">
          <h3 className="mb-5">Milestones</h3>
          <div className="relative">
            {project.milestones.map((milestone, index) => (
              <div key={milestone.id} className="flex items-start gap-4 mb-6 last:mb-0">
                {/* Timeline line */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      milestone.status === "completed"
                        ? "bg-green-100 text-green-600"
                        : milestone.status === "current"
                        ? "bg-black text-white"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {milestone.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <span className="text-xs">{index + 1}</span>
                    )}
                  </div>
                  {index < project.milestones.length - 1 && (
                    <div className="w-px h-8 bg-border mt-1" />
                  )}
                </div>
                <div className="pt-1">
                  <p className={`text-sm ${milestone.status === "completed" ? "text-muted-foreground line-through" : ""}`}>
                    {milestone.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{milestone.date}</p>
                </div>
                <div className="ml-auto pt-1">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded text-xs ${
                      milestone.status === "completed"
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : milestone.status === "current"
                        ? "bg-black text-white"
                        : "bg-gray-50 text-gray-500 border border-gray-200"
                    }`}
                  >
                    {milestone.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Team */}
      {activeTab === "team" && (
        <div className="bg-white rounded-lg border border-border">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3>Team Members</h3>
            <button className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md text-sm hover:bg-gray-800 transition-colors">
              <UserPlus className="w-3.5 h-3.5" />
              Add Member
            </button>
          </div>
          <div className="divide-y divide-border">
            {project.team.map((member) => (
              <div key={member.id} className="flex items-center justify-between px-5 py-4 hover:bg-[#f8f8f8] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-black text-white rounded-md flex items-center justify-center text-xs">
                    {member.initials}
                  </div>
                  <div>
                    <p className="text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-0.5 border border-border rounded text-muted-foreground">
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity */}
      {activeTab === "activity" && (
        <div className="bg-white rounded-lg border border-border p-5">
          <h3 className="mb-5">Recent Activity</h3>
          <div className="space-y-4">
            {project.activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-300 mt-2 shrink-0" />
                <div>
                  <p className="text-sm">{activity.action}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {activity.user} &middot; {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
