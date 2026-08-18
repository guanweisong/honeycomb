import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const fields: Array<Record<string, unknown>> = [];

vi.mock("@/packages/ui/extended/DynamicForm/DynamicField", () => ({
  DynamicField: (props: Record<string, unknown>) => {
    fields.push(props);
    return <div data-field={String(props.name)} />;
  },
}));

import { PostType } from "@/packages/domain/content/post";
import { PostTypeFields } from ".";

describe("PostTypeFields", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    fields.length = 0;
  });

  function render(type: PostType) {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(<PostTypeFields type={type} />));
  }

  it("renders quote content and author fields for quote posts", () => {
    render(PostType.QUOTE);

    expect(fields).toEqual([
      expect.objectContaining({ name: "quoteContent", type: "textarea", multiLang: true }),
      expect.objectContaining({ name: "quoteAuthor", type: "text", multiLang: true }),
    ]);
  });

  it.each([PostType.ARTICLE, PostType.MOVIE, PostType.PHOTOGRAPH])(
    "renders title, content, and excerpt fields for %s posts",
    (type) => {
      render(type);

      expect(fields.map((field) => field.name)).toEqual([
        "title",
        "content",
        "excerpt",
      ]);
    },
  );

  it("renders no fields for an unsupported post type", () => {
    render("unsupported" as PostType);

    expect(fields).toEqual([]);
    expect(container.textContent).toBe("");
  });
});
