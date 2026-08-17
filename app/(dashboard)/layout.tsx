import type { ReactNode } from "react";
import { DashboardShell } from "../components/layout/dashboard-shell";
import { ProjectPulseProvider } from "../providers/project-pulse-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ProjectPulseProvider><DashboardShell>{children}</DashboardShell></ProjectPulseProvider>;
}
