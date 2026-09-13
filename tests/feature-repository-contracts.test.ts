import { describe, expect, it, vi } from "vitest";
import { MenuType } from "@/packages/domain/navigation/menu";

import {
  createMedia,
  destroyMedia,
} from "@/features/media/application/media-use-cases";
import {
  createTag,
  destroyTags,
  updateTag,
} from "@/features/tag/application/tag-use-cases";
import {
  createCategory,
  destroyCategories,
} from "@/features/category/application/category-use-cases";
import {
  createLink,
  destroyLinks,
} from "@/features/link/application/link-use-cases";
import { saveAllMenus } from "@/features/menu/application/menu-use-cases";
import {
  createPage,
  destroyPages,
} from "@/features/page/application/page-use-cases";
import { updateSetting } from "@/features/setting/application/setting-use-cases";
import { PageTemplate } from "@/packages/domain/content/page-template";

describe("feature repository 契约", () => {
  const invalidator = () => ({
    invalidate: vi.fn().mockResolvedValue(undefined),
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

  it("tag commands preserve repository contracts", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({ id: "tag-1" }),
      update: vi.fn().mockResolvedValue({ id: "tag-1" }),
      destroy: vi.fn().mockResolvedValue({ success: true }),
    };
    await createTag(
      repository,
      { name: { en: "tag", zh: "标签" } },
      invalidator(),
    );
    await updateTag(repository, { id: "tag-1" }, invalidator());
    await destroyTags(repository, ["tag-1"], invalidator());
    expect(repository.create).toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith({ id: "tag-1" });
    expect(repository.destroy).toHaveBeenCalledWith(["tag-1"]);
  });

  it("category、link、menu、page、setting commands preserve repository contracts", async () => {
    const category = {
      create: vi.fn(),
      find: vi.fn().mockResolvedValue(null),
      pathExists: vi.fn().mockResolvedValue(false),
      update: vi.fn(),
      destroy: vi.fn(),
    };
    await createCategory(
      category,
      {
        title: { en: "Category", zh: "分类" },
        description: { en: "Description", zh: "描述" },
        path: "category",
      },
      invalidator(),
    );
    await destroyCategories(category, ["category-1"], invalidator());
    expect(category.create).toHaveBeenCalled();
    expect(category.destroy).toHaveBeenCalledWith(["category-1"]);

    const link = {
      create: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
    };
    await createLink(
      link,
      {
        name: "Link",
        url: "https://example.test",
        logo: "https://example.test/logo.png",
      },
      invalidator(),
    );
    await destroyLinks(link, ["link-1"], invalidator());
    expect(link.create).toHaveBeenCalled();
    expect(link.destroy).toHaveBeenCalledWith(["link-1"]);

    const menu = { saveAll: vi.fn() };
    await saveAllMenus(
      menu,
      [{ id: "menu", type: MenuType.CATEGORY, power: 0 }],
      invalidator(),
    );
    expect(menu.saveAll).toHaveBeenCalledWith([
      { id: "menu", type: "CATEGORY", power: 0 },
    ]);

    const page = {
      create: vi.fn().mockResolvedValue({ id: "page-1" }),
      destroy: vi.fn(),
      update: vi.fn(),
      incrementViews: vi.fn(),
      author: vi.fn(),
    };
    const pageInput = {
      title: { en: "About", zh: "关于" },
      content: { en: "Content", zh: "内容" },
      template: PageTemplate.DEFAULT,
    };
    await createPage(page, pageInput, "user-1", invalidator());
    await destroyPages(page, ["page-1"], invalidator());
    expect(page.create).toHaveBeenCalledWith(pageInput, "user-1");
    expect(page.destroy).toHaveBeenCalledWith(["page-1"]);

    const setting = { update: vi.fn() };
    await updateSetting(setting, { id: "setting-1" }, invalidator());
    expect(setting.update).toHaveBeenCalled();
  });
});
