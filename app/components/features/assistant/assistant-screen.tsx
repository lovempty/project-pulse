"use client";

import { useState } from "react";
import { useProjectPulse } from "../../../providers/project-pulse-provider";
import { Icon } from "../../ui/glyph";

const prompts = [
  { label: "Summarize this week's progress", intent: "SUMMARIZE_PROGRESS" },
  { label: "Which tasks are at risk?", intent: "IDENTIFY_RISKS" },
  { label: "What should the team prioritize?", intent: "RECOMMEND_PRIORITIES" },
  { label: "Generate a weekly project update", intent: "GENERATE_WEEKLY_UPDATE" },
];

export function AssistantScreen() {
  const { aiResult, askAssistant, notify } = useProjectPulse();
  const [pendingIntent, setPendingIntent] = useState("");
  const [lastIntent, setLastIntent] = useState("SUMMARIZE_PROGRESS");

  async function ask(intent: string) {
    setPendingIntent(intent);
    setLastIntent(intent);
    try { await askAssistant(intent); } finally { setPendingIntent(""); }
  }

  async function copyResult() {
    if (!aiResult) return;
    await navigator.clipboard.writeText([aiResult.summary, ...aiResult.highlights, ...aiResult.risks, ...aiResult.recommendedActions].join("\n"));
    notify("Insight copied to clipboard");
  }

  return (
    <div className="content inner-page assistant-page">
      <div className="ai-hero"><span><Icon name="spark" size={26}/></span><p>AI PROJECT ASSISTANT</p><h1>Turn project data into clear decisions.</h1><small>Ask about progress, risks, workload, or what your team should focus on next.</small></div>
      <div className="prompt-grid">{prompts.map((prompt) => <button key={prompt.intent} onClick={() => void ask(prompt.intent)} disabled={Boolean(pendingIntent)}><span><Icon name="spark" size={17}/></span>{pendingIntent === prompt.intent ? "Analyzing workspace…" : prompt.label}<Icon name="arrow" size={15}/></button>)}</div>
      <div className="ai-response">
        <div className="ai-response-header"><span className="brand-mark"><i/><i/><i/></span><b>Pulse insight</b><small>Based on live workspace data</small></div>
        <p>{aiResult?.summary ?? "Choose a question above to analyze your live workspace data."}</p>
        {aiResult && <div className="ai-details"><span><b>Highlights</b>{aiResult.highlights.join(" · ")}</span><span><b>Risks</b>{aiResult.risks.join(" · ")}</span><span><b>Next actions</b>{aiResult.recommendedActions.join(" · ")}</span></div>}
        <footer><button disabled={!aiResult} onClick={() => void copyResult()}>Copy</button><button disabled={Boolean(pendingIntent)} onClick={() => void ask(lastIntent)}>Regenerate</button></footer>
      </div>
    </div>
  );
}
