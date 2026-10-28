import { act, createContext, StrictMode, useContext } from "react";
import { createRoot, hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AdminLayout } from "@/app/admin/_components/AdminLayout";
import { AdminPageHeader } from "@/components/admin/layout-context";

// Navigation data is unrelated; retain the real layout, header DOM and drawer.
vi.mock("@/app/admin/_components/AdminLayout/AdminSidebar", () => ({
  AdminSidebar: () => <nav>Navigation</nav>,
}));

const Scope = createContext("outside");
function ScopedAction({ onClick }: { onClick: () => void }) {
  return <button onClick={onClick}>{useContext(Scope)}</button>;
}

let container: HTMLDivElement;
let root: Root | undefined;
beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener() {},
    removeEventListener() {},
  }));
});
afterEach(async () => {
  await act(async () => root?.unmount());
  root = undefined;
  container.remove();
  vi.unstubAllGlobals();
});

it("keeps one real-target portal under StrictMode, preserves local context, and refreshes guarded callbacks without losing focus", async () => {
  const invoke = vi.fn();
  root = createRoot(container);
  const render = (
    role: string,
    baseline: number,
    token: string | null,
    show = true,
  ) =>
    root?.render(
      <StrictMode>
        <AdminLayout title="Honeycomb" pageTitle="Fallback" onLogout={() => {}}>
          <Scope.Provider value={role}>
            {show && (
              <AdminPageHeader title="Editor">
                <ScopedAction
                  onClick={() => invoke({ role, baseline, token })}
                />
              </AdminPageHeader>
            )}
          </Scope.Provider>
        </AdminLayout>
      </StrictMode>,
    );
  await act(async () => render("ADMIN", 1, null));
  const target = container.querySelector('[data-slot="admin-header-actions"]');
  const button = target?.querySelector("button");
  expect(target?.querySelectorAll("button")).toHaveLength(1);
  expect(
    container.querySelector('[data-slot="admin-header-title"]')?.textContent,
  ).toBe("Editor");
  expect(button?.textContent).toBe("ADMIN");
  button?.focus();
  for (const [role, baseline, token] of [
    ["EDITOR", 2, null],
    ["GUEST", 3, "recovered-token"],
  ] as const) {
    await act(async () => render(role, baseline, token));
    expect(target?.querySelector("button")).toBe(button);
    expect(document.activeElement).toBe(button);
    expect(button?.textContent).toBe(role);
    await act(async () => button?.click());
    expect(invoke).toHaveBeenLastCalledWith({ role, baseline, token });
  }
  await act(async () => render("GUEST", 3, "recovered-token", false));
  expect(target?.childNodes).toHaveLength(0);
  expect(
    container.querySelector('[data-slot="admin-header-title"]')?.childNodes,
  ).toHaveLength(0);
  expect(
    container.querySelector('[data-slot="admin-header-title-fallback"]')
      ?.textContent,
  ).toBe("Fallback");
});

it("hydrates the existing fallback shell and installs page-owned header content without mismatch", async () => {
  const recoverable = vi.fn();
  const warning = vi.spyOn(console, "error").mockImplementation(() => {});
  const page = (
    <StrictMode>
      <AdminLayout title="Honeycomb" pageTitle="Fallback" onLogout={() => {}}>
        <AdminPageHeader title="Editor">
          <button>Save</button>
        </AdminPageHeader>
      </AdminLayout>
    </StrictMode>
  );
  try {
    container.innerHTML = renderToString(page);
    expect(
      container.querySelector('[data-slot="admin-header-title"]')?.textContent,
    ).toBe("");
    expect(
      container.querySelector('[data-slot="admin-header-actions"]')
        ?.textContent,
    ).toBe("");
    expect(
      container.querySelector('[data-slot="admin-header-title-fallback"]')
        ?.textContent,
    ).toBe("Fallback");
    await act(async () => {
      root = hydrateRoot(container, page, { onRecoverableError: recoverable });
    });
    expect(
      container.querySelector('[data-slot="admin-header-title"]')?.textContent,
    ).toBe("Editor");
    expect(
      container.querySelector('[data-slot="admin-header-actions"]')
        ?.textContent,
    ).toBe("Save");
    expect(recoverable).not.toHaveBeenCalled();
    expect(warning).not.toHaveBeenCalled();
  } finally {
    warning.mockRestore();
  }
});

it("uses the compiled layout utilities to show exactly one title and only nonempty action areas", async () => {
  const { compile } = await import("tailwindcss");
  const style = document.createElement("style");
  document.head.append(style);
  root = createRoot(container);
  const render = (pageHeader: boolean, staticActions = false) =>
    root?.render(
      <AdminLayout
        title="Honeycomb"
        pageTitle="Fallback"
        actions={staticActions ? <button>Static</button> : null}
        onLogout={() => {}}
      >
        {pageHeader && (
          <AdminPageHeader title="Editor">
            <button>Save</button>
          </AdminPageHeader>
        )}
      </AdminLayout>,
    );
  try {
    await act(async () => render(false));
    const { build } = await compile("@tailwind utilities;");
    const candidates = [...container.querySelectorAll("[class]")].flatMap(
      (element) => (element.getAttribute("class") ?? "").split(/\s+/),
    );
    style.textContent = build(candidates);
    const title = container.querySelector('[data-slot="admin-header-title"]');
    const fallback = container.querySelector(
      '[data-slot="admin-header-title-fallback"]',
    );
    const actions = container.querySelector(
      '[data-slot="admin-header-actions"]',
    )?.parentElement;
    if (!title || !fallback || !actions)
      throw new Error("Header targets missing");
    expect(getComputedStyle(title).display).toBe("none");
    expect(getComputedStyle(fallback).display).toBe("inline");
    expect(getComputedStyle(actions).display).toBe("none");
    await act(async () => render(true));
    expect(getComputedStyle(title).display).toBe("inline");
    expect(getComputedStyle(fallback).display).toBe("none");
    expect(getComputedStyle(actions).display).toBe("flex");
    await act(async () => render(false, true));
    expect(getComputedStyle(title).display).toBe("none");
    expect(getComputedStyle(fallback).display).toBe("inline");
    expect(getComputedStyle(actions).display).toBe("flex");
    expect(actions.textContent).toBe("Static");
  } finally {
    style.remove();
  }
});
