import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { TagType } from "@/packages/domain/content/tag";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const grantedPermissions = new Set<string>();
const queryInputs: Array<{ name?: string }> = [];
const updateInputs: unknown[] = [];
const createInputs: unknown[] = [];
const loggedErrors: unknown[] = [];

let queryState: {
  data?: { list: Array<{ id: string; name: { en: string; zh: string } }> };
  isFetching: boolean;
};
let createState: {
  isPending: boolean;
  mutateAsync: (input: unknown) => Promise<{
    id: string;
    name: { en: string; zh: string };
  }>;
};
let updateState: {
  isPending: boolean;
  mutateAsync: (input: unknown) => Promise<unknown>;
};

vi.mock("@/features/contracts/admin/use-current-user", () => ({
  useCan: (permission: string) => grantedPermissions.has(permission),
}));

vi.mock("@/packages/trpc/client/trpc", () => ({
  trpc: {
    post: {
      updateTags: { useMutation: () => updateState },
    },
    tag: {
      create: { useMutation: () => createState },
      index: {
        useQuery: (input: { name?: string }) => {
          queryInputs.push(input);
          return queryState;
        },
      },
    },
  },
}));

vi.mock("@/packages/infrastructure/observability/client", () => ({
  clientLogger: {
    error: (...args: unknown[]) => loggedErrors.push(args),
  },
}));

vi.mock("@/packages/ui/components/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", { "data-testid": "tag-badge" }, children),
}));

vi.mock("@/packages/ui/components/button", () => ({
  Button: ({
    children,
    size: _size,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: string;
    variant?: string;
  }) => {
    void _size;
    void _variant;
    return React.createElement("button", props, children);
  },
}));

vi.mock("@/packages/ui/components/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/packages/ui/components/command", () => ({
  Command: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  CommandEmpty: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "command-empty" }, children),
  CommandInput: ({
    onValueChange,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & {
    onValueChange: (value: string) => void;
  }) =>
    React.createElement("input", {
      ...props,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        onValueChange(event.currentTarget.value),
    }),
  CommandItem: ({
    children,
    onSelect,
  }: {
    children: React.ReactNode;
    onSelect: () => void;
  }) =>
    React.createElement(
      "button",
      { "data-testid": "command-item", onClick: onSelect },
      children,
    ),
  CommandList: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
}));

import MultiTag, { type MultiTagProps } from "./index";

