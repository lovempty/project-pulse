import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, consumeSseStream, type AiStreamEvent } from "../app/lib/api.ts";

const encoder = new TextEncoder();

function streamFrom(chunks: string[]) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk));
      controller.close();
    },
  });
}

test("parses an SSE event split across network chunks", async () => {
  const events: AiStreamEvent[] = [];
  await consumeSseStream(streamFrom([
    "event: delta\ndata: {\"text\":\"Project ",
    "delivery\"}\nid: 1\n\n",
    "event: done\ndata: {\"requestId\":\"req-1\"}\nid: 2\n\n",
  ]), (event) => events.push(event));

  assert.equal(events.length, 2);
  assert.equal(events[0].event, "delta");
  assert.deepEqual(events[0].data, { text: "Project delivery" });
});

test("parses several events in one chunk and ignores heartbeat comments", async () => {
  const names: string[] = [];
  await consumeSseStream(streamFrom([
    ": ping\n\nevent: status\ndata: {\"stage\":\"ANALYZING\",\"message\":\"Analyzing\"}\nid: 1\n\nevent: delta\ndata: {\"text\":\"Ready\"}\nid: 2\n\nevent: done\ndata: {\"requestId\":\"req-1\"}\nid: 3\n\n",
  ]), (event) => names.push(event.event));

  assert.deepEqual(names, ["status", "delta", "done"]);
});

test("accepts only monotonically increasing numeric event IDs", async () => {
  let summary = "";
  await consumeSseStream(streamFrom([
    "event: delta\ndata: {\"text\":\"A\"}\nid: 2\n\nevent: delta\ndata: {\"text\":\"duplicate\"}\nid: 2\n\nevent: delta\ndata: {\"text\":\"old\"}\nid: 1\n\nevent: delta\ndata: {\"text\":\"B\"}\nid: 3\n\nevent: done\ndata: {\"requestId\":\"req-1\"}\nid: 4\n\n",
  ]), (event) => { if (event.event === "delta") summary += event.data.text; });

  assert.equal(summary, "AB");
});

test("surfaces retryable server error events", async () => {
  await assert.rejects(
    consumeSseStream(streamFrom([
      "event: error\ndata: {\"code\":\"AI_TIMEOUT\",\"message\":\"Timed out\",\"retryable\":true,\"requestId\":\"req-1\"}\nid: 1\n\n",
    ]), () => undefined),
    (error: unknown) => error instanceof ApiError && error.code === "AI_TIMEOUT" && error.retryable,
  );
});

test("honors cancellation before consuming a stream", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    consumeSseStream(streamFrom(["event: delta\ndata: {\"text\":\"ignored\"}\nid: 1\n\n"]), () => undefined, controller.signal),
    (error: unknown) => error instanceof DOMException && error.name === "AbortError",
  );
});
