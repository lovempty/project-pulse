"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { api, authenticate, type AiResult, type AnalyticsData, type BoardData, type DashboardData, type Member, type Project, type Task, type User, type Workspace, type Workload } from "./lib/api";

type View =
  | "Overview"
  | "Projects"
  | "My Tasks"
  | "Board"
  | "Team"
  | "Analytics"
  | "AI Assistant";
type IconName =
  | "grid"
  | "folder"
  | "check"
  | "board"
  | "users"
  | "chart"
  | "spark"
  | "search"
  | "bell"
  | "plus"
  | "arrow"
  | "calendar"
  | "more"
  | "clock"
  | "trend"
  | "chevron"
  | "menu"
  | "close";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    folder: (
      <path d="M3 7.5V19a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7l-2-3H5a2 2 0 0 0-2 2Z" />
    ),
    check: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 2.5 2.5L16 9" />
      </>
    ),
    board: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16M15 4v16" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    chart: (
      <>
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </>
    ),
    spark: (
      <>
        <path d="m12 3-1.3 3.7L7 8l3.7 1.3L12 13l1.3-3.7L17 8l-3.7-1.3Z" />
        <path d="m19 14-.8 2.2L16 17l2.2.8L19 20l.8-2.2L22 17l-2.2-.8Z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    bell: (
      <>
        <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
        <path d="M10 21h4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    arrow: <path d="m9 18 6-6-6-6" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    trend: (
      <>
        <path d="m3 17 6-6 4 4 8-8" />
        <path d="M15 7h6v6" />
      </>
    ),
    chevron: <path d="m9 18 6-6-6-6" />,
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    close: <path d="m6 6 12 12M18 6 6 18" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {paths[name]}
    </svg>
  );
}

const nav: { label: View; icon: IconName }[] = [
  { label: "Overview", icon: "grid" },
  { label: "Projects", icon: "folder" },
  { label: "My Tasks", icon: "check" },
  { label: "Board", icon: "board" },
  { label: "Team", icon: "users" },
  { label: "Analytics", icon: "chart" },
  { label: "AI Assistant", icon: "spark" },
];

const initials = (name = "") => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const formatDate = (value?: string | null) => value ? new Intl.DateTimeFormat("en", { month: "short", day: "2-digit" }).format(new Date(value)) : "No date";
const statusLabel = (status: string) => status.replaceAll("_", " ");

function AvatarStack({ people }: { people: string[] }) {
  return (
    <div className="avatars">
      {people.map((p, i) => (
        <span key={p} style={{ zIndex: people.length - i }}>
          {p}
        </span>
      ))}
    </div>
  );
}

