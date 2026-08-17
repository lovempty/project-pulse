"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { AiEvidence, AiIntent, AiResult } from "../../../lib/api";
import { useProjectPulse } from "../../../providers/project-pulse-provider";
import { Icon } from "../../ui/glyph";
import { useAssistantChat, type ChatMessage } from "./use-assistant-chat";

const prompts: { label: string; description: string; intent: AiIntent }[] = [
  { label: "Summarize progress", description: "Executive view of completed and open work", intent: "SUMMARIZE_PROGRESS" },
  { label: "Surface delivery risks", description: "Find overdue, urgent, and blocked work", intent: "IDENTIFY_RISKS" },
  { label: "Recommend priorities", description: "Rank the next highest-impact actions", intent: "RECOMMEND_PRIORITIES" },
  { label: "Draft weekly update", description: "Create a stakeholder-ready project brief", intent: "GENERATE_WEEKLY_UPDATE" },
];

export function AssistantScreen() {
  const { workspace, projects, tasks, members } = useProjectPulse();
  const chat = useAssistantChat(workspace?.id);
  const endRef = useRef<HTMLDivElement>(null);
  const hasStreamingMessage = chat.messages.some((message) => message.role === "ASSISTANT" && message.delivery === "STREAMING");

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [chat.messages, chat.pending, chat.error]);

  return (
    <div className="assistant-chat-page">
      <aside className="ai-chat-sidebar">
        <button className="ai-new-chat" onClick={chat.clear}><Icon name="plus" size={17}/> New conversation</button>
        <div className="ai-side-section"><span className="ai-side-label">CONTEXT</span><label className="ai-project-filter"><small>Project scope</small><select value={chat.projectId} onChange={(event) => chat.setProjectId(event.target.value)} disabled={chat.pending}><option value="">Entire workspace</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}</select></label><p><Icon name="folder" size={14}/>{chat.projectId ? "Focused project context" : `${projects.length} projects available`}</p><p><Icon name="check" size={14}/>{tasks.length} tasks indexed</p><p><Icon name="users" size={14}/>{members.length} team members</p></div>
        <div className="ai-side-section"><span className="ai-side-label">CURRENT THREAD</span><button className="ai-thread active"><span><Icon name="spark" size={15}/></span><span><b>Project intelligence</b><small>{chat.messages.length ? `${chat.messages.length} messages` : "New conversation"}</small></span></button></div>
        <div className="ai-trust-card"><span><Icon name="check" size={15}/></span><div><b>Secure workspace context</b><p>Claude analyzes authorized data gathered by ProjectPulse. No API credentials reach your browser.</p></div></div>
      </aside>

      <section className="ai-conversation">
        <header className="ai-conversation-header"><div><span className="ai-claude-mark"><Icon name="spark" size={18}/></span><div><h1>ProjectPulse Intelligence</h1><p>Grounded in live workspace data</p></div></div><div className="ai-model-status"><i className={chat.capabilities?.mode === "MOCK" ? "mock" : ""}/><span>{chat.capabilities?.model ? readableModel(chat.capabilities.model) : "Claude"}</span>{chat.capabilities?.mode === "MOCK" && <em>Mock mode</em>}</div></header>

        <div className="ai-message-scroll">
          {!chat.messages.length && !chat.pending ? <EmptyChat onIntent={(intent) => void chat.askIntent(intent)}/> : <div className="ai-message-list">{chat.messages.map((message) => message.role === "USER" ? <UserMessage key={message.id} content={message.content} createdAt={message.createdAt}/> : <AssistantMessage key={message.id} message={message} tasks={tasks} onFollowUp={(question) => void chat.askQuestion(question)}/>)}</div>}

          {chat.pending && !hasStreamingMessage && <div className="ai-thinking"><span className="ai-assistant-avatar"><Icon name="spark" size={17}/></span><div><b>ProjectPulse Intelligence</b><p>{chat.streamStatus?.message ?? "Preparing your response"}</p><span className="thinking-dots"><i/><i/><i/></span></div></div>}

          {chat.error && <div className="ai-chat-error"><span><Icon name="clock" size={17}/></span><div><b>Response interrupted</b><p>{chat.error}</p></div>{chat.failedRequest && <button onClick={() => void chat.retry()}>Retry</button>}</div>}
          <div ref={endRef}/>
        </div>

        <div className="ai-composer-wrap">
          <div className={`ai-composer ${chat.pending ? "pending" : ""}`}><textarea value={chat.question} onChange={(event) => chat.setQuestion(event.target.value.slice(0, 1000))} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void chat.askQuestion(); } }} placeholder="Ask about priorities, delivery risk, workload, or project progress…" rows={2} disabled={chat.pending}/><footer><span><Icon name="spark" size={14}/> Uses authorized workspace context</span><div><small>{chat.question.length}/1000</small>{chat.pending ? <button className="ai-stop" onClick={chat.stop}>Stop</button> : <button className="ai-send" onClick={() => void chat.askQuestion()} disabled={!chat.question.trim()} aria-label="Send question"><Icon name="arrow" size={18}/></button>}</div></footer></div>
          <p className="ai-disclaimer">AI can make mistakes. Verify important project decisions against source records.</p>
        </div>
      </section>
    </div>
  );
}

