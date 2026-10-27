// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_ASSET_URL: "https://assets.example.test/files" },
}));
import {
  managedMediaKey,
  assertMediaReferencesExist,
  findKnownMediaReferences,
} from "@/features/media/server/media-references";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import * as schema from "@/lib/db/schema";
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
it("recognizes protocol-relative managed URLs rather than bypassing reference checks", () => {
  expect(managedMediaKey("//assets.example.test/files/ordinary.png")).toBe(
    "ordinary.png",
  );
  expect(managedMediaKey("//other.test/files/ordinary.png")).toBeNull();
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

it("rejects a missing cover using the caller's transaction", async () => {
  const mock = createMockDb();
  mock.limit.mockResolvedValue([]);
  await expect(
    asMockDatabase(mock).transaction((tx) =>
      assertMediaReferencesExist(tx, { coverId: "missing" }),
    ),
  ).rejects.toMatchObject({ code: "CONFLICT" });
  expect(mock.transaction).toHaveBeenCalledOnce();
});
it("counts other ordinary rows sharing a storage key as a known reference", async () => {
  const mock = createMockDb();
  mock.select.mockImplementation(() => ({
    from: (table: object) => {
      if (table === schema.post)
        return { where: () => ({ limit: async () => [] }) };
      if (table === schema.media)
        return { where: async () => [{ id: "target" }, { id: "duplicate" }] };
      throw new Error("Duplicate reference should stop further queries");
    },
  }));
  await expect(
    asMockDatabase(mock).transaction((tx) =>
      findKnownMediaReferences(tx, [
        {
          id: "target",
          key: "same.png",
          url: "https://assets.example.test/files/same.png",
        },
      ]),
    ),
  ).resolves.toBe(true);
});

it("indexes returned keys once when validating multiple content references", async () => {
  const mock = createMockDb();
  let keyReads = 0;
  const keys = Array.from({ length: 32 }, (_, index) => `${index}.png`);
  mock.where.mockResolvedValue(
    keys.map((key) => ({
      get key() {
        keyReads += 1;
        return key;
      },
    })),
  );
  await asMockDatabase(mock).transaction((tx) =>
    assertMediaReferencesExist(tx, {
      content: {
        zh: keys
          .map((key) => `<img src="https://assets.example.test/files/${key}">`)
          .join(""),
      },
    }),
  );
  expect(keyReads).toBe(32);
});
