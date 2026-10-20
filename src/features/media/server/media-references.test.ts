// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.example.test/files" },
}));
import { managedMediaKey } from "./media-references";
it("recognizes only exact managed origin and path and ignores query/fragment", () => {
  expect(
    managedMediaKey("https://assets.example.test/files/a.png?width=2#x"),
  ).toBe("a.png");
  expect(
    managedMediaKey("https://assets.example.test.evil/files/a.png"),
  ).toBeNull();
  expect(
    managedMediaKey("https://assets.example.test/files-other/a.png"),
  ).toBeNull();
  expect(managedMediaKey("https://elsewhere.test/a.png")).toBeNull();
});
it("recognizes protocol-relative managed URLs rather than bypassing lifecycle checks", () => {
  expect(managedMediaKey("//assets.example.test/files/deleting.png")).toBe(
    "deleting.png",
  );
  expect(managedMediaKey("//other.test/files/deleting.png")).toBeNull();
});
it.each([
  " //assets.example.test/files/m.png",
  "\\\\assets.example.test/files/m.png",
  "/\\assets.example.test/files/m.png",
  "\t//assets.example.test/files/m.png\n",
])("uses browser network-path normalization for %s", (value) => {
  expect(managedMediaKey(value)).toBe("m.png");
});
it("does not resolve ordinary relative paths against the asset host", () => {
  expect(managedMediaKey("/files/m.png")).toBeNull();
  expect(managedMediaKey("files/m.png")).toBeNull();
});