describe("MultiTag", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    grantedPermissions.clear();
    queryInputs.length = 0;
    updateInputs.length = 0;
    createInputs.length = 0;
    loggedErrors.length = 0;
    queryState = { isFetching: false };
    createState = {
      isPending: false,
      mutateAsync: async (input) => {
        createInputs.push(input);
        return { id: "created-tag", name: { en: "React", zh: "React" } };
      },
    };
    updateState = {
      isPending: false,
      mutateAsync: async (input) => {
        updateInputs.push(input);
        return { success: true };
      },
    };
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
    vi.useRealTimers();
  });

  async function renderMultiTag(overrides: Partial<MultiTagProps> = {}) {
    const props: MultiTagProps = {
      onChange: vi.fn(),
      postId: "post-1",
      title: "文章标签",
      type: TagType.ACTOR,
      value: [{ id: "existing", name: { en: "Existing", zh: "已有" } }],
      ...overrides,
    };
    await act(async () => root.render(React.createElement(MultiTag, props)));
    return props;
  }

  function findButton(text: string) {
    return Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes(text),
    );
  }

  async function setSearch(value: string) {
    const input = container.querySelector("input");
    if (!input) throw new Error("Expected tag search input");
    const valueSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    await act(async () => {
      valueSetter?.call(input, value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
  }

  it("hides all mutation controls without tag-management permission", async () => {
    await renderMultiTag();

    expect(container.textContent).toContain("已有");
    expect(findButton("添加")).toBeUndefined();
    expect(
      container.querySelector('[data-testid="tag-badge"] button'),
    ).toBeNull();
  });

  it("removes a selected tag and persists the remaining ids", async () => {
    grantedPermissions.add("post:manage-tags");
    const changes: unknown[] = [];
    await renderMultiTag({
      onChange: (tags) => changes.push(tags),
      value: [
        { id: "keep", name: { en: "Keep", zh: "保留" } },
        { id: "remove", name: { en: "Remove", zh: "移除" } },
      ],
    });

    const removeButton = container
      .querySelectorAll('[data-testid="tag-badge"] button')
      .item(1);
    await act(async () => {
      removeButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(changes).toEqual([
      [{ id: "keep", name: { en: "Keep", zh: "保留" } }],
    ]);
    expect(updateInputs).toEqual([
      { postId: "post-1", tagIds: ["keep"], type: "ACTOR" },
    ]);
  });

  it("does not add or persist a duplicate tag", async () => {
    grantedPermissions.add("post:manage-tags");
    queryState = {
      data: {
        list: [{ id: "existing", name: { en: "Existing", zh: "已有" } }],
      },
      isFetching: false,
    };
    const changes: unknown[] = [];
    await renderMultiTag({ onChange: (tags) => changes.push(tags) });

    const option = container.querySelector('[data-testid="command-item"]');
    await act(async () => {
      option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(changes).toEqual([]);
    expect(updateInputs).toEqual([]);
  });

  it("adds a search result locally without a post id", async () => {
    grantedPermissions.add("post:manage-tags");
    queryState = {
      data: {
        list: [{ id: "new-tag", name: { en: "New", zh: "新标签" } }],
      },
      isFetching: false,
    };
    const changes: unknown[] = [];
    await renderMultiTag({
      onChange: (tags) => changes.push(tags),
      postId: "",
      value: [],
    });

    await act(async () => {
      container
        .querySelector('[data-testid="command-item"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(changes).toEqual([
      [{ id: "new-tag", name: { en: "New", zh: "新标签" } }],
    ]);
    expect(updateInputs).toEqual([]);
  });

  it("debounces searches and clears stale options for an empty input", async () => {
    grantedPermissions.add("post:manage-tags");
    queryState = {
      data: {
        list: [{ id: "old", name: { en: "Old", zh: "旧结果" } }],
      },
      isFetching: false,
    };
    await renderMultiTag({ value: [] });

    await setSearch("rea");
    await setSearch("react");
    await act(async () => vi.advanceTimersByTime(300));
    expect(queryInputs.at(-1)).toEqual({ name: "react" });

    await setSearch("");
    await act(async () => vi.advanceTimersByTime(300));
    expect(queryInputs.at(-1)).toEqual({});
    expect(container.querySelector('[data-testid="command-item"]')).toBeNull();
  });

  it("creates a permitted tag and associates it with the post", async () => {
    grantedPermissions.add("post:manage-tags");
    grantedPermissions.add("tag:create");
    const changes: unknown[] = [];
    await renderMultiTag({
      onChange: (tags) => changes.push(tags),
      value: [],
    });
    await setSearch("React");

    await act(async () => {
      findButton("新建")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(createInputs).toEqual([{ name: { en: "React", zh: "React" } }]);
    expect(changes).toEqual([
      [{ id: "created-tag", name: { en: "React", zh: "React" } }],
    ]);
    expect(updateInputs).toEqual([
      { postId: "post-1", tagIds: ["created-tag"], type: "ACTOR" },
    ]);
  });

  it("reports create failures without changing the selected tags", async () => {
    grantedPermissions.add("post:manage-tags");
    grantedPermissions.add("tag:create");
    createState.mutateAsync = async () => {
      throw new Error("create failed");
    };
    const changes: unknown[] = [];
    await renderMultiTag({
      onChange: (tags) => changes.push(tags),
      value: [],
    });
    await setSearch("Broken");

    await act(async () => {
      findButton("新建")?.dispatchEvent(
        new MouseEvent("click", { bubbles: true }),
      );
      await Promise.resolve();
    });

    expect(changes).toEqual([]);
    expect(loggedErrors).toEqual([
      ["client.error", { operation: "tag.create", outcome: "error" }],
    ]);
  });

  it("keeps the local removal and records an association update failure", async () => {
    grantedPermissions.add("post:manage-tags");
    updateState.mutateAsync = async () => {
      throw new Error("update failed");
    };
    const changes: unknown[] = [];
    await renderMultiTag({ onChange: (tags) => changes.push(tags) });

    await act(async () => {
      container
        .querySelector('[data-testid="tag-badge"] button')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(changes).toEqual([[]]);
    expect(loggedErrors).toEqual([
      ["client.error", { operation: "tag.remove", outcome: "error" }],
    ]);
  });
});
