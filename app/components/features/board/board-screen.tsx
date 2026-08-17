"use client";

import { useProjectPulse } from "../../../providers/project-pulse-provider";
import { formatDate, initials, statusLabel } from "../../../lib/format";
import { Icon } from "../../ui/glyph";

const statuses = ["BACKLOG", "TODO", "IN_PROGRESS", "REVIEW", "DONE"];

export function BoardScreen({ personal = false }: { personal?: boolean }) {
  const { board, tasks, openTaskModal, moveTask } = useProjectPulse();
  const columns = personal
    ? statuses.map((status) => ({ status, tasks: tasks.filter((task) => task.status === status) }))
    : board?.columns ?? [];

  return (
    <div className="content inner-page">
      <div className="page-heading"><div><p>Workspace / {board?.project.key ?? "Project"}</p><h1>{personal ? "My tasks" : `${board?.project.name ?? "Project"} board`}</h1><span>{personal ? "Everything assigned to you, organized by status." : "Keep work moving from idea to shipped."}</span></div><button className="primary" onClick={openTaskModal}><Icon name="plus"/> Add task</button></div>
      <div className="kanban">{columns.map((column, columnIndex) => <section key={column.status}><header><span className={`dot d${columnIndex}`}/><b>{statusLabel(column.status)}</b><em>{column.tasks.length}</em><button aria-label={`${statusLabel(column.status)} options`}><Icon name="more"/></button></header>{column.tasks.map((task, index) => <article key={task.id}><span className={index % 2 ? "tag blue-tag" : "tag purple-tag"}>{task.labels?.[0]?.label.name ?? task.priority}</span><h3>{task.title}</h3><p>{task.description || "No description added yet."}</p><div><span className="avatar">{initials(task.assignee?.name ?? "Unassigned")}</span><small><Icon name="calendar" size={13}/> {formatDate(task.dueDate)}</small></div>{columnIndex < columns.length - 1 && <button className="move" onClick={() => void moveTask(task, columns[columnIndex + 1].status)}>Move forward <Icon name="arrow" size={13}/></button>}</article>)}<button className="add-card" onClick={openTaskModal}><Icon name="plus"/> Add task</button></section>)}</div>
    </div>
  );
}
