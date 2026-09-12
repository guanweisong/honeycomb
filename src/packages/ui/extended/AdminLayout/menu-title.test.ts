import { describe, expect, it } from "vitest";
import { findMenuTitle } from "./menu-title";

const menu = [
  {
    name: "文章",
    path: "/admin/post",
    children: [{ name: "文章列表", path: "/admin/post/list" }],
  },
];

describe("findMenuTitle", () => {
  it("uses the exact parent title for the parent route", () => {
    expect(findMenuTitle(menu, "/admin/post")).toBe("文章");
  });

  it("uses the most specific child title for nested routes", () => {
    expect(findMenuTitle(menu, "/admin/post/list/archived")).toBe("文章列表");
  });
});