export default function Home() {
  const [view, setView] = useState<View>("Overview");
  const [range, setRange] = useState("This week");
  const [menuOpen, setMenuOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [workload, setWorkload] = useState<Workload[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState("");
  const [aiResult, setAiResult] = useState<AiResult | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true); setApiError("");
    try {
      const currentUser = await authenticate();
      const workspaces = await api.workspaces();
      const currentWorkspace = workspaces[0];
      if (!currentWorkspace) throw new Error("No workspace is available for this account.");
      const projectList = await api.projects(currentWorkspace.id);
      const [dashboardData, taskList, memberList, workloadData, analyticsData, boardData] = await Promise.all([
        api.dashboard(currentWorkspace.id), api.tasks(currentWorkspace.id), api.members(currentWorkspace.id), api.workload(currentWorkspace.id), api.analytics(currentWorkspace.id),
        projectList[0] ? api.board(currentWorkspace.id, projectList[0].id) : Promise.resolve(null),
      ]);
      setUser(currentUser); setWorkspace(currentWorkspace); setProjects(projectList); setDashboard(dashboardData); setTasks(taskList); setMembers(memberList); setWorkload(workloadData); setAnalytics(analyticsData); setBoard(boardData);
    } catch (error) { setApiError(error instanceof Error ? error.message : "Could not connect to ProjectPulse API."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { const timer = window.setTimeout(() => void loadData(), 0); return () => window.clearTimeout(timer); }, [loadData]);

  const greet = useMemo(
    () =>
      new Intl.DateTimeFormat("en", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()),
    [],
  );
  const notify = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2500);
  };
  const navigate = (item: View) => {
    setView(item);
    setMenuOpen(false);
  };
  const moveTask = async (task: Task, to: string) => {
    if (!workspace || !board) return;
    const previous = board;
    setBoard({ ...board, columns: board.columns.map((column) => ({ ...column, tasks: column.status === task.status ? column.tasks.filter((item) => item.id !== task.id) : column.status === to ? [...column.tasks, { ...task, status: to }] : column.tasks })) });
    try { await api.moveTask(workspace.id, task.id, to, board.columns.find((column) => column.status === to)?.tasks.length ?? 0); notify("Task moved successfully"); }
    catch (error) { setBoard(previous); notify(error instanceof Error ? error.message : "Unable to move task"); }
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <span>
            Project<span>Pulse</span>
          </span>
        </div>
        <button
          className="mobile-close"
          onClick={() => setMenuOpen(false)}
          aria-label="Close menu"
        >
          <Icon name="close" />
        </button>
        <div className="workspace">
          <span className="workspace-logo">A</span>
          <span>
            <small>WORKSPACE</small>
            <strong>{workspace?.name ?? "ProjectPulse"}</strong>
          </span>
          <Icon name="chevron" size={14} />
        </div>
        <nav>
          {nav.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.label)}
              className={view === item.label ? "active" : ""}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.label === "AI Assistant" && <b>AI</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade">
            <span>
              <Icon name="spark" size={16} />
            </span>
            <strong>Unlock more with Pro</strong>
            <p>Get unlimited projects and AI insights.</p>
            <button
              onClick={() => notify("Thanks! Pro plans are coming soon.")}
            >
              View plans
            </button>
          </div>
          <div className="user">
            <span className="avatar profile-avatar">{initials(user?.name)}</span>
            <span>
              <strong>{user?.name ?? "Loading account"}</strong>
              <small>{user?.jobTitle ?? "Team member"}</small>
            </span>
            <button>
              <Icon name="more" />
            </button>
          </div>
        </div>
      </aside>
      {menuOpen && (
        <button
          className="scrim"
          onClick={() => setMenuOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="main">
        <header>
          <button className="menu-button" onClick={() => setMenuOpen(true)}>
            <Icon name="menu" />
          </button>
          <div className="search">
            <Icon name="search" />
            <input
              aria-label="Search"
              placeholder="Search tasks, projects, or people..."
            />
            <kbd>⌘ K</kbd>
          </div>
          <button
            className="icon-button"
            onClick={() => notify("You're all caught up")}
          >
            <Icon name="bell" />
            <i />
          </button>
          <button className="primary" onClick={() => setModal(true)}>
            <Icon name="plus" /> New task
          </button>
        </header>

        {loading ? <div className="api-state"><span className="loader"/><h2>Connecting your workspace</h2><p>Loading live projects, tasks, and team activity…</p></div> : apiError ? <div className="api-state error-state"><Icon name="clock" size={28}/><h2>ProjectPulse API is unavailable</h2><p>{apiError}</p><button className="primary" onClick={() => void loadData()}>Try again</button><small>Confirm PostgreSQL is running and the API is ready at localhost:3001.</small></div> : view === "Overview" && dashboard ? (
          <Dashboard
            range={range}
            setRange={setRange}
            greet={greet}
            onView={navigate}
            dashboard={dashboard}
            userName={user?.name ?? "there"}
          />
        ) : view === "Board" || view === "My Tasks" ? (
          <Board
            view={view}
            board={board}
            tasks={tasks}
            moveTask={moveTask}
            onAdd={() => setModal(true)}
          />
        ) : view === "Projects" ? (
          <Projects projects={projects} onAdd={() => notify("New project flow opened")} />
        ) : view === "Team" ? (
          <Team members={members} workload={workload} />
        ) : view === "Analytics" ? (
          <Analytics analytics={analytics} />
        ) : (
          <Assistant result={aiResult} ask={async (intent) => { if (!workspace) return; try { setAiResult(await api.askAi(workspace.id, intent)); } catch (error) { notify(error instanceof Error ? error.message : "AI request failed"); } }} />
        )}
      </main>

      {modal && (
        <TaskModal
          close={() => setModal(false)}
          projects={projects}
          defaultProjectId={board?.project.id ?? projects[0]?.id}
          save={async (form) => { if (!workspace) return; try { await api.createTask(workspace.id, form); setModal(false); notify("Task created in To Do"); await loadData(); } catch (error) { notify(error instanceof Error ? error.message : "Unable to create task"); } }}
        />
      )}
      {toast && (
        <div className="toast">
          <span>✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

function Dashboard({
  range,
  setRange,
  greet,
  onView,
  dashboard,
  userName,
}: {
  range: string;
  setRange: (v: string) => void;
  greet: string;
  onView: (v: View) => void;
  dashboard: DashboardData;
  userName: string;
}) {
  const { metrics } = dashboard;
  const [renderedAt] = useState(() => Date.now());
  const trend = dashboard.projectCompletionTrend.length ? dashboard.projectCompletionTrend : [{ projectId: "empty", name: "No projects", progress: 0 }];
  const chartPoints = trend.map((item, index) => `${trend.length === 1 ? 310 : Math.round(index * 620 / (trend.length - 1))},${198 - Math.round(item.progress * 1.88)}`).join(" ");
  const stats = [
    {
      label: "Active projects",
      value: String(metrics.activeProjectCount),
      note: `${dashboard.activeProjects.filter((p) => p.dueDate).length} scheduled projects`,
      icon: "folder" as IconName,
      tone: "indigo",
    },
    {
      label: "Tasks completed",
      value: String(metrics.completedTaskCount),
      note: "Completed across workspace",
      icon: "check" as IconName,
      tone: "green",
    },
    {
      label: "Tasks overdue",
      value: String(metrics.overdueTaskCount),
      note: metrics.overdueTaskCount ? "Need attention" : "All tasks on track",
      icon: "clock" as IconName,
      tone: "red",
    },
    {
      label: "Team workload",
      value: `${metrics.teamWorkloadPercent}%`,
      note: metrics.teamWorkloadPercent > 85 ? "Near team capacity" : "Healthy capacity",
      icon: "users" as IconName,
      tone: "orange",
    },
  ];
  return (
    <div className="content">
      <section className="welcome">
        <div>
          <p>{greet}</p>
          <h1>
            Good morning, {userName.split(" ")[0]} <span>👋</span>
          </h1>
          <small>Here’s what’s happening with your projects today.</small>
        </div>
        <select value={range} onChange={(e) => setRange(e.target.value)}>
          <option>This week</option>
          <option>This month</option>
          <option>This quarter</option>
        </select>
      </section>
      <section className="stats">
        {stats.map((s) => (
          <article key={s.label}>
            <div className={`stat-icon ${s.tone}`}>
              <Icon name={s.icon} />
            </div>
            <div>
              <p>{s.label}</p>
              <strong>{s.value}</strong>
              <small
                className={
                  s.tone === "red"
                    ? "danger"
                    : s.tone === "green"
                      ? "positive"
                      : ""
                }
              >
                {s.tone === "green" && <Icon name="trend" size={13} />} {s.note}
              </small>
            </div>
          </article>
        ))}
      </section>
      <section className="top-grid">
        <div className="card progress-card">
          <CardTitle
            title="Project progress"
            subtitle="Completed tasks across all projects"
            action="View analytics"
            onClick={() => onView("Analytics")}
          />
          <div className="chart-wrap">
            <div className="chart-y">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>
            <svg
              className="line-chart"
              viewBox="0 0 620 210"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#625bf6" stopOpacity=".24" />
                  <stop offset="1" stopColor="#625bf6" stopOpacity="0" />
                </linearGradient>
              </defs>
              <g className="gridlines">
                <path d="M0 10H620M0 57H620M0 104H620M0 151H620M0 198H620" />
              </g>
              <polygon className="area" points={`0,198 ${chartPoints} 620,198`} />
              <polyline className="line" points={chartPoints} />
            </svg>
            <div className="chart-x">
              {trend.map((item) => <span key={item.projectId}>{item.name.split(" ")[0]}</span>)}
            </div>
          </div>
        </div>
        <div className="card workload">
          <CardTitle
            title="Team workload"
            subtitle="Tasks assigned this week"
            action="View team"
            onClick={() => onView("Team")}
          />
          {dashboard.teamWorkload.slice(0, 4).map((x, index) => (
            <div className="work-row" key={x.user.id}>
              <span className="avatar" style={{ background: ["#755cf6", "#3b82f6", "#22a778", "#f59e45"][index] }}>
                {initials(x.user.name)}
              </span>
              <div>
                <p>
                  <strong>{x.user.name}</strong>
                  <small>{x.openTasks} open</small>
                  <b>{x.workloadPercent}%</b>
                </p>
                <div className="meter">
                  <i style={{ width: `${x.workloadPercent}%`, background: ["#755cf6", "#3b82f6", "#22a778", "#f59e45"][index] }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="bottom-grid">
        <div className="card projects-card">
          <CardTitle
            title="Active projects"
            subtitle="Your most active projects"
            action="View all projects"
            onClick={() => onView("Projects")}
          />
          <div className="project-list">
            {dashboard.activeProjects.slice(0, 4).map((p, index) => (
              <div className="project-row" key={p.id}>
                <span className={`project-logo ${["purple", "orange", "blue", "green"][index % 4]}`}>{p.key}</span>
                <div className="project-name">
                  <strong>{p.name}</strong>
                  <small>
                    <Icon name="calendar" size={13} /> Due {formatDate(p.dueDate)}
                  </small>
                </div>
                <AvatarStack people={dashboard.teamWorkload.slice(0, 3).map((w) => initials(w.user.name))} />
                <div className="task-count">
                  <small>Tasks</small>
                  <b>{p.completedTasks ?? 0}/{p.totalTasks ?? p.taskCount ?? 0}</b>
                </div>
                <div className="project-progress">
                  <span>
                    <small>Progress</small>
                    <b>{p.progress}%</b>
                  </span>
                  <div className="meter">
                    <i style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
                <button>
                  <Icon name="more" />
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="card activity">
          <CardTitle
            title="Recent activity"
            action="View all"
            onClick={() => onView("My Tasks")}
          />
          {dashboard.recentActivity.slice(0, 4).map((x, i) => (
            <div className="activity-row" key={x.id}>
              <span className={`avatar ${["purple", "blue", "green", "orange"][i]}`}>{initials(x.actor.name)}</span>
              <div>
                <p><b>{x.actor.name}</b> {statusLabel(x.action).toLowerCase()} {x.task && <strong>{x.task.title}</strong>}</p>
                <small>{new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(Math.max(-30, Math.round((new Date(x.createdAt).getTime() - renderedAt) / 86400000)), "day")}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function CardTitle({
  title,
  subtitle,
  action,
  onClick,
}: {
  title: string;
  subtitle?: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <div className="card-title">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <button onClick={onClick}>
        {action}
        <Icon name="arrow" size={14} />
      </button>
    </div>
  );
}

function Board({
  view,
  board,
  tasks,
  moveTask,
  onAdd,
}: {
  view: View;
  board: BoardData | null;
  tasks: Task[];
  moveTask: (task: Task, to: string) => void;
  onAdd: () => void;
}) {
  const cols = view === "My Tasks" ? ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"].map((status) => ({ status, tasks: tasks.filter((task) => task.status === status) })) : board?.columns ?? [];
  return (
    <div className="content inner-page">
      <div className="page-heading">
        <div>
          <p>Workspace / {board?.project.key ?? "Project"}</p>
          <h1>{view === "My Tasks" ? "My tasks" : `${board?.project.name ?? "Project"} board`}</h1>
          <span>Keep work moving from idea to shipped.</span>
        </div>
        <button className="primary" onClick={onAdd}>
          <Icon name="plus" /> Add task
        </button>
      </div>
      <div className="kanban">
        {cols.map((col, ci) => (
          <section key={col.status}>
            <header>
              <span className={`dot d${ci}`} />
              <b>{statusLabel(col.status)}</b>
              <em>{col.tasks.length}</em>
              <button>
                <Icon name="more" />
              </button>
            </header>
            {col.tasks.map((task, i) => (
              <article key={task.id}>
                <span className={i % 2 ? "tag blue-tag" : "tag purple-tag"}>
                  {task.labels?.[0]?.label.name ?? task.priority}
                </span>
                <h3>{task.title}</h3>
                <p>{task.description || "No description added yet."}</p>
                <div>
                  <span className="avatar">{initials(task.assignee?.name ?? "Unassigned")}</span>
                  <small>
                    <Icon name="calendar" size={13} /> {formatDate(task.dueDate)}
                  </small>
                </div>
                {ci < cols.length - 1 && (
                  <button
                    className="move"
                    onClick={() => moveTask(task, cols[ci + 1].status)}
                  >
                    Move forward <Icon name="arrow" size={13} />
                  </button>
                )}
              </article>
            ))}
            <button className="add-card" onClick={onAdd}>
              <Icon name="plus" /> Add task
            </button>
          </section>
        ))}
      </div>
    </div>
  );
}

function Projects({ projects, onAdd }: { projects: Project[]; onAdd: () => void }) {
  return (
    <div className="content inner-page">
      <div className="page-heading">
        <div>
          <p>Workspace</p>
          <h1>Projects</h1>
          <span>Plan, track, and deliver your team’s most important work.</span>
        </div>
        <button className="primary" onClick={onAdd}>
          <Icon name="plus" /> New project
        </button>
      </div>
      <div className="project-gallery">
        {projects.map((p, index) => (
          <article className="card" key={p.id}>
            <div>
              <span className={`project-logo ${["purple", "orange", "blue", "green"][index % 4]}`}>{p.key}</span>
              <button>
                <Icon name="more" />
              </button>
            </div>
            <h2>{p.name}</h2>
            <p>{p.description || "Cross-functional project for this workspace."}</p>
            <div className="gallery-meta">
              <span>
                <Icon name="check" size={15} />
                {p.taskCount ?? 0} tasks
              </span>
              <span>
                <Icon name="calendar" size={15} />
                {formatDate(p.dueDate)}
              </span>
            </div>
            <div className="gallery-progress">
              <span>
                <b>{p.progress}%</b> complete
              </span>
              <span className="project-status">{statusLabel(p.status)}</span>
            </div>
            <div className="meter">
              <i style={{ width: `${p.progress}%` }} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function Team({ members, workload }: { members: Member[]; workload: Workload[] }) {
  return (
    <div className="content inner-page">
      <div className="page-heading">
        <div>
          <p>Acme Studio</p>
          <h1>Team</h1>
          <span>Balance workload and keep everyone moving together.</span>
        </div>
        <button className="primary">
          <Icon name="plus" /> Invite member
        </button>
      </div>
      <div className="team-grid">
        {members.map((member, i) => {
          const load = workload.find((item) => item.user.id === member.user.id);
          return <article className="card" key={member.id}>
            <span className={`avatar big c${i}`}>
              {initials(member.user.name)}
            </span>
            <h3>{member.user.name}</h3>
            <p>{member.user.jobTitle || statusLabel(member.role)}</p>
            <div className="capacity">
              <span>
                <b>{load?.openTasks ?? 0}</b> assigned
              </span>
              <span>
                <b>{member.role}</b> role
              </span>
            </div>
            <div className="meter">
              <i style={{ width: `${load?.workloadPercent ?? 0}%` }} />
            </div>
            <small>{load?.workloadPercent ?? 0}% capacity</small>
          </article>;
        })}
      </div>
    </div>
  );
}

function Analytics({ analytics }: { analytics: AnalyticsData | null }) {
  const statusData = analytics?.tasksByStatus ?? [];
  const total = statusData.reduce((sum, item) => sum + item.count, 0);
  const trend = (analytics?.completionTrend ?? []).slice(-12);
  return (
    <div className="content inner-page">
      <div className="page-heading">
        <div>
          <p>Reporting</p>
          <h1>Analytics</h1>
          <span>Performance signals across your workspace.</span>
        </div>
        <select>
          <option>Last 30 days</option>
          <option>Last quarter</option>
        </select>
      </div>
      <div className="analytics-grid">
        <div className="card big-analytic">
          <CardTitle
            title="Completion trend"
            subtitle="Tasks completed over time"
            action="Export"
            onClick={() => {}}
          />
          <div className="bars">
            {(trend.length ? trend : [{date:new Date().toISOString(),count:0}]).map((item, i) => (
              <i key={`${item.date}-${i}`} style={{ height: `${Math.max(8, Math.min(100, item.count * 25))}%` }}>
                <span>{new Date(item.date).getDate()}</span>
              </i>
            ))}
          </div>
        </div>
        <div className="card status-card">
          <h2>Tasks by status</h2>
          <div className="donut">
            <span>
              <b>{total}</b>
              <small>Total tasks</small>
            </span>
          </div>
          {statusData.map((item, index) => (
            <p key={item.name}>
              <i style={{ background: ["#625bf6", "#3985ed", "#f2a94a", "#ee6872", "#22a778"][index % 5] }} />
              {statusLabel(item.name)}
              <b>{total ? Math.round(item.count / total * 100) : 0}%</b>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function Assistant({ result, ask: askApi }: { result: AiResult | null; ask: (intent: string) => Promise<void> }) {
  const setAnswer = (text: string) => void askApi(text.startsWith("Three") ? "IDENTIFY_RISKS" : text.startsWith("Prioritize") ? "RECOMMEND_PRIORITIES" : text.startsWith("This week") ? "GENERATE_WEEKLY_UPDATE" : "SUMMARIZE_PROGRESS");
  const prompts = [
    "Summarize this week's progress",
    "Which tasks are at risk?",
    "What should the team prioritize?",
    "Generate a weekly project update",
  ];
  const ask = (p: string) =>
    setAnswer(
      p.includes("risk")
        ? "Three tasks are at risk: Analytics dashboard, pricing copy, and mobile navigation QA. Each is blocked or due within 48 hours."
        : p.includes("prioritize")
          ? "Prioritize mobile navigation QA first, then unblock analytics data validation. Both affect the September 18 release milestone."
          : p.includes("weekly")
            ? "This week, the team completed 24 tasks and advanced Mobile App Redesign to 78%. Next week’s focus is release QA and resolving 3 at-risk items."
            : "The team completed 24 tasks this week, up 12.5%. Mobile App Redesign made the strongest progress and two deliverables moved into review.",
    );
  return (
    <div className="content inner-page assistant-page">
      <div className="ai-hero">
        <span>
          <Icon name="spark" size={26} />
        </span>
        <p>AI PROJECT ASSISTANT</p>
        <h1>Turn project data into clear decisions.</h1>
        <small>
          Ask about progress, risks, workload, or what your team should focus on
          next.
        </small>
      </div>
      <div className="prompt-grid">
        {prompts.map((p) => (
          <button key={p} onClick={() => ask(p)}>
            <span>
              <Icon name="spark" size={17} />
            </span>
            {p}
            <Icon name="arrow" size={15} />
          </button>
        ))}
      </div>
      <div className="ai-response">
        <div className="ai-response-header">
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <b>Pulse insight</b>
          <small>Based on live workspace data</small>
        </div>
        <p>{result?.summary ?? "Choose a question above to analyze your live workspace data."}</p>
        {result && <div className="ai-details"><span><b>Highlights</b>{result.highlights.join(" · ")}</span><span><b>Risks</b>{result.risks.join(" · ")}</span><span><b>Next actions</b>{result.recommendedActions.join(" · ")}</span></div>}
        <footer>
          <button>Copy</button>
          <button>Regenerate</button>
        </footer>
      </div>
    </div>
  );
}

function TaskModal({
  close,
  save,
  projects,
  defaultProjectId,
}: {
  close: () => void;
  save: (form: { projectId: string; title: string; description?: string; status: string; priority: string }) => Promise<void>;
  projects: Project[];
  defaultProjectId?: string;
}) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [status, setStatus] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim() && projectId) void save({ projectId, title: title.trim(), description: description.trim() || undefined, status, priority });
  };
  return (
    <div className="modal-backdrop" onMouseDown={close}>
      <form
        className="modal"
        onSubmit={submit}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <h2>Create a new task</h2>
            <p>Add work to the Product launch board.</p>
          </div>
          <button type="button" onClick={close}>
            <Icon name="close" />
          </button>
        </header>
        <label>
          Task name
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Review mobile onboarding"
          />
        </label>
        <label>Project<select value={projectId} onChange={(e) => setProjectId(e.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <div className="form-row">
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="BACKLOG">Backlog</option><option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="REVIEW">Review</option>
            </select>
          </label>
          <label>
            Priority
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option><option value="LOW">Low</option>
            </select>
          </label>
        </div>
        <label>
          Description
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add context or acceptance criteria..." />
        </label>
        <footer>
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={!title.trim() || !projectId}>
            Create task
          </button>
        </footer>
      </form>
    </div>
  );
}
