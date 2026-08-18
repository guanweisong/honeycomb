import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  fields: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/packages/ui/components/form", () => ({
  Form: (props: { children: React.ReactNode }) => <div>{props.children}</div>,
}));

vi.mock("@/packages/ui/extended/DynamicForm/DynamicField", () => ({
  DynamicField: (props: Record<string, unknown>) => {
    mocks.fields.push(props);
    return <div data-field={String(props.name)} />;
  },
}));

import { PageEditorForm } from ".";

describe("PageEditorForm", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    mocks.fields = [];
  });

  it("renders localized title and content fields plus a template selector", () => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);

    act(() =>
      root.render(
        <PageEditorForm form={{} as never} />,
      ),
    );

    expect(mocks.fields).toEqual([
      expect.objectContaining({
        name: "title",
        type: "text",
        multiLang: true,
      }),
      expect.objectContaining({
        name: "content",
        type: "richText",
        multiLang: true,
      }),
      expect.objectContaining({
        name: "template",
        type: "select",
      }),
    ]);
    expect(container.querySelector("form")).not.toBeNull();
  });
});
