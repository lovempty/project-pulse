"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  api,
  authenticate,
  type AnalyticsData,
  type BoardData,
  type DashboardData,
  type Member,
  type Project,
  type Task,
  type User,
  type Workspace,
  type Workload,
} from "../lib/api";

type NewTask = {
  projectId: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
};

type ProjectPulseContextValue = {
  user: User | null;
  workspace: Workspace | null;
  dashboard: DashboardData | null;
  projects: Project[];
  tasks: Task[];
  members: Member[];
  workload: Workload[];
  analytics: AnalyticsData | null;
  board: BoardData | null;
  loading: boolean;
  error: string;
  taskModalOpen: boolean;
  toast: string;
  openTaskModal: () => void;
  closeTaskModal: () => void;
  notify: (message: string) => void;
  reload: () => Promise<void>;
  createTask: (task: NewTask) => Promise<void>;
  moveTask: (task: Task, targetStatus: string) => Promise<void>;
};

const ProjectPulseContext = createContext<ProjectPulseContextValue | null>(null);

export function ProjectPulseProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [workload, setWorkload] = useState<Workload[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [board, setBoard] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [toast, setToast] = useState("");

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 2_500);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const currentUser = await authenticate();
      const workspaces = await api.workspaces();
      const currentWorkspace = workspaces[0];
      if (!currentWorkspace) throw new Error("No workspace is available for this account.");

      const projectList = await api.projects(currentWorkspace.id);
      const [dashboardData, taskList, memberList, workloadData, analyticsData, boardData] = await Promise.all([
        api.dashboard(currentWorkspace.id),
        api.tasks(currentWorkspace.id),
        api.members(currentWorkspace.id),
        api.workload(currentWorkspace.id),
        api.analytics(currentWorkspace.id),
        projectList[0] ? api.board(currentWorkspace.id, projectList[0].id) : Promise.resolve(null),
      ]);

      setUser(currentUser);
      setWorkspace(currentWorkspace);
      setProjects(projectList);
      setDashboard(dashboardData);
      setTasks(taskList);
      setMembers(memberList);
      setWorkload(workloadData);
      setAnalytics(analyticsData);
      setBoard(boardData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not connect to ProjectPulse API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => window.clearTimeout(timer);
  }, [reload]);

  const createTask = useCallback(async (input: NewTask) => {
    if (!workspace) return;
    await api.createTask(workspace.id, input);
    setTaskModalOpen(false);
    notify("Task created in To Do");
    await reload();
  }, [notify, reload, workspace]);

  const moveTask = useCallback(async (task: Task, targetStatus: string) => {
    if (!workspace || !board) return;
    const previous = board;
    const position = board.columns.find((column) => column.status === targetStatus)?.tasks.length ?? 0;
    setBoard({
      ...board,
      columns: board.columns.map((column) => ({
        ...column,
        tasks: column.status === task.status
          ? column.tasks.filter((item) => item.id !== task.id)
          : column.status === targetStatus
            ? [...column.tasks, { ...task, status: targetStatus }]
            : column.tasks,
      })),
    });
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, status: targetStatus } : item));
    try {
      await api.moveTask(workspace.id, task.id, targetStatus, position);
      notify("Task moved successfully");
    } catch (cause) {
      setBoard(previous);
      setTasks((current) => current.map((item) => item.id === task.id ? task : item));
      notify(cause instanceof Error ? cause.message : "Unable to move task");
    }
  }, [board, notify, workspace]);

  const value = useMemo<ProjectPulseContextValue>(() => ({
    user, workspace, dashboard, projects, tasks, members, workload, analytics,
    board, loading, error, taskModalOpen, toast,
    openTaskModal: () => setTaskModalOpen(true),
    closeTaskModal: () => setTaskModalOpen(false),
    notify, reload, createTask, moveTask,
  }), [user, workspace, dashboard, projects, tasks, members, workload, analytics, board, loading, error, taskModalOpen, toast, notify, reload, createTask, moveTask]);

  return <ProjectPulseContext.Provider value={value}>{children}</ProjectPulseContext.Provider>;
}

export function useProjectPulse() {
  const context = useContext(ProjectPulseContext);
  if (!context) throw new Error("useProjectPulse must be used inside ProjectPulseProvider");
  return context;
}
