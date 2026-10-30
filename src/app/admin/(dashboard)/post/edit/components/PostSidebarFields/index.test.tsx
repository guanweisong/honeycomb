import { EnableStatus } from "@/lib/validation/enable-status";
import { FormProvider, useForm, type UseFormReturn } from "react-hook-form";
import type { PostEditorValues } from "@/app/admin/(dashboard)/post/edit/components/utils/post-draft";
import { requireDefined } from "@tests/helpers/require-defined";
import React, { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRoot, type Root } from "react-dom/client";
import { PostType } from "@/features/post/types/post.type";

const grantedPermissions = new Set<string>();

vi.mock("@/app/admin/(dashboard)/providers/use-current-user", () => ({
  useCan: (permission: string) => grantedPermissions.has(permission),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    variant: _variant,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string }) => (
    void _variant,
    React.createElement("button", props, children)
  ),
}));

vi.mock("@/components/DynamicForm/DynamicField", () => ({
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

vi.mock("@/app/admin/(dashboard)/post/edit/components/MultiTag", () => ({
  default: ({
    title,
    value,
    onChange,
  }: {
    title: string;
    value: unknown[];
    onChange: (value: unknown[]) => void;
  }) =>
    React.createElement(
      "button",
      {
        "data-testid": "multi-tag",
        onClick: () => onChange([{ id: "selected", name: { en: title } }]),
      },
      title,
      `:${value.length}`,
    ),
}));

vi.mock("@/app/admin/(dashboard)/post/edit/components/PhotoPickerItem", () => ({
  default: ({ title }: { title: string }) =>
    React.createElement("div", { "data-testid": "photo-picker" }, title),
}));

import { PostSidebarFields } from "@/app/admin/(dashboard)/post/edit/components/PostSidebarFields/index";

describe("post editor type-specific fields", () => {
  let container: HTMLDivElement;
  let root: Root;
  let modalChanges: unknown[];
  let form: UseFormReturn<PostEditorValues> | undefined;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    grantedPermissions.clear();
    modalChanges = [];
    form = undefined;
  });

  afterEach(async () => {
    await act(async () => root.unmount());
    container.remove();
  });

  async function renderSidebar(type: PostType) {
    const props: React.ComponentProps<typeof PostSidebarFields> = {
      categories: [
        {
          deepPath: 2,
          id: "category-1",
          title: { zh: "子分类", en: "Child" },
          description: null,
          parent: null,
          path: "child",
          status: EnableStatus.ENABLE,
          createdAt: null,
          updatedAt: null,
        },
      ],
      postId: "post-1",
      onCreateCategory: () => modalChanges.push({ open: true, type: 0 }),
      photoPickerProps: {
        cover: undefined,
        handlePhotoClear: vi.fn(),
        openPhotoPicker: vi.fn(),
        size: "1920*1080",
        title: "封面",
      },
    };
    function Harness() {
      form = useForm<PostEditorValues>({
        defaultValues: {
          type,
          galleryStyles: [],
          movieActors: [],
          movieDirectors: [],
          movieStyles: [],
        },
      });
      return (
        <FormProvider {...form}>
          <PostSidebarFields {...props} />
        </FormProvider>
      );
    }
    await act(async () => root.render(<Harness />));
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
    ).toEqual(["导演:0", "演员:0", "电影风格:0"]);
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
    ).toBe("照片风格:0");
  });

  it("does not offer covers or tag relationships for quotes", async () => {
    await renderSidebar(PostType.QUOTE);

    expect(container.querySelector('[data-testid="photo-picker"]')).toBeNull();
    expect(container.querySelector('[data-testid="multi-tag"]')).toBeNull();
  });

  it("binds tag changes and resets directly to the existing form context", async () => {
    await renderSidebar(PostType.MOVIE);
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('[data-testid="multi-tag"]')
        ?.click(),
    );
    expect(requireDefined(form).getValues("movieDirectors")).toEqual([
      { id: "selected", name: { en: "导演" } },
    ]);
    expect(requireDefined(form).getFieldState("movieDirectors").isDirty).toBe(
      true,
    );
    await act(async () =>
      requireDefined(form).reset({
        type: PostType.PHOTOGRAPH,
        galleryStyles: [],
      }),
    );
    expect(
      container.querySelector('[data-testid="multi-tag"]')?.textContent,
    ).toBe("照片风格:0");
    expect(requireDefined(form).getFieldState("movieDirectors").isDirty).toBe(
      false,
    );
  });
});
