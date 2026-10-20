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

import { createMedia, destroyMedia } from "@/features/media/server";
import { createTag, destroyTags, updateTag } from "@/features/tag/server";
import { createCategory, destroyCategories } from "@/features/category/server";
import { createLink, destroyLinks } from "@/features/link/server";
import { saveAllMenus } from "@/features/menu/server";
import { createPage, destroyPages } from "@/features/page/server";
import { updateSetting } from "@/features/setting/server";
import { PageTemplate } from "@/features/page/page-template";

describe("feature persistence contracts", () => {
  const invalidator = () => ({
    invalidate: vi.fn().mockResolvedValue({ state: "completed" as const }),
  });

  it("media commands coordinate repository and storage", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({ id: "media-1" }),
      findDeleteTargets: vi
        .fn()
        .mockResolvedValue([{ id: "media-1", key: "a" }]),
      deleteRecords: vi.fn().mockResolvedValue({ success: true }),
    };
    const storage = { deleteObjects: vi.fn().mockResolvedValue(undefined) };
    await expect(
      createMedia(repository, {
        name: "a.png",
        size: 1,
        type: "image/png",
        key: "a",
      }),
    ).resolves.toEqual({ state: "created", media: { id: "media-1" } });
    await expect(
      destroyMedia(repository, storage, ["media-1"], invalidator()),
    ).resolves.toEqual({ success: true });
    expect(repository.create).toHaveBeenCalled();
    expect(storage.deleteObjects).toHaveBeenCalledWith(["a"]);
    expect(repository.deleteRecords).toHaveBeenCalledWith(["media-1"]);
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
    db.returning.mockResolvedValue([{ id: "persisted-menu" }]);
    await expect(
      saveAllMenus(
        asMockDatabase(db),
        [{ id: "menu", type: MenuType.CATEGORY, power: 0 }],
        invalidator(),
      ),
    ).resolves.toEqual({ count: 1, publicSync: "completed" });
    expect(db.transaction).toHaveBeenCalledOnce();
    expect(db.values).toHaveBeenCalledWith([
      expect.objectContaining({
        categoryId: "menu",
        type: "CATEGORY",
        power: 0,
      }),
    ]);
  });

  it("page writes preserve author identity and localized content", async () => {
    const db = createMockDb();
    db.returning.mockResolvedValue([{ id: "page-1" }]);
    const input = {
      title: { en: "About", zh: "关于" },
      content: { en: "Content", zh: "内容" },
      template: PageTemplate.DEFAULT,
    };
    await expect(
      createPage(asMockDatabase(db), input, "user-1", invalidator()),
    ).resolves.toMatchObject({ id: "page-1" });
    await expect(
      destroyPages(asMockDatabase(db), ["page-1"], invalidator()),
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
    db.limit.mockResolvedValue([{ id: "setting-1" }]);
    db.where
      .mockReturnValueOnce(db)
      .mockResolvedValueOnce([])
      .mockReturnValue(db);
    await expect(
      updateSetting(asMockDatabase(db), { id: "setting-1" }, invalidator()),
    ).resolves.toMatchObject({ id: "setting-1", publicSync: "completed" });
    expect(db.transaction).toHaveBeenCalledOnce();
  });
});
