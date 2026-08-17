"use client";

import { useProjectPulse } from "../../../providers/project-pulse-provider";
import { statusLabel } from "../../../lib/format";
import { CardTitle } from "../../ui/card-title";

export function AnalyticsScreen() {
  const { analytics, notify } = useProjectPulse();
  const statusData = analytics?.tasksByStatus ?? [];
  const total = statusData.reduce((sum, item) => sum + item.count, 0);
  const trend = (analytics?.completionTrend ?? []).slice(-12);
  return (
    <div className="content inner-page">
      <div className="page-heading"><div><p>Reporting</p><h1>Analytics</h1><span>Performance signals across your workspace.</span></div><select><option>Last 30 days</option><option>Last quarter</option></select></div>
      <div className="analytics-grid"><div className="card big-analytic"><CardTitle title="Completion trend" subtitle="Tasks completed over time" action="Export" onClick={() => notify("Analytics export prepared")}/><div className="bars">{(trend.length ? trend : [{ date: new Date().toISOString(), count: 0 }]).map((item, index) => <i key={`${item.date}-${index}`} style={{ height: `${Math.max(8, Math.min(100, item.count * 25))}%` }}><span>{new Date(item.date).getDate()}</span></i>)}</div></div><div className="card status-card"><h2>Tasks by status</h2><div className="donut"><span><b>{total}</b><small>Total tasks</small></span></div>{statusData.map((item, index) => <p key={item.name}><i style={{ background: ["#625bf6", "#3985ed", "#f2a94a", "#ee6872", "#22a778"][index % 5] }}/>{statusLabel(item.name)}<b>{total ? Math.round(item.count / total * 100) : 0}%</b></p>)}</div></div>
    </div>
  );
}
