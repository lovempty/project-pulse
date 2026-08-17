"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type AiCapabilities, type AiIntent, type AiRequest, type AiResult } from "../../../lib/api";

export type ChatMessage =
  | { id: string; role: "USER"; content: string; createdAt: string }
  | { id: string; role: "ASSISTANT"; result: AiResult; createdAt: string };

const intentLabels: Record<AiIntent, string> = {
  SUMMARIZE_PROGRESS: "Summarize this week's progress",
  IDENTIFY_RISKS: "Which tasks are at risk?",
  RECOMMEND_PRIORITIES: "What should the team prioritize?",
  GENERATE_WEEKLY_UPDATE: "Generate a weekly project update",
};

const errorMessages: Record<string, string> = {
  FORBIDDEN: "You don't have access to this workspace.",
  VALIDATION_ERROR: "Claude couldn't process that request. Review the question and try again.",
  AI_PROMPT_REQUIRED: "Enter a question or choose one of the suggested prompts.",
  AI_CONFIGURATION_ERROR: "The project assistant is not configured yet.",
  AI_RATE_LIMITED: "Claude is handling a high volume of requests. Please retry shortly.",
  AI_TIMEOUT: "The analysis took longer than expected. You can retry the same question.",
  AI_INVALID_RESPONSE: "Claude returned an unexpected response format. Please regenerate it.",
  AI_UPSTREAM_ERROR: "Claude is temporarily unavailable. Your conversation is safe—try again shortly.",
  PROJECT_NOT_FOUND: "That project is no longer available. The workspace scope has been restored.",
};

export function useAssistantChat(workspaceId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [capabilities, setCapabilities] = useState<AiCapabilities | null>(null);
  const [question, setQuestion] = useState("");
  const [projectId, setProjectId] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [failedRequest, setFailedRequest] = useState<AiRequest | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!workspaceId) return;
    const timer = window.setTimeout(async () => {
      const saved = sessionStorage.getItem(`projectpulse_ai_chat_${workspaceId}`);
      if (saved) {
        try { setMessages(JSON.parse(saved) as ChatMessage[]); } catch { sessionStorage.removeItem(`projectpulse_ai_chat_${workspaceId}`); }
      }
      try { setCapabilities(await api.aiCapabilities(workspaceId)); } catch { setCapabilities(null); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [workspaceId]);

  useEffect(() => {
    if (workspaceId) sessionStorage.setItem(`projectpulse_ai_chat_${workspaceId}`, JSON.stringify(messages.slice(-20)));
  }, [messages, workspaceId]);

  const submit = useCallback(async (request: AiRequest, displayText: string, appendUser = true) => {
    if (!workspaceId || pending) return;
    const conversation = !appendUser && messages.at(-1)?.role === "USER" ? messages.slice(0, -1) : messages;
    const history = conversation.slice(-6).map((message) => message.role === "USER"
      ? { role: "USER" as const, content: message.content.slice(0, 2000) }
      : { role: "ASSISTANT" as const, content: message.result.summary.slice(0, 2000) });
    const body: AiRequest = { ...request, projectId: projectId || null, history };
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "USER", content: displayText, createdAt: new Date().toISOString() };
    if (appendUser) setMessages((current) => [...current, userMessage]);
    setPending(true);
    setError("");
    setFailedRequest(null);
    controller.current = new AbortController();
    try {
      const result = await api.askAi(workspaceId, body, controller.current.signal);
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: "ASSISTANT", result, createdAt: result.generatedAt }]);
      setQuestion("");
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        setError("Response stopped. You can retry whenever you're ready.");
      } else {
        const apiError = cause instanceof ApiError ? cause : null;
        const suffix = apiError?.retryAfter ? ` Try again in ${apiError.retryAfter} seconds.` : "";
        setError(`${apiError ? errorMessages[apiError.code] ?? apiError.message : "The assistant request failed."}${suffix}`);
      }
      setFailedRequest(body);
    } finally {
      controller.current = null;
      setPending(false);
    }
  }, [messages, pending, projectId, workspaceId]);

  const askQuestion = useCallback((value = question) => {
    const trimmed = value.trim();
    if (!trimmed) { setError(errorMessages.AI_PROMPT_REQUIRED); return Promise.resolve(); }
    setQuestion(trimmed);
    return submit({ question: trimmed }, trimmed);
  }, [question, submit]);

  const askIntent = useCallback((intent: AiIntent) => submit({ intent }, intentLabels[intent]), [submit]);
  const retry = useCallback(() => failedRequest ? submit(failedRequest, failedRequest.question || (failedRequest.intent ? intentLabels[failedRequest.intent] : "Retry analysis"), false) : Promise.resolve(), [failedRequest, submit]);
  const stop = useCallback(() => controller.current?.abort(), []);
  const clear = useCallback(() => { setMessages([]); setError(""); setFailedRequest(null); setQuestion(""); }, []);

  return { messages, capabilities, question, setQuestion, projectId, setProjectId, pending, error, failedRequest, askQuestion, askIntent, retry, stop, clear };
}
