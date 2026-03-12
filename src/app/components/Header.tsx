import { FileText, LogOut, LayoutDashboard, FolderKanban } from "lucide-react";
import { Link, useLocation } from "react-router";

export function Header() {
  const location = useLocation();
  const isProjects = location.pathname.startsWith("/projects") || location.pathname.startsWith("/project/");

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b border-border bg-white">
      <div className="flex items-center gap-6">
        <Link to="/" className="flex items-center gap-3 no-underline">
          <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="text-foreground leading-tight">BAA/RFP Proposal System</h4>
            <p className="text-muted-foreground text-sm leading-tight">Leidos GenAI &middot; Internal Use</p>
          </div>
        </Link>
        <nav className="hidden md:flex items-center gap-1 ml-4">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm no-underline transition-colors ${
              !isProjects ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            Proposals
          </Link>
          <Link
            to="/projects"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm no-underline transition-colors ${
              isProjects ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5" />
            Projects
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">bsransom@uci.edu</span>
        <button className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-md hover:bg-accent transition-colors">
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </header>
  );
}