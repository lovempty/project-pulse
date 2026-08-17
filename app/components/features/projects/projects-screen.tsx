"use client";

import { useProjectPulse } from "../../../providers/project-pulse-provider";
import { formatDate, statusLabel } from "../../../lib/format";
import { Icon } from "../../ui/glyph";

export function ProjectsScreen() {
  const { projects, notify } = useProjectPulse();
  return (
    <div className="content inner-page">
      <div className="page-heading"><div><p>Workspace</p><h1>Projects</h1><span>Plan, track, and deliver your team’s most important work.</span></div><button className="primary" onClick={() => notify("New project flow opened")}><Icon name="plus"/> New project</button></div>
      <div className="project-gallery">{projects.map((project, index) => <article className="card" key={project.id}><div><span className={`project-logo ${["purple", "orange", "blue", "green"][index % 4]}`}>{project.key}</span><button aria-label={`More options for ${project.name}`}><Icon name="more"/></button></div><h2>{project.name}</h2><p>{project.description || "Cross-functional project for this workspace."}</p><div className="gallery-meta"><span><Icon name="check" size={15}/>{project.taskCount ?? 0} tasks</span><span><Icon name="calendar" size={15}/>{formatDate(project.dueDate)}</span></div><div className="gallery-progress"><span><b>{project.progress}%</b> complete</span><span className="project-status">{statusLabel(project.status)}</span></div><div className="meter"><i style={{ width: `${project.progress}%` }}/></div></article>)}</div>
    </div>
  );
}
