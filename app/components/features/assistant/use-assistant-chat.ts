"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type AiCapabilities, type AiIntent, type AiRequest, type AiResult, type AiStreamEvent, type AiStreamStage } from "../../../lib/api";

type AssistantDelivery = "STREAMING" | "COMPLETE" | "FAILED";

export type ChatMessage =
  | { id: string; role: "USER"; content: string; createdAt: string }
  | { id: string; role: "ASSISTANT"; result: AiResult; createdAt: string; delivery: AssistantDelivery; status?: AiStreamStage; failureMessage?: string; retryable?: boolean };

type FailedRequest = { body: AiRequest; displayText: string; assistantMessageId?: string };

const intentLabels: Record<AiIntent, string> = {
  SUMMARIZE_PROGRESS: "Summarize this week's progress",
  IDENTIFY_RISKS: "Which tasks are at risk?",
  RECOMMEND_PRIORITIES: "What should the team prioritize?",
  GENERATE_WEEKLY_UPDATE: "Generate a weekly project update",
};

const errorMessages: Record<string, string> = {
  FORBIDDEN: "You don't have access to this workspace.",
  VALIDATION_ERROR: "Review the question and try again.",
  AI_PROMPT_REQUIRED: "Enter a question or choose one of the suggested prompts.",
  AI_CONFIGURATION_ERROR: "The project assistant is not configured yet.",
  AI_RATE_LIMITED: "The assistant is handling a high volume of requests. Please retry shortly.",
  AI_TIMEOUT: "The analysis took longer than expected. You can retry the same question.",
  AI_INVALID_RESPONSE: "The assistant returned an unexpected response format. Please regenerate it.",
  AI_UPSTREAM_ERROR: "The assistant is temporarily unavailable. Your conversation is safe—try again shortly.",
  PROJECT_NOT_FOUND: "That project is no longer available. The workspace scope has been restored.",
};

function provisionalResult(event: Extract<AiStreamEvent, { event: "start" }>): AiResult {
  return {
    responseType: event.data.responseType,
    responseSource: event.data.responseSource,
    summary: "",
    highlights: [],
    risks: [],
    recommendedActions: [],
    evidence: [],
    followUpQuestions: [],
    generatedAt: new Date().toISOString(),
    metadata: { provider: event.data.provider, model: event.data.model, mode: event.data.mode, latencyMs: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0 },
  };
}

function restoreMessages(value: string): ChatMessage[] {
  const parsed = JSON.parse(value) as ChatMessage[];
  return parsed.filter((message) => message.role === "USER" || !message.delivery || message.delivery === "COMPLETE").map((message) => {
    if (message.role === "USER") return message;
    return {
      ...message,
      delivery: "COMPLETE" as const,
      result: {
        ...message.result,
        responseType: message.result.responseType ?? "ANALYSIS",
        responseSource: message.result.responseSource ?? "CLAUDE",
      },
    };
  });
}

