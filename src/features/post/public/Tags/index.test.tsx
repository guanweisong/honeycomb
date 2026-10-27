import { createPostFixture } from "@tests/helpers/post-fixtures";
import type { TagRecord } from "@/features/tag/types/tag.record";
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl", () => ({
  useLocale: () => "zh",
  useTranslations: () => (key: string) =>
    ({ directors: "导演", actors: "演员", styles: "风格" })[key] ?? key,
}));

vi.mock("next-intl/navigation", () => ({
  createNavigation: () => ({
    Link: ({
      children,
      prefetch,
      ...props
    }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
      prefetch?: import("next/link").LinkProps["prefetch"];
    }) => (
      <a {...props} data-prefetch={String(prefetch)}>
        {children}
      </a>
    ),
  }),
}));

import Tags from ".";

function tag(id: string, zh: string): TagRecord {
  return { id, name: { zh, en: zh }, createdAt: null, updatedAt: null };
}

const post = createPostFixture({
  movieDirectors: [tag("director-1", "导演甲")],
  movieActors: [tag("actor-1", "演员甲"), tag("actor-2", "演员乙")],
  movieStyles: [tag("style-1", "剧情")],
  galleryStyles: [],
});

describe("Tags", () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
  });

  const render = (props: React.ComponentProps<typeof Tags>) => {
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    act(() => root.render(React.createElement(Tags, props)));
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

  it("uses the shared blog Link default full prefetch for tag destinations", () => {
    render(post);

    const links = container.querySelectorAll('a[href^="/list/tags/"]');
    expect(links).toHaveLength(4);
    for (const link of links)
      expect(link.getAttribute("data-prefetch")).toBe("true");
  });

  it("omits empty tag groups", () => {
    render(
      createPostFixture({
        movieDirectors: [],
        movieActors: [],
        movieStyles: [],
        galleryStyles: [],
      }),
    );

    expect(container.querySelectorAll("li")).toHaveLength(0);
    expect(container.textContent).toBe("");
  });
  it("renders localized tag groups, separators and destination links", async () => {
    render(
      createPostFixture({
        galleryStyles: [tag("gallery", "人像")],
        movieActors: [],
        movieDirectors: [
          tag("director-1", "导演甲"),
          tag("director-2", "导演乙"),
        ],
        movieStyles: [],
      }),
    );

    expect(container.textContent).toContain("导演：导演甲、导演乙");
    expect(container.textContent).toContain("风格：人像");
    expect(
      container.querySelector('a[href="/list/tags/director-2"]'),
    ).not.toBeNull();
    expect(container.querySelectorAll("li")).toHaveLength(2);
  });
});
