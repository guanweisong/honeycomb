import { EventEmitter } from "node:events";
import type { Page } from "@playwright/test";
import { expect, it } from "vitest";
import { observeSearch } from "@tests/helpers/search-diagnostics";

const query = "确定性浏览器测试内容";
function request(procedure = "post.search", locale = "zh", keyword = query) {
  return {
    method: () => "GET",
    url: () =>
      `http://localhost/api/trpc/post.index,${procedure}?batch=1&input=${encodeURIComponent(JSON.stringify({ 0: {}, 1: { query: keyword, locale } }))}`,
  };
}
function setup() {
  const events = new EventEmitter();
  const observer = observeSearch(
    events as unknown as Page,
    query,
    "zh",
    "fixture",
  );
  return { events, observer };
}

it("ignores unrelated procedures, locales and queries", () => {
  const { events, observer } = setup();
  for (const req of [
    request("post.index"),
    request("post.search", "en"),
    request("post.search", "zh", "other"),
  ]) {
    events.emit("request", req);
    events.emit("response", { request: () => req });
  }
  expect(observer.summary()).toEqual({
    requestObserved: false,
    responseStatus: null,
    bodyState: "not-received",
    trpcErrorCode: null,
    itemCount: null,
    expectedFixturePresent: null,
  });
  observer.stop();
});

it("reads the matching batch slot and emits only safe summary fields", async () => {
  const { events, observer } = setup();
  const req = request();
  events.emit("request", req);
  events.emit("response", {
    request: () => req,
    status: () => 200,
    json: async () => [
      { error: { code: -1 } },
      { result: { data: [{ id: "fixture", title: "private content" }] } },
    ],
  });
  await Promise.resolve();
  expect(observer.summary()).toEqual({
    requestObserved: true,
    responseStatus: 200,
    bodyState: "parsed",
    trpcErrorCode: null,
    itemCount: 1,
    expectedFixturePresent: true,
  });
  observer.stop();
  expect(
    events.listenerCount("request") + events.listenerCount("response"),
  ).toBe(0);
});

it("reports errors, empty results and pending bodies without waiting", async () => {
  for (const [body, code, count, present] of [
    [{ error: { code: -32603, message: "secret" } }, -32603, null, null],
    [{ result: { data: [] } }, null, 0, false],
  ] as const) {
    const { events, observer } = setup();
    events.emit("response", {
      request,
      status: () => 200,
      json: async () => [null, body],
    });
    await Promise.resolve();
    expect(observer.summary()).toMatchObject({
      trpcErrorCode: code,
      itemCount: count,
      expectedFixturePresent: present,
    });
    observer.stop();
  }
  const { events, observer } = setup();
  events.emit("response", {
    request,
    status: () => 200,
    json: () => new Promise(() => {}),
  });
  expect(observer.summary().bodyState).toBe("pending");
  observer.stop();
});

it("records an unreadable body without leaking its error", async () => {
  const { events, observer } = setup();
  events.emit("response", {
    request,
    status: () => 500,
    json: async () => {
      throw new Error("secret");
    },
  });
  await Promise.resolve();
  await Promise.resolve();
  expect(observer.summary()).toMatchObject({
    responseStatus: 500,
    bodyState: "unreadable",
  });
  observer.stop();
});
