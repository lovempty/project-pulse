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
export type AiHistoryMessage = { role: "USER" | "ASSISTANT"; content: string };
export type AiRequest = { intent?: AiIntent; question?: string | null; projectId?: string | null; history?: AiHistoryMessage[] };
export type AiEvidence = { type: "TASK" | "PROJECT" | "MEMBER" | "METRIC"; id: string | null; label: string; detail: string };
export type AiMetadata = { provider: "ANTHROPIC"; model: string; mode: "LIVE" | "MOCK"; latencyMs: number; inputTokens: number; outputTokens: number; cacheReadTokens: number };
export type AiResult = { summary: string; highlights: string[]; risks: string[]; recommendedActions: string[]; evidence: AiEvidence[]; followUpQuestions: string[]; generatedAt: string; metadata: AiMetadata };
export type AiCapabilities = { provider: "ANTHROPIC"; model: string; mode: "LIVE" | "MOCK"; supportsCustomQuestions: boolean; supportsProjectFiltering: boolean; supportsFollowUps: boolean; supportsStreaming?: boolean };

type Envelope<T> = { data: T };
type Page<T> = Envelope<T[]> & { pagination: { page: number; limit: number; total: number; totalPages: number } };

let accessToken = "";

export class ApiError extends Error {
  constructor(message: string, public code = "API_ERROR", public status = 0, public retryAfter?: number) { super(message); }
}

async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { ...(init.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), ...init.headers },
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
};