function EmptyChat({ onIntent }: { onIntent: (intent: AiIntent) => void }) {
  return <div className="ai-chat-empty"><span className="ai-empty-mark"><Icon name="spark" size={27}/></span><p className="eyebrow">CLAUDE FOR PROJECTPULSE</p><h2>What would you like to understand?</h2><p className="subtitle">Ask a question or start with a focused analysis. Every answer is grounded in your authorized workspace data.</p><div className="ai-starter-grid">{prompts.map((prompt) => <button key={prompt.intent} onClick={() => onIntent(prompt.intent)}><span><Icon name={prompt.intent === "IDENTIFY_RISKS" ? "clock" : prompt.intent === "RECOMMEND_PRIORITIES" ? "trend" : prompt.intent === "GENERATE_WEEKLY_UPDATE" ? "chart" : "spark"} size={17}/></span><div><b>{prompt.label}</b><small>{prompt.description}</small></div><Icon name="arrow" size={15}/></button>)}</div></div>;
}

function UserMessage({ content, createdAt }: { content: string; createdAt: string }) {
  return <article className="chat-message user-message"><div className="message-meta"><b>You</b><time>{formatTime(createdAt)}</time></div><div className="user-bubble">{content}</div></article>;
}

function AssistantMessage({ message, tasks, onFollowUp }: { message: Extract<ChatMessage, { role: "ASSISTANT" }>; tasks: { id: string }[]; onFollowUp: (question: string) => void }) {
  const { result } = message;
  const hasInsights = result.highlights.length > 0 || result.risks.length > 0 || result.recommendedActions.length > 0;
  const sourceLabel = result.responseSource === "CLAUDE" ? "Claude" : "ProjectPulse";
  return <article className={`chat-message assistant-message ${message.delivery.toLowerCase()}`}><div className="assistant-message-rail"><span className="ai-assistant-avatar"><Icon name="spark" size={17}/></span><i/></div><div className="assistant-message-body"><div className="message-meta"><b>ProjectPulse Intelligence</b><span className={`claude-chip ${result.responseSource === "SYSTEM" ? "system" : ""}`}>{sourceLabel}</span><time>{formatTime(result.generatedAt)}</time></div>{result.summary ? <p className="assistant-summary">{result.summary}{message.delivery === "STREAMING" && <span className="stream-caret" aria-hidden/>}</p> : message.delivery === "STREAMING" ? <p className="assistant-stream-status"><span className="thinking-dots"><i/><i/><i/></span>{statusLabel(message.status)}</p> : null}{hasInsights && <div className="ai-insight-grid">{result.highlights.length > 0 && <InsightSection title="Highlights" tone="positive" icon="trend" items={result.highlights}/>} {result.risks.length > 0 && <InsightSection title="Risks" tone="risk" icon="clock" items={result.risks}/>} {result.recommendedActions.length > 0 && <InsightSection title="Recommended actions" tone="action" icon="check" items={result.recommendedActions}/>}</div>}{result.evidence.length > 0 && <div className="ai-evidence"><div className="section-heading"><span><Icon name="folder" size={15}/> Evidence from your workspace</span><small>{result.evidence.length} sources</small></div><div className="evidence-list">{result.evidence.map((evidence, index) => <EvidenceItem key={`${evidence.type}-${evidence.id}-${index}`} evidence={evidence} linkedTask={Boolean(evidence.id && tasks.some((task) => task.id === evidence.id))}/>)}</div></div>}{result.followUpQuestions.length > 0 && <div className="ai-follow-ups"><span>Continue exploring</span>{result.followUpQuestions.map((question) => <button key={question} onClick={() => onFollowUp(question)} disabled={message.delivery !== "COMPLETE"}>{question}<Icon name="arrow" size={14}/></button>)}</div>}{message.delivery === "COMPLETE" && <div className="assistant-response-footer"><span><Icon name="check" size={13}/> {result.responseSource === "CLAUDE" ? "Grounded response" : "ProjectPulse response"}</span>{result.metadata.latencyMs > 0 && <span>{result.metadata.latencyMs.toLocaleString()} ms</span>}<button onClick={() => void navigator.clipboard.writeText(formatResult(result))}>Copy response</button></div>}</div></article>;
}

function InsightSection({ title, tone, icon, items }: { title: string; tone: string; icon: "trend" | "clock" | "check"; items: string[] }) {
  return <section className={`insight-section ${tone}`}><header><span><Icon name={icon} size={15}/></span><b>{title}</b></header><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

function EvidenceItem({ evidence, linkedTask }: { evidence: AiEvidence; linkedTask: boolean }) {
  const href = evidence.type === "TASK" && linkedTask ? `/board?task=${evidence.id}` : evidence.type === "PROJECT" ? `/projects?project=${evidence.id}` : evidence.type === "MEMBER" ? `/team?member=${evidence.id}` : null;
  const content = <><span className={`evidence-type ${evidence.type.toLowerCase()}`}>{evidence.type}</span><div><b>{evidence.label}</b><small>{evidence.detail}</small></div>{href && <Icon name="arrow" size={14}/>}</>;
  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}

function readableModel(model: string) { return model.replace("claude-", "Claude ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function formatTime(value: string) { return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value)); }
function statusLabel(status?: Extract<ChatMessage, { role: "ASSISTANT" }>["status"]) {
  if (status === "GATHERING_CONTEXT") return "Reviewing authorized workspace data";
  if (status === "ANALYZING") return "Analyzing delivery signals";
  if (status === "FORMATTING") return "Preparing the final response";
  return "Understanding your request";
}
function formatResult(result: AiResult) {
  const sections = [
    result.summary,
    result.highlights.length ? `Highlights\n${result.highlights.map((item) => `• ${item}`).join("\n")}` : "",
    result.risks.length ? `Risks\n${result.risks.map((item) => `• ${item}`).join("\n")}` : "",
    result.recommendedActions.length ? `Recommended actions\n${result.recommendedActions.map((item) => `• ${item}`).join("\n")}` : "",
  ];
  return sections.filter(Boolean).join("\n\n");
}
