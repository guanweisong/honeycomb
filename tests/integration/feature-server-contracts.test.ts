import { describe, expect, it, vi } from "vitest";
import { MenuType } from "@/features/menu/menu-types";
import { asMockDatabase, createMockDb } from "@tests/helpers/test-utils";
import * as schema from "@/lib/db/schema";
import { EnableStatus } from "@/lib/validation/enable-status";

vi.mock("@/lib/observability/server", () => ({
  observeDbOperation: (
    _name: string,
    _kind: string,
    operation: () => unknown,
  ) => operation(),
}));

import { beginMediaUpload, destroyMedia } from "@/features/media/server";
import { createTag, destroyTags, updateTag } from "@/features/tag/server";
import { createCategory, destroyCategories } from "@/features/category/server";
import { createLink, destroyLinks } from "@/features/link/server";
import { saveAllMenus } from "@/features/menu/server";
import { createPage, destroyPages } from "@/features/page/server";
import { updateSetting } from "@/features/setting/server";
import { UserLevel, UserStatus } from "@/features/user/user";
import { PageTemplate } from "@/features/page/page-template";

describe("feature persistence contracts", () => {
  const invalidator = () => ({
    invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
  });

  it("media commands coordinate repository and storage", async () => {
    const id = "507f1f77bcf86cd799439011";
    const repository = {
      begin: vi.fn().mockResolvedValue({
        id,
        key: "media/a.png",
        uploadKey: "temporary/a.png",
        uploadExpiresAt: "2026-10-20T12:00:00.000Z",
        size: 1,
        type: "image/png",
      }),
      beginDelete: vi.fn().mockResolvedValue([{ id, key: "media/a.png" }]),
      finishDelete: vi.fn().mockResolvedValue(undefined),
      note: vi.fn().mockResolvedValue(undefined),
    };
    const storage = {
      getPresignedUrl: vi
        .fn()
        .mockResolvedValue("https://upload.example.test/a"),
      headObject: vi
        .fn()
        .mockResolvedValueOnce({ size: 1, type: "image/png" })
        .mockResolvedValueOnce(null),
      deleteObjects: vi.fn().mockResolvedValue(undefined),
    };
    const file = { name: "a.png", size: 1, type: "image/png" as const };
    await expect(
      beginMediaUpload(repository, storage, file, "author"),
    ).resolves.toEqual({
      id,
      uploadUrl: "https://upload.example.test/a",
      expiresAt: "2026-10-20T12:00:00.000Z",
    });
    await expect(
      destroyMedia(repository, storage, [id], invalidator(), "author", true),
    ).resolves.toEqual({ success: true, publicSync: "completed" });
    expect(repository.begin).toHaveBeenCalledWith(file, "author");
    expect(storage.getPresignedUrl).toHaveBeenCalledWith({
      Key: "temporary/a.png",
      ContentType: "image/png",
      ContentLength: 1,
    });
    expect(repository.beginDelete).toHaveBeenCalledWith([id], "author");
    expect(storage.deleteObjects).toHaveBeenCalledWith(["media/a.png"]);
    expect(repository.finishDelete).toHaveBeenCalledWith(id);
    expect(repository.beginDelete).toHaveBeenCalledBefore(
      storage.deleteObjects,
    );
    expect(storage.deleteObjects).toHaveBeenCalledBefore(
      repository.finishDelete,
    );
    expect(repository.note).not.toHaveBeenCalled();
  });

  it("tag commands write and delete through the database", async () => {
    const db = createMockDb();
    const row = { id: "tag-1", createdAt: null, updatedAt: null };
    db.returning.mockResolvedValue([row]);
    db.limit.mockResolvedValue([row]);
    db.where
      .mockReturnValueOnce(db)
      .mockResolvedValueOnce([
        { tagId: row.id, locale: "en", name: "tag" },
        { tagId: row.id, locale: "zh", name: "标签" },
      ])
      .mockReturnValue(db);
    const database = asMockDatabase(db);
    const name = { en: "tag", zh: "标签" };
    await expect(
      createTag(database, { name }, invalidator()),
    ).resolves.toMatchObject({ ...row, name });
    await expect(
      updateTag(database, { id: row.id }, invalidator()),
    ).resolves.toMatchObject({ ...row, name });
    await expect(
      destroyTags(database, [row.id], invalidator()),
    ).resolves.toMatchObject({ success: true });
    expect(db.insert).toHaveBeenCalledWith(schema.tag);
    expect(db.insert).toHaveBeenCalledWith(schema.tagTranslation);
    expect(db.delete).toHaveBeenCalledWith(schema.tag);
  });

  it("category commands preserve localized writes and deletion", async () => {
    const db = createMockDb();
    const row = { id: "category-1", status: EnableStatus.ENABLE };
    db.limit.mockResolvedValue([]);
    db.returning.mockResolvedValue([row]);
    const input = {
      title: { en: "Category", zh: "分类" },
      description: { en: "Description", zh: "描述" },
      path: "category",
    };
    await expect(
      createCategory(asMockDatabase(db), input, invalidator()),
    ).resolves.toMatchObject({
      ...row,
      title: input.title,
      description: input.description,
    });
    await expect(
      destroyCategories(asMockDatabase(db), [row.id], invalidator()),
    ).resolves.toMatchObject({ success: true });
    expect(db.insert).toHaveBeenCalledWith(schema.category);
    expect(db.insert).toHaveBeenCalledWith(schema.categoryTranslation);
    expect(db.delete).toHaveBeenCalledWith(schema.category);
  });

  it("link commands write and delete through the database", async () => {
    const db = createMockDb();
    const input = {
      name: "Link",
      url: "https://example.test",
      logo: "https://example.test/logo.png",
    };
    const row = { id: "link-1", ...input, status: null };
    db.returning.mockResolvedValue([row]);
    await expect(
      createLink(asMockDatabase(db), input, invalidator()),
    ).resolves.toMatchObject(row);
    await expect(
      destroyLinks(asMockDatabase(db), [row.id], invalidator()),
    ).resolves.toMatchObject({ success: true });
    expect(db.values).toHaveBeenCalledWith(input);
    expect(db.delete).toHaveBeenCalledWith(schema.link);
  });

  it("menu writes preserve business identifiers inside one transaction", async () => {
    const db = createMockDb();
    const id = "507f1f77bcf86cd799439011";
    db.returning.mockResolvedValue([{ id: "persisted-menu", version: 1 }]);
    db.from.mockImplementation((table: object) => {
      const read = createMockDb();
      if (table === schema.user)
        read.limit.mockResolvedValue([
          { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
        ]);
      else read.where.mockResolvedValue([{ id }]);
      return read;
    });
    await expect(
      saveAllMenus(
        asMockDatabase(db),
        {
          expectedVersion: 0,
          items: [{ id, type: MenuType.CATEGORY, power: 0 }],
        },
        "author",
        invalidator(),
      ),
    ).resolves.toEqual({ count: 1, version: 1, publicSync: "completed" });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.values).toHaveBeenCalledWith([
      expect.objectContaining({
        categoryId: id,
        type: "CATEGORY",
        power: 0,
      }),
    ]);
  });

  it("page writes preserve author identity and localized content", async () => {
    const db = createMockDb();
    const id = "507f1f77bcf86cd799439011";
    db.returning.mockResolvedValue([{ id, version: 0 }]);
    db.from.mockImplementation((table: object) => {
      const read = createMockDb();
      read.limit.mockResolvedValue(
        table === schema.user
          ? [{ level: UserLevel.ADMIN, status: UserStatus.ENABLE }]
          : table === schema.page
            ? [{ id, version: 0 }]
            : [],
      );
      return read;
    });
    const input = {
      creationToken: "11111111-1111-4111-8111-111111111111",
      title: { en: "About", zh: "关于" },
      content: { en: "Content", zh: "内容" },
      template: PageTemplate.DEFAULT,
    };
    await expect(
      createPage(asMockDatabase(db), input, "user-1", invalidator()),
    ).resolves.toEqual({ id, version: 0, publicSync: "completed" });
    await expect(
      destroyPages(
        asMockDatabase(db),
        { items: [{ id, expectedVersion: 0 }] },
        "user-1",
        invalidator(),
      ),
    ).resolves.toMatchObject({ success: true });
    expect(db.values).toHaveBeenCalledWith(
      expect.objectContaining({
        authorId: "user-1",
        template: PageTemplate.DEFAULT,
      }),
    );
    expect(db.insert).toHaveBeenCalledWith(schema.pageTranslation);
    expect(db.delete).toHaveBeenCalledWith(schema.page);
  });

  it("setting writes preserve the saved identity", async () => {
    const db = createMockDb();
    const id = "507f1f77bcf86cd799439011";
    db.returning.mockResolvedValue([{ id, version: 1 }]);
    db.from.mockImplementation((table: object) => {
      const read = createMockDb();
      if (table === schema.user)
        read.limit.mockResolvedValue([
          { level: UserLevel.ADMIN, status: UserStatus.ENABLE },
        ]);
      else read.where.mockResolvedValue([]);
      return read;
    });
    await expect(
      updateSetting(
        asMockDatabase(db),
        { id, expectedVersion: 0, siteName: { en: "Saved" } },
        "author",
        invalidator(),
      ),
    ).resolves.toMatchObject({ id, version: 1, publicSync: "completed" });
    expect(db.transaction).toHaveBeenCalledOnce();
  });
});
