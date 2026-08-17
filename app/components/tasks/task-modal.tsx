"use client";

import { useState, type FormEvent } from "react";
import type { Project } from "../../lib/api";
import { Icon } from "../ui/glyph";

type TaskForm = {
  projectId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
};

export function TaskModal({ projects, defaultProjectId, onClose, onSave }: { projects: Project[]; defaultProjectId?: string; onClose: () => void; onSave: (task: TaskForm) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState(defaultProjectId ?? "");
  const [status, setStatus] = useState("TODO");
  const [priority, setPriority] = useState("MEDIUM");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !projectId || saving) return;
    setSaving(true);
    try {
      await onSave({ projectId, title: title.trim(), description: description.trim() || undefined, status, priority });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form className="modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div><h2>Create a new task</h2><p>Add work to your active project board.</p></div>
          <button type="button" onClick={onClose} aria-label="Close task dialog"><Icon name="close"/></button>
        </header>
        <label>Task name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Review mobile onboarding"/></label>
        <label>Project<select value={projectId} onChange={(event) => setProjectId(event.target.value)}>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label>
        <div className="form-row">
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="BACKLOG">Backlog</option><option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="REVIEW">Review</option></select></label>
          <label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value)}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></label>
        </div>
        <label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add context or acceptance criteria..."/></label>
        <footer><button type="button" className="secondary" onClick={onClose}>Cancel</button><button className="primary" disabled={!title.trim() || !projectId || saving}>{saving ? "Creating…" : "Create task"}</button></footer>
      </form>
    </div>
  );
}
