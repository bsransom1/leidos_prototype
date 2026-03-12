import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { DashboardPage } from "./components/DashboardPage";
import { CreateProposalPage } from "./components/CreateProposalPage";
import { ProjectDetailPage } from "./components/ProjectDetailPage";
import { ProjectManagementDashboard } from "./components/ProjectManagementDashboard";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: DashboardPage },
      { path: "create", Component: CreateProposalPage },
      { path: "proposal/:proposalId", Component: CreateProposalPage },
      { path: "project/:projectId", Component: ProjectDetailPage },
      { path: "projects", Component: ProjectManagementDashboard },
    ],
  },
]);
