"use client";

import { useProjectPulse } from "../../../providers/project-pulse-provider";
import { initials, statusLabel } from "../../../lib/format";
import { Icon } from "../../ui/glyph";

export function TeamScreen() {
  const { members, workload, workspace, notify } = useProjectPulse();
  return (
    <div className="content inner-page">
      <div className="page-heading"><div><p>{workspace?.name ?? "Workspace"}</p><h1>Team</h1><span>Balance workload and keep everyone moving together.</span></div><button className="primary" onClick={() => notify("Member invitation flow opened")}><Icon name="plus"/> Invite member</button></div>
      <div className="team-grid">{members.map((member, index) => { const load = workload.find((item) => item.user.id === member.user.id); return <article className="card" key={member.id}><span className={`avatar big c${index}`}>{initials(member.user.name)}</span><h3>{member.user.name}</h3><p>{member.user.jobTitle || statusLabel(member.role)}</p><div className="capacity"><span><b>{load?.openTasks ?? 0}</b> assigned</span><span><b>{statusLabel(member.role)}</b> role</span></div><div className="meter"><i style={{ width: `${load?.workloadPercent ?? 0}%` }}/></div><small>{load?.workloadPercent ?? 0}% capacity</small></article>; })}</div>
    </div>
  );
}
