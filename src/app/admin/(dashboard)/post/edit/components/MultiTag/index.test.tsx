import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { TagType } from "@/features/tag/types/tag.type";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const toastMocks = vi.hoisted(() => ({ warning: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast: toastMocks }));

let accountId = "account-a";
const grantedPermissions = new Set<string>();
const queryInputs: Array<{ name?: string }> = [];
const createInputs: unknown[] = [];
const loggedErrors: unknown[] = [];
const retrySearch = vi.fn();

let queryState: {
  data?: { list: Array<{ id: string; name: { en: string; zh: string } }> };
  isFetching: boolean;
  isError?: boolean;
  isPlaceholderData?: boolean;
};
let createState: {
  isPending: boolean;
  mutateAsync: (input: unknown) => Promise<{
    id: string;
    name: { en: string; zh: string };
    publicSync?: "completed" | "degraded";
  }>;
};
vi.mock("@/app/admin/(dashboard)/providers/use-current-user", () => ({
  useCurrentUser: () => ({ user: { id: accountId } }),
  useCan: (permission: string) => grantedPermissions.has(permission),
}));

vi.mock("@/lib/trpc/client/trpc", () => ({
  trpc: {
    tag: {
      create: { useMutation: () => createState },
      index: {
        useQuery: (input: { name?: string }) => {
          queryInputs.push(input);
          return { ...queryState, refetch: retrySearch };
        },
      },
    },
  },
}));

vi.mock("@/lib/observability/client", () => ({
  clientLogger: {
    error: (...args: unknown[]) => loggedErrors.push(args),
  },
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children }: { children: React.ReactNode }) =>
    React.createElement("span", { "data-testid": "tag-badge" }, children),
}));

