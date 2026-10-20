import type { Page, Request, Response } from "@playwright/test";

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function observeSearch(
  page: Page,
  query: string,
  locale: string,
  expectedId: string,
) {
  const summary = {
    requestObserved: false,
    responseStatus: null as number | null,
    bodyState: "not-received" as
      "not-received" | "pending" | "parsed" | "unreadable",
    trpcErrorCode: null as number | null,
    itemCount: null as number | null,
    expectedFixturePresent: null as boolean | null,
  };
  function matchingSlot(request: Request): number | null {
    try {
      const url = new URL(request.url());
      if (
        request.method() !== "GET" ||
        !url.pathname.startsWith("/api/trpc/") ||
        url.searchParams.get("batch") !== "1"
      )
        return null;
      const procedures = url.pathname.slice("/api/trpc/".length).split(",");
      const input = record(JSON.parse(url.searchParams.get("input") ?? "null"));
      const slot = procedures.findIndex((procedure, index) => {
        const value = record(input[index]);
        return (
          procedure === "post.search" &&
          value.query === query &&
          value.locale === locale
        );
      });
      return slot < 0 ? null : slot;
    } catch {
      return null;
    }
  }
  function onRequest(request: Request) {
    if (matchingSlot(request) !== null) summary.requestObserved = true;
  }
  function onResponse(response: Response) {
    const slot = matchingSlot(response.request());
    if (slot === null) return;
    summary.responseStatus = response.status();
    summary.bodyState = "pending";
    void response
      .json()
      .then((body: unknown) => {
        const entry = record(Array.isArray(body) ? body[slot] : null);
        const code = record(entry.error).code;
        const data = record(entry.result).data;
        summary.bodyState = "parsed";
        summary.trpcErrorCode =
          typeof code === "number" && Number.isFinite(code) ? code : null;
        summary.itemCount = Array.isArray(data) ? data.length : null;
        summary.expectedFixturePresent = Array.isArray(data)
          ? data.some((item: unknown) => record(item).id === expectedId)
          : null;
      })
      .catch(() => {
        summary.bodyState = "unreadable";
      });
  }
  page.on("request", onRequest);
  page.on("response", onResponse);
  return {
    summary: () => ({ ...summary }),
    stop: () => {
      page.off("request", onRequest);
      page.off("response", onResponse);
    },
  };
}
