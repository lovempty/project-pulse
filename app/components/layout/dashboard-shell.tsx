"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useProjectPulse } from "../../providers/project-pulse-provider";
import { initials } from "../../lib/format";
import { Icon, type IconName } from "../ui/glyph";
import { TaskModal } from "../tasks/task-modal";

const navigation: { label: string; href: string; icon: IconName }[] = [
  { label: "Overview", href: "/overview", icon: "grid" },
  { label: "Projects", href: "/projects", icon: "folder" },
  { label: "My Tasks", href: "/tasks", icon: "check" },
  { label: "Board", href: "/board", icon: "board" },
  { label: "Team", href: "/team", icon: "users" },
  { label: "Analytics", href: "/analytics", icon: "chart" },
  { label: "AI Assistant", href: "/assistant", icon: "spark" },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, workspace, projects, board, loading, error, taskModalOpen, toast, openTaskModal, closeTaskModal, createTask, notify, reload } = useProjectPulse();

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <Link href="/overview" className="brand" onClick={() => setMenuOpen(false)}><span className="brand-mark"><i/><i/><i/></span><span>Project<span>Pulse</span></span></Link>
        <button className="mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><Icon name="close"/></button>
        <div className="workspace"><span className="workspace-logo">{initials(workspace?.name || "P")}</span><span><small>WORKSPACE</small><strong>{workspace?.name ?? "ProjectPulse"}</strong></span><Icon name="chevron" size={14}/></div>
        <nav>{navigation.map((item) => <Link key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className={pathname === item.href ? "active" : ""}><Icon name={item.icon}/><span>{item.label}</span>{item.href === "/assistant" && <b>AI</b>}</Link>)}</nav>
        <div className="sidebar-bottom">
          <div className="upgrade"><span><Icon name="spark" size={16}/></span><strong>Unlock more with Pro</strong><p>Get unlimited projects and AI insights.</p><button onClick={() => notify("Thanks! Pro plans are coming soon.")}>View plans</button></div>
          <div className="user"><span className="avatar profile-avatar">{initials(user?.name)}</span><span><strong>{user?.name ?? "Loading account"}</strong><small>{user?.jobTitle ?? "Team member"}</small></span><button aria-label="User menu"><Icon name="more"/></button></div>
        </div>
      </aside>
      {menuOpen && <button className="scrim" onClick={() => setMenuOpen(false)} aria-label="Close navigation"/>}

      <main className="main">
        <header>
          <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Icon name="menu"/></button>
          <div className="search"><Icon name="search"/><input aria-label="Search" placeholder="Search tasks, projects, or people..."/><kbd>⌘ K</kbd></div>
          <button className="icon-button" onClick={() => notify("You're all caught up")} aria-label="Notifications"><Icon name="bell"/><i/></button>
          <button className="primary" onClick={openTaskModal}><Icon name="plus"/> New task</button>
        </header>
        {loading ? <LoadingState/> : error ? <ErrorState message={error} retry={reload}/> : children}
      </main>

      {taskModalOpen && <TaskModal projects={projects} defaultProjectId={board?.project.id ?? projects[0]?.id} onClose={closeTaskModal} onSave={createTask}/>} 
      {toast && <div className="toast" role="status"><span>✓</span>{toast}</div>}
    </div>
  );
}

function LoadingState() {
  return <div className="api-state"><span className="loader"/><h2>Connecting your workspace</h2><p>Loading live projects, tasks, and team activity…</p></div>;
}

function ErrorState({ message, retry }: { message: string; retry: () => Promise<void> }) {
  return <div className="api-state error-state"><Icon name="clock" size={28}/><h2>ProjectPulse API is unavailable</h2><p>{message}</p><button className="primary" onClick={() => void retry()}>Try again</button><small>Confirm PostgreSQL is running and the API is ready at localhost:3001.</small></div>;
}
