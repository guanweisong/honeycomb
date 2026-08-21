import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { PostType } from "@/packages/domain/content/post";

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const grantedPermissions = new Set<string>();

vi.mock("@/features/contracts/admin/use-current-user", () => ({
  useCan: (permission: string) => grantedPermissions.has(permission),
}));

vi.mock("@/packages/ui/components/button", () => ({
  Button: ({
    children,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    void _variant,
    React.createElement("button", props, children)
  ),
}));

vi.mock("@/packages/ui/extended/DynamicForm/DynamicField", () => ({
  DynamicField: ({
    label,
    name,
    options,
  }: {
    label?: React.ReactNode;
    name: string;
    options?: Array<{ label: React.ReactNode; value: string }>;
  }) =>
    React.createElement(
      "div",
      { "data-field": name },
      label ?? name,
      options?.map((option) =>
        React.createElement(
          "span",
          { "data-option": option.value, key: option.value },
          option.label,
        ),
      ),
    ),
}));

vi.mock("../MultiTag", () => ({
  default: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "multi-tag" }, title),
}));

vi.mock("../PhotoPickerItem", () => ({
  default: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "photo-picker" }, title),
}));

import { PostSidebarFields } from "./index";
import { PostTypeFields } from "../PostTypeFields";

describe("post editor type-specific fields", () => {
  let container: HTMLDivElement;
  let root: Root;
  let modalChanges: unknown[];

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    grantedPermissions.clear();
    modalChanges = [];
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderSidebar(type: PostType) {
    const editor = {
      category: {
        list: [
          {
            deepPath: 2,
            id: "category-1",
            title: { zh: "子分类" },
          },
        ],
      },
      detail: { id: "post-1" },
      galleryStyles: [],
      movieActors: [],
      movieDirectors: [],
      movieStyles: [],
      photoPickerProps: {
        handlePhotoClear: vi.fn(),
        openPhotoPicker: vi.fn(),
        size: "1920*1080",
        title: "封面",
      },
      setGalleryStyles: vi.fn(),
      setModalProps: (value: unknown) => modalChanges.push(value),
      setMovieActors: vi.fn(),
      setMovieDirectors: vi.fn(),
      setMovieStyles: vi.fn(),
      type,
    };
    await act(async () => {
      root.render(React.createElement(PostSidebarFields, { editor } as never));
    });
  }

  it("renders nested category options, cover and authorized category creation", async () => {
    grantedPermissions.add("category:create");
    await renderSidebar(PostType.ARTICLE);

    expect(container.querySelector('[data-field="type"]')).not.toBeNull();
    expect(
      container.querySelector('[data-field="categoryId"]')?.textContent,
    ).toContain("—— ——  子分类");
    expect(
      container.querySelector('[data-testid="photo-picker"]')?.textContent,
    ).toBe("封面");
    await act(async () => {
      Array.from(container.querySelectorAll("button"))
        .find((button) => button.textContent?.includes("新建分类"))
        ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    expect(modalChanges).toEqual([{ open: true, type: 0 }]);
  });

  it("renders movie scheduling and all three movie tag relationships", async () => {
    await renderSidebar(PostType.MOVIE);

    expect(container.querySelector('[data-field="movieTime"]')).not.toBeNull();
    expect(
      Array.from(container.querySelectorAll('[data-testid="multi-tag"]')).map(
        (item) => item.textContent,
      ),
    ).toEqual(["导演", "演员", "电影风格"]);
    expect(
      container.querySelector('[data-testid="photo-picker"]'),
    ).not.toBeNull();
  });

  it("renders photograph metadata and its gallery style relationship", async () => {
    await renderSidebar(PostType.PHOTOGRAPH);

    expect(
      container.querySelector('[data-field="galleryLocation"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-field="galleryTime"]'),
    ).not.toBeNull();
    expect(
      container.querySelector('[data-testid="multi-tag"]')?.textContent,
    ).toBe("照片风格");
  });

  it("does not offer covers or tag relationships for quotes", async () => {
    await renderSidebar(PostType.QUOTE);

    expect(container.querySelector('[data-testid="photo-picker"]')).toBeNull();
    expect(container.querySelector('[data-testid="multi-tag"]')).toBeNull();
  });

  it.each([
    [PostType.ARTICLE, ["title", "content", "excerpt"]],
    [PostType.MOVIE, ["title", "content", "excerpt"]],
    [PostType.PHOTOGRAPH, ["title", "content", "excerpt"]],
    [PostType.QUOTE, ["quoteContent", "quoteAuthor"]],
    ["UNSUPPORTED", []],
  ] as const)("renders the %s content fields", async (type, expectedFields) => {
    await act(async () => {
      root.render(
        React.createElement(PostTypeFields, { type: type as PostType }),
      );
    });

    expect(
      Array.from(container.querySelectorAll("[data-field]")).map((field) =>
        field.getAttribute("data-field"),
      ),
    ).toEqual([...expectedFields]);
  });
});
