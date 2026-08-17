"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useProjectPulse } from "../../../providers/project-pulse-provider";
import { formatDate, initials, relativeDay, statusLabel } from "../../../lib/format";
import { AvatarStack } from "../../ui/avatar-stack";
import { CardTitle } from "../../ui/card-title";
import { Icon, type IconName } from "../../ui/glyph";

export function OverviewScreen() {
  const router = useRouter();
  const { dashboard, user } = useProjectPulse();
  const [range, setRange] = useState("This week");
  const [renderedAt] = useState(() => Date.now());
  const today = useMemo(() => new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date()), []);
  if (!dashboard) return null;

  const { metrics } = dashboard;
  const trend = dashboard.projectCompletionTrend.length ? dashboard.projectCompletionTrend : [{ projectId: "empty", name: "No projects", progress: 0 }];
  const points = trend.map((item, index) => `${trend.length === 1 ? 310 : Math.round(index * 620 / (trend.length - 1))},${198 - Math.round(item.progress * 1.88)}`).join(" ");
  const stats = [
    { label: "Active projects", value: String(metrics.activeProjectCount), note: `${dashboard.activeProjects.filter((project) => project.dueDate).length} scheduled projects`, icon: "folder" as IconName, tone: "indigo" },
    { label: "Tasks completed", value: String(metrics.completedTaskCount), note: "Completed across workspace", icon: "check" as IconName, tone: "green" },
    { label: "Tasks overdue", value: String(metrics.overdueTaskCount), note: metrics.overdueTaskCount ? "Need attention" : "All tasks on track", icon: "clock" as IconName, tone: "red" },
    { label: "Team workload", value: `${metrics.teamWorkloadPercent}%`, note: metrics.teamWorkloadPercent > 85 ? "Near team capacity" : "Healthy capacity", icon: "users" as IconName, tone: "orange" },
  ];

  return (
    <div className="content">
      <section className="welcome">
        <div><p>{today}</p><h1>Good morning, {user?.name.split(" ")[0] ?? "there"} <span>👋</span></h1><small>Here’s what’s happening with your projects today.</small></div>
        <select value={range} onChange={(event) => setRange(event.target.value)}><option>This week</option><option>This month</option><option>This quarter</option></select>
      </section>

      <section className="stats">{stats.map((stat) => <article key={stat.label}><div className={`stat-icon ${stat.tone}`}><Icon name={stat.icon}/></div><div><p>{stat.label}</p><strong>{stat.value}</strong><small className={stat.tone === "red" ? "danger" : stat.tone === "green" ? "positive" : ""}>{stat.tone === "green" && <Icon name="trend" size={13}/>} {stat.note}</small></div></article>)}</section>

      <section className="top-grid">
        <div className="card progress-card">
          <CardTitle title="Project progress" subtitle="Completed tasks across all projects" action="View analytics" onClick={() => router.push("/analytics")}/>
          <div className="chart-wrap">
            <div className="chart-y"><span>100</span><span>75</span><span>50</span><span>25</span><span>0</span></div>
            <svg className="line-chart" viewBox="0 0 620 210" preserveAspectRatio="none"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#625bf6" stopOpacity=".24"/><stop offset="1" stopColor="#625bf6" stopOpacity="0"/></linearGradient></defs><g className="gridlines"><path d="M0 10H620M0 57H620M0 104H620M0 151H620M0 198H620"/></g><polygon className="area" points={`0,198 ${points} 620,198`}/><polyline className="line" points={points}/></svg>
            <div className="chart-x">{trend.map((item) => <span key={item.projectId}>{item.name.split(" ")[0]}</span>)}</div>
          </div>
        </div>
        <div className="card workload">
          <CardTitle title="Team workload" subtitle="Tasks currently assigned" action="View team" onClick={() => router.push("/team")}/>
          {dashboard.teamWorkload.slice(0, 4).map((item, index) => <div className="work-row" key={item.user.id}><span className="avatar" style={{ background: ["#755cf6", "#3b82f6", "#22a778", "#f59e45"][index] }}>{initials(item.user.name)}</span><div><p><strong>{item.user.name}</strong><small>{item.openTasks} open</small><b>{item.workloadPercent}%</b></p><div className="meter"><i style={{ width: `${item.workloadPercent}%`, background: ["#755cf6", "#3b82f6", "#22a778", "#f59e45"][index] }}/></div></div></div>)}
        </div>
      </section>

      <section className="bottom-grid">
        <div className="card projects-card">
          <CardTitle title="Active projects" subtitle="Your most active projects" action="View all projects" onClick={() => router.push("/projects")}/>
          <div className="project-list">{dashboard.activeProjects.slice(0, 4).map((project, index) => <div className="project-row" key={project.id}><span className={`project-logo ${["purple", "orange", "blue", "green"][index % 4]}`}>{project.key}</span><div className="project-name"><strong>{project.name}</strong><small><Icon name="calendar" size={13}/> Due {formatDate(project.dueDate)}</small></div><AvatarStack people={dashboard.teamWorkload.slice(0, 3).map((item) => initials(item.user.name))}/><div className="task-count"><small>Tasks</small><b>{project.completedTasks ?? 0}/{project.totalTasks ?? project.taskCount ?? 0}</b></div><div className="project-progress"><span><small>Progress</small><b>{project.progress}%</b></span><div className="meter"><i style={{ width: `${project.progress}%` }}/></div></div><button aria-label={`More options for ${project.name}`}><Icon name="more"/></button></div>)}</div>
        </div>
        <div className="card activity">
          <CardTitle title="Recent activity" action="View tasks" onClick={() => router.push("/tasks")}/>
          {dashboard.recentActivity.slice(0, 4).map((activity, index) => <div className="activity-row" key={activity.id}><span className={`avatar ${["purple", "blue", "green", "orange"][index]}`}>{initials(activity.actor.name)}</span><div><p><b>{activity.actor.name}</b> {statusLabel(activity.action).toLowerCase()} {activity.task && <strong>{activity.task.title}</strong>}</p><small>{relativeDay(activity.createdAt, renderedAt)}</small></div></div>)}
        </div>
      </section>
    </div>
  );
}
