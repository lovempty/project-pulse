const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type User = { id: string; name: string; email?: string; avatarUrl?: string | null; jobTitle?: string | null };
export type Workspace = { id: string; name: string; slug: string; members?: { role: string }[] };
export type Project = { id: string; name: string; key: string; description?: string | null; color?: string | null; status: string; dueDate?: string | null; progress: number; taskCount?: number; totalTasks?: number; completedTasks?: number };
export type Task = { id: string; projectId: string; title: string; description?: string | null; status: string; priority: string; position: number; dueDate?: string | null; assignee?: User | null; labels?: { label: { id: string; name: string; color: string } }[] };
export type Member = { id: string; role: string; user: User };
export type Workload = { user: User; openTasks: number; workloadPercent: number };
export type Activity = { id: string; action: string; createdAt: string; actor: User; project?: { id: string; name: string } | null; task?: { id: string; title: string } | null };
export type AnalyticsData = { tasksByStatus: { name: string; count: number }[]; tasksByPriority: { name: string; count: number }[]; overdueCount: number; completionTrend: { date: string; count: number }[]; projectProgress: { projectId: string; name: string; total: number; progress: number }[]; workloadByMember: { assigneeId: string; name: string; openTasks: number }[] };
export type DashboardData = { metrics: { activeProjectCount: number; completedTaskCount: number; overdueTaskCount: number; teamWorkloadPercent: number }; projectCompletionTrend: { projectId: string; name: string; progress: number }[]; activeProjects: Project[]; teamWorkload: Workload[]; recentActivity: Activity[] };
export type BoardData = { project: Project; columns: { status: string; tasks: Task[] }[] };
export type AiIntent = "SUMMARIZE_PROGRESS" | "IDENTIFY_RISKS" | "RECOMMEND_PRIORITIES" | "GENERATE_WEEKLY_UPDATE";
export type AiResponseType = "CONVERSATIONAL" | "ANALYSIS";
export type AiResponseSource = "SYSTEM" | "CLAUDE";
export type AiStreamStage = "CLASSIFYING" | "GATHERING_CONTEXT" | "ANALYZING" | "FORMATTING";
export type AiHistoryMessage = { role: "USER" | "ASSISTANT"; content: string };
export type AiRequest = { intent?: AiIntent; question?: string | null; projectId?: string | null; history?: AiHistoryMessage[] };
export type AiEvidence = { type: "TASK" | "PROJECT" | "MEMBER" | "METRIC"; id: string | null; label: string; detail: string };
export type AiMetadata = { provider: "ANTHROPIC"; model: string; mode: "LIVE" | "MOCK"; latencyMs: number; inputTokens: number; outputTokens: number; cacheReadTokens: number };
export type AiResult = { responseType: AiResponseType; responseSource: AiResponseSource; summary: string; highlights: string[]; risks: string[]; recommendedActions: string[]; evidence: AiEvidence[]; followUpQuestions: string[]; generatedAt: string; metadata: AiMetadata };
export type AiCapabilities = { provider: "ANTHROPIC"; model: string; mode: "LIVE" | "MOCK"; supportsCustomQuestions: boolean; supportsProjectFiltering: boolean; supportsFollowUps: boolean; supportsStreaming: boolean; streamProtocol?: "SSE"; streamEndpoint?: string };
export type AiStreamEvent =
  | { event: "start"; id?: string; data: { requestId: string; responseType: AiResponseType; responseSource: AiResponseSource; provider: "ANTHROPIC"; model: string; mode: "LIVE" | "MOCK" } }
  | { event: "status"; id?: string; data: { stage: AiStreamStage; message: string } }
  | { event: "delta"; id?: string; data: { text: string } }
  | { event: "result"; id?: string; data: AiResult }
  | { event: "error"; id?: string; data: { code: string; message: string; retryable: boolean; requestId: string } }
  | { event: "done"; id?: string; data: { requestId: string } };

type Envelope<T> = { data: T };
type Page<T> = Envelope<T[]> & { pagination: { page: number; limit: number; total: number; totalPages: number } };

let accessToken = "";

export class ApiError extends Error {
  constructor(message: string, public code = "API_ERROR", public status = 0, public retryAfter?: number, public retryable = false) { super(message); }
}

function headersFor(init: RequestInit) {
  return { ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers };
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: headersFor(init),
  });
  if (response.status === 401 && retry && !path.includes("/auth/")) {
    const refreshed = await refresh();
    if (refreshed) return request<T>(path, init, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const retryAfter = Number(response.headers.get("Retry-After"));
    throw new ApiError(body?.error?.message ?? `Request failed (${response.status})`, body?.error?.code, response.status, Number.isFinite(retryAfter) ? retryAfter : undefined);
  }
  return response.status === 204 ? (undefined as T) : response.json();
}

async function openStream(path: string, init: RequestInit, retry = true): Promise<Response> {
  const response = await fetch(`${API_URL}${path}`, { ...init, credentials: "include", headers: headersFor(init) });
  if (response.status === 401 && retry && !path.includes("/auth/")) {
    const refreshed = await refresh();
    if (refreshed) return openStream(path, init, false);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const retryAfter = Number(response.headers.get("Retry-After"));
    throw new ApiError(body?.error?.message ?? `Request failed (${response.status})`, body?.error?.code, response.status, Number.isFinite(retryAfter) ? retryAfter : undefined);
  }
  if (!response.body) throw new ApiError("Streaming response body is unavailable", "AI_UPSTREAM_ERROR", response.status, undefined, true);
  return response;
}

type RawSseEvent = { event: string; id?: string; data: unknown };

