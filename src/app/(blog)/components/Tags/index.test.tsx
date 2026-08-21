import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
  useTranslations: () => (key: string) =>
    ({ directors: "导演", actors: "演员", styles: "风格" })[key] ?? key,
}));

vi.mock("@/packages/ui/navigation/blog-navigation", () => ({
  Link: ({
    children,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a {...props}>{children}</a>
  ),
}));

import Tags from ".";

const post = {
  movieDirectors: [{ id: "director-1", name: { zh: "导演甲" } }],
  movieActors: [
    { id: "actor-1", name: { zh: "演员甲" } },
    { id: "actor-2", name: { zh: "演员乙" } },
  ],
  movieStyles: [{ id: "style-1", name: { zh: "剧情" } }],
  galleryStyles: [],
};

describe("Tags", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  const render = (props: Record<string, unknown>) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(React.createElement(Tags, props as never)));
  };

  it("renders localized tag groups and links each tag by id", () => {
    render(post);

    expect(container.textContent).toContain("导演：导演甲");
    expect(container.textContent).toContain("演员：演员甲、演员乙");
    expect(container.textContent).toContain("风格：剧情");
    expect(container.querySelectorAll('a[href^="/list/tags/"]')).toHaveLength(
      4,
    );
    expect(
      container.querySelector('a[href="/list/tags/actor-2"]')?.textContent,
    ).toBe("演员乙");
  });

  it("omits empty tag groups", () => {
    render({
      movieDirectors: [],
      movieActors: [],
      movieStyles: [],
      galleryStyles: [],
    });

    expect(container.querySelectorAll("li")).toHaveLength(0);
    expect(container.textContent).toBe("");
  });
});
