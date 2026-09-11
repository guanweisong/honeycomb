import { describe, expect, it, vi } from "vitest";
import { MenuType } from "@/packages/domain/navigation/menu";

import {
  createMedia,
  destroyMedia,
  getMediaList,
} from "@/features/media/application/media-use-cases";
import {
  createTag,
  destroyTags,
  getTagList,
  updateTag,
} from "@/features/tag/application/tag-use-cases";
import {
  getUserDetail,
  getUserList,
} from "@/features/user/application/user-queries";
import {
  createCategory,
  destroyCategories,
  getCategoryList,
} from "@/features/category/application/category-use-cases";
import {
  createLink,
  destroyLinks,
  getLinkList,
} from "@/features/link/application/link-use-cases";
import {
  getMenuList,
  saveAllMenus,
} from "@/features/menu/application/menu-use-cases";
import {
  createPage,
  destroyPages,
  getPageDetail,
  getPageList,
} from "@/features/page/application/page-use-cases";
import {
  getSetting,
  updateSetting,
} from "@/features/setting/application/setting-use-cases";
import { PageTemplate } from "@/packages/domain/content/page-template";

describe("feature repository 契约", () => {
  const invalidateAll = () => ({
    invalidateAll: vi.fn().mockResolvedValue(undefined),
  });
  const invalidateContent = () => ({
    invalidateContent: vi.fn().mockResolvedValue(undefined),
  });

  it("media service 只调用 repository", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({ id: "media-1" }),
      findDeleteTargets: vi
        .fn()
        .mockResolvedValue([{ id: "media-1", key: "a" }]),
      deleteRecords: vi.fn().mockResolvedValue({ success: true }),
      list: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    };
    const storage = { deleteObjects: vi.fn().mockResolvedValue(undefined) };
    await expect(
      createMedia(repository, {
        name: "a",
        size: 1,
        type: "image/png",
        key: "a",
      }),
    ).resolves.toEqual({ id: "media-1" });
    await expect(
      destroyMedia(repository, storage, ["media-1"]),
    ).resolves.toEqual({ success: true });
    await expect(getMediaList(repository, { page: 1 })).resolves.toEqual({
      list: [],
      total: 0,
    });
    expect(repository.create).toHaveBeenCalled();
    expect(storage.deleteObjects).toHaveBeenCalledWith(["a"]);
    expect(repository.deleteRecords).toHaveBeenCalledWith(["media-1"]);
    expect(repository.list).toHaveBeenCalledWith({ page: 1 });
  });

  it("tag service 只调用 repository", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({ id: "tag-1" }),
      update: vi.fn().mockResolvedValue({ id: "tag-1" }),
      destroy: vi.fn().mockResolvedValue({ success: true }),
      list: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    };
    await createTag(
      repository,
      { name: { en: "tag", zh: "标签" } },
      invalidateAll(),
    );
    await updateTag(repository, { id: "tag-1" }, invalidateAll());
    await destroyTags(repository, ["tag-1"], invalidateAll());
    await getTagList(repository, { page: 1 });
    expect(repository.create).toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith({ id: "tag-1" });
    expect(repository.destroy).toHaveBeenCalledWith(["tag-1"]);
    expect(repository.list).toHaveBeenCalledWith({ page: 1 });
  });

  it("user service 只调用 repository", async () => {
    const repository = {
      detail: vi.fn().mockResolvedValue({ id: "user-1", name: "管理员" }),
      list: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    };
    await expect(getUserDetail(repository, "user-1")).resolves.toEqual({
      id: "user-1",
      name: "管理员",
    });
    await expect(getUserList(repository, { page: 1 })).resolves.toEqual({
      list: [],
      total: 0,
    });
    expect(repository.detail).toHaveBeenCalledWith("user-1");
    expect(repository.list).toHaveBeenCalledWith({ page: 1 });
  });

  it("category、link、menu、page、setting service 只调用 repository", async () => {
    const category = {
      create: vi.fn(),
      find: vi.fn().mockResolvedValue(null),
      pathExists: vi.fn().mockResolvedValue(false),
      update: vi.fn(),
      destroy: vi.fn(),
      list: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    };
    await createCategory(
      category,
      {
        title: { en: "Category", zh: "分类" },
        description: { en: "Description", zh: "描述" },
        path: "category",
      },
      invalidateAll(),
    );
    await destroyCategories(category, ["category-1"], invalidateAll());
    await getCategoryList(category, { page: 1 });
    expect(category.create).toHaveBeenCalled();
    expect(category.destroy).toHaveBeenCalledWith(["category-1"]);
    expect(category.list).toHaveBeenCalled();

    const link = {
      create: vi.fn(),
      update: vi.fn(),
      destroy: vi.fn(),
      list: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    };
    await createLink(link, {
      name: "Link",
      url: "https://example.test",
      logo: "https://example.test/logo.png",
    });
    await destroyLinks(link, ["link-1"]);
    await getLinkList(link, { page: 1 });
    expect(link.create).toHaveBeenCalled();
    expect(link.destroy).toHaveBeenCalledWith(["link-1"]);
    expect(link.list).toHaveBeenCalled();

    const menu = { saveAll: vi.fn(), list: vi.fn().mockResolvedValue([]) };
    await saveAllMenus(menu, [{ id: "menu", type: MenuType.CATEGORY, power: 0 }], invalidateAll());
    await getMenuList(menu);
    expect(menu.saveAll).toHaveBeenCalledWith([{ id: "menu", type: "CATEGORY", power: 0 }]);
    expect(menu.list).toHaveBeenCalled();

    const page = {
      create: vi.fn().mockResolvedValue({ id: "page-1" }),
      destroy: vi.fn(),
      update: vi.fn(),
      incrementViews: vi.fn(),
      list: vi.fn().mockResolvedValue({ list: [], total: 0 }),
      detail: vi.fn(),
      author: vi.fn(),
    };
    const pageInput = {
      title: { en: "About", zh: "关于" },
      content: { en: "Content", zh: "内容" },
      template: PageTemplate.DEFAULT,
    };
    await createPage(page, pageInput, "user-1", invalidateContent());
    await destroyPages(page, ["page-1"], invalidateContent());
    await getPageList(page, { page: 1 });
    await getPageDetail(page, "page-1");
    expect(page.create).toHaveBeenCalledWith(pageInput, "user-1");
    expect(page.destroy).toHaveBeenCalledWith(["page-1"]);
    expect(page.list).toHaveBeenCalled();
    expect(page.detail).toHaveBeenCalledWith("page-1", "PUBLISHED_ONLY");

    const setting = { get: vi.fn(), update: vi.fn(), statistics: vi.fn() };
    await getSetting(setting);
    await updateSetting(setting, { id: "setting-1" }, invalidateAll());
    expect(setting.get).toHaveBeenCalled();
    expect(setting.update).toHaveBeenCalled();
  });
});