function parseSseFrame(frame: string): RawSseEvent | null {
  let event = "message";
  let id: string | undefined;
  const data: string[] = [];
  let hasFields = false;
  for (const line of frame.split(/\r?\n/)) {
    if (!line || line.startsWith(":")) continue;
    hasFields = true;
    const separator = line.indexOf(":");
    const field = separator === -1 ? line : line.slice(0, separator);
    let value = separator === -1 ? "" : line.slice(separator + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value;
    else if (field === "id") id = value;
    else if (field === "data") data.push(value);
  }
  if (!hasFields || data.length === 0) return null;
  const serialized = data.join("\n");
  try { return { event, id, data: JSON.parse(serialized) }; }
  catch { throw new ApiError("The assistant returned an invalid stream event", "AI_INVALID_RESPONSE", 0, undefined, true); }
}

export async function consumeSseStream(stream: ReadableStream<Uint8Array>, onEvent: (event: AiStreamEvent) => void, signal?: AbortSignal) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let lastNumericId = -1;
  try {
    while (true) {
      if (signal?.aborted) throw new DOMException("The operation was aborted", "AbortError");
      const { value, done } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const frames = buffer.split(/\r?\n\r?\n/);
      buffer = frames.pop() ?? "";
      for (const frame of frames) {
        const parsed = parseSseFrame(frame);
        if (!parsed) continue;
        if (parsed.id !== undefined && /^\d+$/.test(parsed.id)) {
          const numericId = Number(parsed.id);
          if (numericId <= lastNumericId) continue;
          lastNumericId = numericId;
        }
        const event = parsed as AiStreamEvent;
        onEvent(event);
        if (event.event === "error") throw new ApiError(event.data.message, event.data.code, 0, undefined, event.data.retryable);
        if (event.event === "done") {
          await reader.cancel();
          return;
        }
      }
      if (done) break;
    }
    if (buffer.trim()) {
      const parsed = parseSseFrame(buffer);
      if (parsed) onEvent(parsed as AiStreamEvent);
    }
  } finally {
    reader.releaseLock();
  }
}

async function refresh() {
  try {
    const result = await request<Envelope<{ accessToken: string }>>("/api/v1/auth/refresh", { method: "POST", body: "{}" }, false);
    accessToken = result.data.accessToken;
    sessionStorage.setItem("projectpulse_access", accessToken);
    return true;
  } catch { return false; }
}

export async function authenticate() {
  accessToken = sessionStorage.getItem("projectpulse_access") ?? "";
  if (accessToken) {
    try { return (await request<Envelope<User>>("/api/v1/auth/me", {}, false)).data; } catch { accessToken = ""; }
  }
  if (await refresh()) return (await request<Envelope<User>>("/api/v1/auth/me", {}, false)).data;
  const result = await request<Envelope<{ accessToken: string; user: User }>>("/api/v1/auth/login", { method: "POST", body: JSON.stringify({ email: "alex@projectpulse.dev", password: "PulseDemo123!" }) }, false);
  accessToken = result.data.accessToken;
  sessionStorage.setItem("projectpulse_access", accessToken);
  return result.data.user;
}

export const api = {
  workspaces: async () => (await request<Envelope<Workspace[]>>("/api/v1/workspaces/")).data,
  dashboard: async (id: string) => (await request<Envelope<DashboardData>>(`/api/v1/workspaces/${id}/dashboard`)).data,
  projects: async (id: string) => (await request<Page<Project>>(`/api/v1/workspaces/${id}/projects/?limit=100`)).data,
  tasks: async (id: string, assigneeId?: string) => (await request<Page<Task>>(`/api/v1/workspaces/${id}/tasks/?limit=100${assigneeId ? `&assigneeId=${assigneeId}` : ""}`)).data,
  members: async (id: string) => (await request<Envelope<Member[]>>(`/api/v1/workspaces/${id}/members`)).data,
  workload: async (id: string) => (await request<Envelope<Workload[]>>(`/api/v1/workspaces/${id}/workload`)).data,
  analytics: async (id: string) => (await request<Envelope<AnalyticsData>>(`/api/v1/workspaces/${id}/analytics`)).data,
  board: async (wid: string, pid: string) => (await request<Envelope<BoardData>>(`/api/v1/workspaces/${wid}/projects/${pid}/board`)).data,
  createTask: async (wid: string, body: { projectId: string; title: string; description?: string; status?: string; priority?: string; dueDate?: string | null }) => (await request<Envelope<Task>>(`/api/v1/workspaces/${wid}/tasks/`, { method: "POST", body: JSON.stringify(body) })).data,
  moveTask: async (wid: string, taskId: string, status: string, position: number) => (await request<Envelope<Task>>(`/api/v1/workspaces/${wid}/tasks/${taskId}/move`, { method: "PATCH", body: JSON.stringify({ status, position }) })).data,
  aiCapabilities: async (wid: string) => (await request<Envelope<AiCapabilities>>(`/api/v1/workspaces/${wid}/ai/capabilities`)).data,
  askAi: async (wid: string, body: AiRequest, signal?: AbortSignal) => (await request<Envelope<AiResult>>(`/api/v1/workspaces/${wid}/ai/ask`, { method: "POST", body: JSON.stringify(body), signal })).data,
  streamAi: async (wid: string, body: AiRequest, onEvent: (event: AiStreamEvent) => void, signal?: AbortSignal) => {
    const response = await openStream(`/api/v1/workspaces/${wid}/ai/stream`, { method: "POST", body: JSON.stringify(body), headers: { Accept: "text/event-stream" }, signal });
    await consumeSseStream(response.body!, onEvent, signal);
  },
};