vi.mock("@/components/ui/button", () => ({
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

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  PopoverContent: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", null, children),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/components/ui/command", () => ({
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

import MultiTag, { type MultiTagProps } from "@/app/admin/(dashboard)/post/edit/components/MultiTag/index";

describe("MultiTag", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    vi.useFakeTimers();
    toastMocks.warning.mockReset();
    toastMocks.error.mockReset();
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    accountId = "account-a";
    grantedPermissions.clear();
    queryInputs.length = 0;
    createInputs.length = 0;
    loggedErrors.length = 0;
    retrySearch.mockReset();
    queryState = { isFetching: false };
    createState = {
      isPending: false,
      mutateAsync: async (input) => {
        createInputs.push(input);
        return { id: "created-tag", name: { en: "React", zh: "React" } };
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

  it("stages removal immediately without persisting relations", async () => {
    grantedPermissions.add("post:manage-tags");
    const changes: unknown[] = [];
    await renderMultiTag({
      onChange: (tags) => changes.push(tags),
      value: [
        { id: "keep", name: { en: "Keep", zh: "保留" } },
        { id: "remove", name: { en: "Remove", zh: "移除" } },
      ],
    });

    const removeButton = container.querySelector<HTMLButtonElement>(
      'button[aria-label="移除标签 移除"]',
    );
    expect(removeButton).not.toBeNull();
    await act(async () => {
      removeButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(changes).toEqual([
      [{ id: "keep", name: { en: "Keep", zh: "保留" } }],
    ]);
  });

  it("hides global creation without tag-create capability", async () => {
    grantedPermissions.add("post:manage-tags");
    await renderMultiTag();
    await setSearch("New");
    expect(findButton("添加")).toBeDefined();
    expect(findButton("新建")).toBeUndefined();
    expect(createInputs).toEqual([]);
  });

  it("composes rapid local selections before the controlled value rerenders", async () => {
    grantedPermissions.add("post:manage-tags");
    const first = { id: "first", name: { en: "First", zh: "一" } };
    const second = { id: "second", name: { en: "Second", zh: "二" } };
    queryState = { data: { list: [first, second] }, isFetching: false };
    const onChange = vi.fn();
    await renderMultiTag({ value: [], onChange });
    await setSearch("tag");
    await act(async () => vi.advanceTimersByTime(300));
    const options = container.querySelectorAll<HTMLButtonElement>(
      '[data-testid="command-item"]',
    );
    await act(async () => {
      options.item(0).click();
      options.item(1).click();
      options.item(0).click();
    });
    expect(onChange.mock.calls).toEqual([[[first]], [[first, second]]]);
  });

  it("does not submit a real surrounding form when removing a tag", async () => {
    grantedPermissions.add("post:manage-tags");
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    await act(async () =>
      root.render(
        <form onSubmit={onSubmit}>
          <MultiTag
            postId="post-a"
            type={TagType.ACTOR}
            title="演员"
            value={[{ id: "a", name: { en: "A", zh: "A" } }]}
            onChange={vi.fn()}
          />
        </form>,
      ),
    );
    const location = window.location.href;
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-testid="tag-badge"] button')
        ?.click(),
    );
    expect(onSubmit).not.toHaveBeenCalled();
    expect(window.location.href).toBe(location);
  });

  it.each(["switch", "return", "unmount", "account", "account-return", "type"])(
    "ignores late tag creation after %s",
    async (mode) => {
      grantedPermissions.add("post:manage-tags");
      grantedPermissions.add("tag:create");
      let resolve:
        | ((tag: Awaited<ReturnType<typeof createState.mutateAsync>>) => void)
        | undefined;
      createState.mutateAsync = () =>
        new Promise((done) => {
          resolve = done;
        });
      const onChange = vi.fn();
      await renderMultiTag({ postId: "a", onChange });
      await setSearch("New");
      await act(async () => findButton("新建")?.click());
      if (mode === "unmount") await act(async () => root.render(<div />));
      else if (mode === "account" || mode === "account-return") {
        accountId = "account-b";
        await renderMultiTag({ postId: "a", onChange });
        if (mode === "account-return") {
          accountId = "account-a";
          await renderMultiTag({ postId: "a", onChange });
        }
      } else if (mode === "type") {
        await renderMultiTag({ postId: "a", type: TagType.DIRECTOR, onChange });
      } else {
        await renderMultiTag({ postId: "b", onChange });
        if (mode === "return") await renderMultiTag({ postId: "a", onChange });
      }
      await act(async () =>
        resolve?.({ id: "created", name: { en: "New", zh: "New" } }),
      );
      expect(onChange).not.toHaveBeenCalled();
    },
  );

  it("stages an existing tag immediately without any post mutation API", async () => {
    grantedPermissions.add("post:manage-tags");
    queryState = {
      data: { list: [{ id: "new", name: { en: "New", zh: "新" } }] },
      isFetching: false,
    };
    const onChange = vi.fn();
    await renderMultiTag({ value: [], onChange });
    await setSearch("New");
    await act(async () => vi.advanceTimersByTime(300));
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-testid="command-item"]')
        ?.click(),
    );
    expect(onChange).toHaveBeenCalledExactlyOnceWith([
      { id: "new", name: { en: "New", zh: "新" } },
    ]);
    expect(container.querySelector("input")?.value).toBe("");
  });

  it("does not stage a duplicate tag", async () => {
    grantedPermissions.add("post:manage-tags");
    queryState = {
      data: {
        list: [{ id: "existing", name: { en: "Existing", zh: "已有" } }],
      },
      isFetching: false,
    };
    const changes: unknown[] = [];
    await renderMultiTag({ onChange: (tags) => changes.push(tags) });

    await setSearch("Existing");
    await act(async () => vi.advanceTimersByTime(300));
    const option = container.querySelector('[data-testid="command-item"]');
    await act(async () => {
      option?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(changes).toEqual([]);
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
    await setSearch("New");
    await act(async () => vi.advanceTimersByTime(300));

    await act(async () => {
      container
        .querySelector('[data-testid="command-item"]')
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(changes).toEqual([
      [{ id: "new-tag", name: { en: "New", zh: "新标签" } }],
    ]);
  });

  it("does not display the previous search as a failed current search and can retry", async () => {
    grantedPermissions.add("post:manage-tags");
    const old = { id: "a", name: { en: "Alpha", zh: "旧结果" } };
    queryState = { data: { list: [old] }, isFetching: false };
    const props = await renderMultiTag({ value: [] });
    await setSearch("Alpha");
    await act(async () => vi.advanceTimersByTime(300));
    expect(container.textContent).toContain("旧结果");

    await setSearch("Beta");
    expect(container.querySelector('[data-testid="command-item"]')).toBeNull();
    queryState = {
      data: { list: [old] },
      isFetching: true,
      isPlaceholderData: true,
    };
    await act(async () => vi.advanceTimersByTime(300));
    await renderMultiTag(props);
    expect(container.querySelector('[data-testid="command-item"]')).toBeNull();
    queryState = { data: undefined, isFetching: false, isError: true };
    await renderMultiTag(props);
    expect(container.querySelector('[data-testid="command-item"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain(
      "搜索失败",
    );
    await act(async () => findButton("重试")?.click());
    expect(retrySearch).toHaveBeenCalledOnce();

    queryState = {
      data: { list: [{ id: "b", name: { en: "Beta", zh: "新结果" } }] },
      isFetching: false,
    };
    await renderMultiTag(props);
    expect(container.textContent).toContain("新结果");
    expect(container.textContent).not.toContain("旧结果");
    await setSearch("");
    expect(container.querySelector('[data-testid="command-item"]')).toBeNull();
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("names removal controls using an available name or stable tag ID", async () => {
    grantedPermissions.add("post:manage-tags");
    await renderMultiTag({
      value: [
        { id: "english", name: { en: "React", zh: "" } },
        { id: "unnamed", name: null },
      ],
    });
    expect(
      container.querySelector('button[aria-label="移除标签 React"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('button[aria-label="移除标签 unnamed"]'),
    ).not.toBeNull();
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

  it("creates a permitted global tag and stages its selection only", async () => {
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
    expect(container.querySelector("input")?.value).toBe("Broken");
    expect(toastMocks.error).toHaveBeenCalledExactlyOnceWith(
      "标签创建失败，请重试",
    );
    expect(loggedErrors).toEqual([
      ["client.error", { operation: "tag.create", outcome: "error" }],
    ]);
  });

  it.each([
    ["completed", 0],
    ["degraded", 1],
  ] as const)(
    "reports global tag creation %s synchronization only",
    async (publicSync, warnings) => {
      grantedPermissions.add("post:manage-tags");
      grantedPermissions.add("tag:create");
      createState.mutateAsync = async () => ({
        id: "created-tag",
        name: { en: "React", zh: "React" },
        publicSync,
      });
      const onChange = vi.fn();
      await renderMultiTag({ value: [], onChange });
      await setSearch("React");
      await act(async () => findButton("新建")?.click());
      expect(onChange).toHaveBeenCalledExactlyOnceWith([
        { id: "created-tag", name: { en: "React", zh: "React" } },
      ]);
      expect(toastMocks.warning).toHaveBeenCalledTimes(warnings);
      if (warnings)
        expect(toastMocks.warning).toHaveBeenCalledWith(
          "已保存，公开内容同步未完成，请稍后检查公开页面",
        );
    },
  );
});
