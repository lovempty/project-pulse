"use client";

import { FormEvent, useMemo, useState } from "react";

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

const projects = [
  {
    name: "Mobile App Redesign",
    code: "MAR",
    color: "purple",
    progress: 78,
    tasks: "24/31",
    due: "Sep 18",
    members: ["AK", "JL", "RM"],
  },
  {
    name: "Q3 Marketing Campaign",
    code: "Q3",
    color: "orange",
    progress: 62,
    tasks: "18/29",
    due: "Sep 24",
    members: ["NS", "AK", "DB"],
  },
  {
    name: "API v2.0",
    code: "API",
    color: "blue",
    progress: 45,
    tasks: "14/32",
    due: "Oct 02",
    members: ["JL", "RM", "CH"],
  },
];

const initialBoard = {
  "TO DO": ["Create onboarding empty states", "Finalize pricing copy"],
  "IN PROGRESS": ["Build analytics dashboard", "Mobile navigation QA"],
  REVIEW: ["Workspace invite flow"],
  DONE: ["Design system tokens", "Project overview API"],
};

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
  const [board, setBoard] = useState(initialBoard);
  const [aiAnswer, setAiAnswer] = useState(
    "Your workspace is moving steadily. Mobile App Redesign leads at 78%, while 3 tasks need attention before Friday.",
  );

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
  const moveTask = (
    task: string,
    from: keyof typeof board,
    to: keyof typeof board,
  ) =>
    setBoard((prev) => ({
      ...prev,
      [from]: prev[from].filter((t) => t !== task),
      [to]: [...prev[to], task],
    }));

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
            <strong>Acme Studio</strong>
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
            <span className="avatar profile-avatar">AR</span>
            <span>
              <strong>Alex Rivera</strong>
              <small>Product Manager</small>
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

        {view === "Overview" ? (
          <Dashboard
            range={range}
            setRange={setRange}
            greet={greet}
            onView={navigate}
          />
        ) : view === "Board" || view === "My Tasks" ? (
          <Board
            view={view}
            board={board}
            moveTask={moveTask}
            onAdd={() => setModal(true)}
          />
        ) : view === "Projects" ? (
          <Projects onAdd={() => notify("New project flow opened")} />
        ) : view === "Team" ? (
          <Team />
        ) : view === "Analytics" ? (
          <Analytics />
        ) : (
          <Assistant answer={aiAnswer} setAnswer={setAiAnswer} />
        )}
      </main>

      {modal && (
        <TaskModal
          close={() => setModal(false)}
          save={(title) => {
            setBoard((p) => ({ ...p, "TO DO": [...p["TO DO"], title] }));
            setModal(false);
            notify("Task created in To Do");
          }}
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
}: {
  range: string;
  setRange: (v: string) => void;
  greet: string;
  onView: (v: View) => void;
}) {
  const stats = [
    {
      label: "Active projects",
      value: "8",
      note: "2 due this month",
      icon: "folder" as IconName,
      tone: "indigo",
    },
    {
      label: "Tasks completed",
      value: "124",
      note: "12.5% from last week",
      icon: "check" as IconName,
      tone: "green",
    },
    {
      label: "Tasks overdue",
      value: "7",
      note: "3 need attention",
      icon: "clock" as IconName,
      tone: "red",
    },
    {
      label: "Team workload",
      value: "82%",
      note: "Healthy capacity",
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
            Good morning, Alex <span>👋</span>
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
              <path
                className="area"
                d="M0 166 C50 161 64 140 103 145 S160 116 207 122 S265 80 310 91 S365 72 414 77 S470 48 517 54 S574 23 620 30 L620 200 L0 200Z"
              />
              <path
                className="line"
                d="M0 166 C50 161 64 140 103 145 S160 116 207 122 S265 80 310 91 S365 72 414 77 S470 48 517 54 S574 23 620 30"
              />
            </svg>
            <div className="chart-x">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
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
          {[
            { n: "Nina S.", r: "Designer", v: 92, c: "#755cf6", a: "NS" },
            { n: "James L.", r: "Developer", v: 84, c: "#3b82f6", a: "JL" },
            { n: "Rina M.", r: "Developer", v: 76, c: "#22a778", a: "RM" },
            { n: "David B.", r: "Marketing", v: 65, c: "#f59e45", a: "DB" },
          ].map((x) => (
            <div className="work-row" key={x.n}>
              <span className="avatar" style={{ background: x.c }}>
                {x.a}
              </span>
              <div>
                <p>
                  <strong>{x.n}</strong>
                  <small>{x.r}</small>
                  <b>{x.v}%</b>
                </p>
                <div className="meter">
                  <i style={{ width: `${x.v}%`, background: x.c }} />
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
            {projects.map((p) => (
              <div className="project-row" key={p.name}>
                <span className={`project-logo ${p.color}`}>{p.code}</span>
                <div className="project-name">
                  <strong>{p.name}</strong>
                  <small>
                    <Icon name="calendar" size={13} /> Due {p.due}
                  </small>
                </div>
                <AvatarStack people={p.members} />
                <div className="task-count">
                  <small>Tasks</small>
                  <b>{p.tasks}</b>
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
          {[
            {
              a: "NS",
              c: "purple",
              text: (
                <>
                  <b>Nina</b> completed <strong>Homepage wireframes</strong>
                </>
              ),
              t: "12 min ago",
            },
            {
              a: "JL",
              c: "blue",
              text: (
                <>
                  <b>James</b> commented on <strong>API authentication</strong>
                </>
              ),
              t: "34 min ago",
            },
            {
              a: "RM",
              c: "green",
              text: (
                <>
                  <b>Rina</b> moved <strong>Checkout flow</strong> to Review
                </>
              ),
              t: "1 hr ago",
            },
            {
              a: "DB",
              c: "orange",
              text: (
                <>
                  <b>David</b> created <strong>Campaign assets</strong>
                </>
              ),
              t: "2 hrs ago",
            },
          ].map((x, i) => (
            <div className="activity-row" key={i}>
              <span className={`avatar ${x.c}`}>{x.a}</span>
              <div>
                <p>{x.text}</p>
                <small>{x.t}</small>
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
  moveTask,
  onAdd,
}: {
  view: View;
  board: typeof initialBoard;
  moveTask: (t: string, f: keyof typeof board, to: keyof typeof board) => void;
  onAdd: () => void;
}) {
  const cols = Object.keys(board) as (keyof typeof board)[];
  return (
    <div className="content inner-page">
      <div className="page-heading">
        <div>
          <p>Workspace / Product</p>
          <h1>{view === "My Tasks" ? "My tasks" : "Product launch board"}</h1>
          <span>Keep work moving from idea to shipped.</span>
        </div>
        <button className="primary" onClick={onAdd}>
          <Icon name="plus" /> Add task
        </button>
      </div>
      <div className="kanban">
        {cols.map((col, ci) => (
          <section key={col}>
            <header>
              <span className={`dot d${ci}`} />
              <b>{col}</b>
              <em>{board[col].length}</em>
              <button>
                <Icon name="more" />
              </button>
            </header>
            {board[col].map((task, i) => (
              <article key={task}>
                <span className={i % 2 ? "tag blue-tag" : "tag purple-tag"}>
                  {i % 2 ? "PRODUCT" : "DESIGN"}
                </span>
                <h3>{task}</h3>
                <p>
                  Make the experience clear, consistent, and ready for release.
                </p>
                <div>
                  <span className="avatar">{["NS", "JL", "RM"][i % 3]}</span>
                  <small>
                    <Icon name="calendar" size={13} /> Sep {16 + i}
                  </small>
                </div>
                {ci < cols.length - 1 && (
                  <button
                    className="move"
                    onClick={() => moveTask(task, col, cols[ci + 1])}
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

function Projects({ onAdd }: { onAdd: () => void }) {
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
        {[
          ...projects,
          {
            name: "Customer Portal",
            code: "CP",
            color: "green",
            progress: 31,
            tasks: "9/28",
            due: "Oct 12",
            members: ["NS", "DB"],
          },
        ].map((p) => (
          <article className="card" key={p.name}>
            <div>
              <span className={`project-logo ${p.color}`}>{p.code}</span>
              <button>
                <Icon name="more" />
              </button>
            </div>
            <h2>{p.name}</h2>
            <p>Cross-functional project for the Acme Studio workspace.</p>
            <div className="gallery-meta">
              <span>
                <Icon name="check" size={15} />
                {p.tasks} tasks
              </span>
              <span>
                <Icon name="calendar" size={15} />
                {p.due}
              </span>
            </div>
            <div className="gallery-progress">
              <span>
                <b>{p.progress}%</b> complete
              </span>
              <AvatarStack people={p.members} />
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

function Team() {
  const people = [
    "Nina Singh",
    "James Lee",
    "Rina Matsuda",
    "David Brooks",
    "Chloe Hart",
    "Alex Rivera",
  ];
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
        {people.map((n, i) => (
          <article className="card" key={n}>
            <span className={`avatar big c${i}`}>
              {n
                .split(" ")
                .map((x) => x[0])
                .join("")}
            </span>
            <h3>{n}</h3>
            <p>
              {i % 3 === 0
                ? "Product Manager"
                : i % 3 === 1
                  ? "Product Designer"
                  : "Software Engineer"}
            </p>
            <div className="capacity">
              <span>
                <b>{[18, 16, 14, 13, 11, 9][i]}</b> assigned
              </span>
              <span>
                <b>{[4, 6, 3, 5, 2, 4][i]}</b> completed
              </span>
            </div>
            <div className="meter">
              <i style={{ width: `${[86, 78, 69, 64, 55, 48][i]}%` }} />
            </div>
            <small>{[86, 78, 69, 64, 55, 48][i]}% capacity</small>
          </article>
        ))}
      </div>
    </div>
  );
}

function Analytics() {
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
            {[42, 58, 49, 72, 66, 84, 91, 76, 88, 96, 82, 100].map((h, i) => (
              <i key={i} style={{ height: `${h}%` }}>
                <span>{14 + i}</span>
              </i>
            ))}
          </div>
        </div>
        <div className="card status-card">
          <h2>Tasks by status</h2>
          <div className="donut">
            <span>
              <b>124</b>
              <small>Total tasks</small>
            </span>
          </div>
          {[
            ["Completed", 48, "#625bf6"],
            ["In progress", 27, "#3985ed"],
            ["To do", 18, "#f2a94a"],
            ["Overdue", 7, "#ee6872"],
          ].map((x) => (
            <p key={x[0]}>
              <i style={{ background: x[2] as string }} />
              {x[0]}
              <b>{x[1]}%</b>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function Assistant({
  answer,
  setAnswer,
}: {
  answer: string;
  setAnswer: (s: string) => void;
}) {
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
        <div>
          <span className="brand-mark">
            <i />
            <i />
            <i />
          </span>
          <b>Pulse insight</b>
          <small>Based on live workspace data</small>
        </div>
        <p>{answer}</p>
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
}: {
  close: () => void;
  save: (s: string) => void;
}) {
  const [title, setTitle] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (title.trim()) save(title.trim());
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
        <div className="form-row">
          <label>
            Status
            <select>
              <option>To Do</option>
              <option>In Progress</option>
            </select>
          </label>
          <label>
            Priority
            <select>
              <option>Medium</option>
              <option>High</option>
              <option>Low</option>
            </select>
          </label>
        </div>
        <label>
          Description
          <textarea placeholder="Add context or acceptance criteria..." />
        </label>
        <footer>
          <button type="button" className="secondary" onClick={close}>
            Cancel
          </button>
          <button className="primary" disabled={!title.trim()}>
            Create task
          </button>
        </footer>
      </form>
    </div>
  );
}