export function useAssistantChat(workspaceId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [capabilities, setCapabilities] = useState<AiCapabilities | null>(null);
  const [question, setQuestion] = useState("");
  const [projectIdState, setProjectIdState] = useState("");
  const [pending, setPending] = useState(false);
  const [streamStatus, setStreamStatus] = useState<{ stage: AiStreamStage; message: string } | null>(null);
  const [error, setError] = useState("");
  const [failedRequest, setFailedRequest] = useState<FailedRequest | null>(null);
  const controller = useRef<AbortController | null>(null);
  const pendingRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const workspaceRef = useRef(workspaceId);

  const updateMessages = useCallback((updater: (current: ChatMessage[]) => ChatMessage[]) => {
    setMessages((current) => {
      const next = updater(current);
      messagesRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    workspaceRef.current = workspaceId;
    controller.current?.abort();
    controller.current = null;
    pendingRef.current = false;
    let active = true;
    const timer = window.setTimeout(() => {
      setPending(false);
      setStreamStatus(null);
      setError("");
      setFailedRequest(null);
      setProjectIdState("");
      setCapabilities(null);
      if (!workspaceId) {
        messagesRef.current = [];
        setMessages([]);
        return;
      }

      const saved = sessionStorage.getItem(`projectpulse_ai_chat_${workspaceId}`);
      let restored: ChatMessage[] = [];
      if (saved) {
        try { restored = restoreMessages(saved); }
        catch { sessionStorage.removeItem(`projectpulse_ai_chat_${workspaceId}`); }
      }
      messagesRef.current = restored;
      setMessages(restored);
      void api.aiCapabilities(workspaceId).then((value) => { if (active) setCapabilities(value); }).catch(() => { if (active) setCapabilities(null); });
    }, 0);
    return () => {
      active = false;
      window.clearTimeout(timer);
      controller.current?.abort();
      if (workspaceRef.current === workspaceId) workspaceRef.current = undefined;
    };
  }, [workspaceId]);

  useEffect(() => {
    if (!workspaceId || workspaceRef.current !== workspaceId) return;
    const completeMessages = messages.filter((message) => message.role === "USER" || message.delivery === "COMPLETE").slice(-20);
    sessionStorage.setItem(`projectpulse_ai_chat_${workspaceId}`, JSON.stringify(completeMessages));
  }, [messages, workspaceId]);

  const execute = useCallback(async (body: AiRequest, displayText: string, appendUser: boolean, failedMessageId?: string) => {
    if (!workspaceId || pendingRef.current) return;
    pendingRef.current = true;
    setPending(true);
    setError("");
    setFailedRequest(null);
    setStreamStatus({ stage: "CLASSIFYING", message: "Understanding your request" });

    if (failedMessageId) updateMessages((current) => current.filter((message) => message.id !== failedMessageId));
    if (appendUser) {
      const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "USER", content: displayText, createdAt: new Date().toISOString() };
      updateMessages((current) => [...current, userMessage]);
    }

    const requestController = new AbortController();
    controller.current = requestController;
    let assistantMessageId: string | undefined;
    let receivedResult = false;

    const handleStreamEvent = (event: AiStreamEvent) => {
      if (event.event === "start") {
        assistantMessageId = crypto.randomUUID();
        const createdAt = new Date().toISOString();
        const message: ChatMessage = { id: assistantMessageId, role: "ASSISTANT", result: provisionalResult(event), createdAt, delivery: "STREAMING" };
        updateMessages((current) => [...current, message]);
      } else if (event.event === "status") {
        setStreamStatus(event.data);
        if (assistantMessageId) updateMessages((current) => current.map((message) => message.id === assistantMessageId && message.role === "ASSISTANT" ? { ...message, status: event.data.stage } : message));
      } else if (event.event === "delta") {
        if (!assistantMessageId) return;
        updateMessages((current) => current.map((message) => message.id === assistantMessageId && message.role === "ASSISTANT" ? { ...message, result: { ...message.result, summary: message.result.summary + event.data.text } } : message));
      } else if (event.event === "result") {
        receivedResult = true;
        const finalMessage: ChatMessage = { id: assistantMessageId ?? crypto.randomUUID(), role: "ASSISTANT", result: event.data, createdAt: event.data.generatedAt, delivery: "COMPLETE" };
        if (assistantMessageId) updateMessages((current) => current.map((message) => message.id === assistantMessageId ? finalMessage : message));
        else {
          assistantMessageId = finalMessage.id;
          updateMessages((current) => [...current, finalMessage]);
        }
      }
    };

    try {
      let currentCapabilities = capabilities;
      if (!currentCapabilities) {
        try {
          currentCapabilities = await api.aiCapabilities(workspaceId);
          if (workspaceRef.current === workspaceId) setCapabilities(currentCapabilities);
        } catch { currentCapabilities = null; }
      }

      if (currentCapabilities?.supportsStreaming) {
        await api.streamAi(workspaceId, body, handleStreamEvent, requestController.signal);
        if (!receivedResult) throw new ApiError("The stream ended before a final response arrived", "AI_INVALID_RESPONSE", 0, undefined, true);
      } else {
        const result = await api.askAi(workspaceId, body, requestController.signal);
        receivedResult = true;
        updateMessages((current) => [...current, { id: crypto.randomUUID(), role: "ASSISTANT", result, createdAt: result.generatedAt, delivery: "COMPLETE" }]);
      }
      setQuestion("");
    } catch (cause) {
      if (workspaceRef.current !== workspaceId) return;
      const aborted = cause instanceof DOMException && cause.name === "AbortError";
      const apiError = cause instanceof ApiError ? cause : null;
      const message = aborted
        ? "Response stopped. You can retry whenever you're ready."
        : `${apiError ? errorMessages[apiError.code] ?? apiError.message : "The assistant request failed."}${apiError?.retryAfter ? ` Try again in ${apiError.retryAfter} seconds.` : ""}`;
      setError(message);
      if (assistantMessageId) {
        updateMessages((current) => current.map((item) => item.id === assistantMessageId && item.role === "ASSISTANT" ? { ...item, delivery: "FAILED", failureMessage: message, retryable: aborted || apiError?.retryable !== false } : item));
      }
      setFailedRequest({ body, displayText, assistantMessageId });
      if (apiError?.code === "PROJECT_NOT_FOUND") setProjectIdState("");
    } finally {
      if (controller.current === requestController) controller.current = null;
      if (workspaceRef.current === workspaceId) {
        pendingRef.current = false;
        setPending(false);
        setStreamStatus(null);
      }
    }
  }, [capabilities, updateMessages, workspaceId]);

  const submit = useCallback((request: AiRequest, displayText: string) => {
    const history = messagesRef.current.slice(-6).map((message) => message.role === "USER"
      ? { role: "USER" as const, content: message.content.slice(0, 2000) }
      : { role: "ASSISTANT" as const, content: message.result.summary.slice(0, 2000) });
    const body: AiRequest = { ...request, projectId: projectIdState || null, history };
    return execute(body, displayText, true);
  }, [execute, projectIdState]);

  const askQuestion = useCallback((value = question) => {
    const trimmed = value.trim();
    if (!trimmed) { setError(errorMessages.AI_PROMPT_REQUIRED); return Promise.resolve(); }
    setQuestion(trimmed);
    return submit({ question: trimmed }, trimmed);
  }, [question, submit]);

  const askIntent = useCallback((intent: AiIntent) => submit({ intent }, intentLabels[intent]), [submit]);
  const retry = useCallback(() => failedRequest ? execute(failedRequest.body, failedRequest.displayText, false, failedRequest.assistantMessageId) : Promise.resolve(), [execute, failedRequest]);
  const stop = useCallback(() => controller.current?.abort(), []);
  const clear = useCallback(() => {
    controller.current?.abort();
    updateMessages(() => []);
    setError("");
    setFailedRequest(null);
    setQuestion("");
    setStreamStatus(null);
  }, [updateMessages]);
  const setProjectId = useCallback((value: string) => {
    controller.current?.abort();
    setProjectIdState(value);
  }, []);

  return { messages, capabilities, question, setQuestion, projectId: projectIdState, setProjectId, pending, streamStatus, error, failedRequest, askQuestion, askIntent, retry, stop, clear };
}
