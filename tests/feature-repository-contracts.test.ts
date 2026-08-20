import { describe, expect, it, vi } from "vitest";

import { createMedia, destroyMedia, getMediaList } from "@/features/media/service";
import { createTag, destroyTags, getTagList, updateTag } from "@/features/tag/service";
import { getUserDetail, getUserList } from "@/features/user/user-queries";
import { createCategory, destroyCategories, getCategoryList } from "@/features/category/service";
import { createLink, destroyLinks, getLinkList } from "@/features/link/service";
import { getMenuList, saveAllMenus } from "@/features/menu/service";
import { createPage, destroyPages, getPageDetail, getPageList } from "@/features/page/service";
import { getSetting, updateSetting } from "@/features/setting/service";

describe("feature repository 契约", () => {
  it("media application 只调用 repository", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({ id: "media-1" }),
      destroy: vi.fn().mockResolvedValue({ success: true }),
      list: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    };
    await expect(createMedia(repository as never, { name: "a", size: 1, type: "image/png", key: "a" } as never)).resolves.toEqual({ id: "media-1" });
    await expect(destroyMedia(repository as never, ["media-1"])).resolves.toEqual({ success: true });
    await expect(getMediaList(repository as never, { page: 1 })).resolves.toEqual({ list: [], total: 0 });
    expect(repository.create).toHaveBeenCalled();
    expect(repository.destroy).toHaveBeenCalledWith(["media-1"]);
    expect(repository.list).toHaveBeenCalledWith({ page: 1 });
  });

  it("tag application 只调用 repository", async () => {
    const repository = {
      create: vi.fn().mockResolvedValue({ id: "tag-1" }),
      update: vi.fn().mockResolvedValue({ id: "tag-1" }),
      destroy: vi.fn().mockResolvedValue({ success: true }),
      list: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    };
    await createTag(repository as never, {} as never);
    await updateTag(repository as never, { id: "tag-1" });
    await destroyTags(repository as never, ["tag-1"]);
    await getTagList(repository as never, { page: 1 });
    expect(repository.create).toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith({ id: "tag-1" });
    expect(repository.destroy).toHaveBeenCalledWith(["tag-1"]);
    expect(repository.list).toHaveBeenCalledWith({ page: 1 });
  });

  it("user application 只调用 repository", async () => {
    const repository = {
      detail: vi.fn().mockResolvedValue({ id: "user-1", name: "管理员" }),
      list: vi.fn().mockResolvedValue({ list: [], total: 0 }),
    };
    await expect(getUserDetail(repository as never, "user-1")).resolves.toEqual({ id: "user-1", name: "管理员" });
    await expect(getUserList(repository as never, { page: 1 })).resolves.toEqual({ list: [], total: 0 });
    expect(repository.detail).toHaveBeenCalledWith("user-1");
    expect(repository.list).toHaveBeenCalledWith({ page: 1 });
  });

  it("category、link、menu、page、setting application 只调用 repository", async () => {
    const category = { create: vi.fn(), update: vi.fn(), destroy: vi.fn(), list: vi.fn().mockResolvedValue({ list: [], total: 0 }) };
    await createCategory(category as never, {} as never);
    await destroyCategories(category as never, ["category-1"]);
    await getCategoryList(category as never, { page: 1 } as never);
    expect(category.create).toHaveBeenCalled();
    expect(category.destroy).toHaveBeenCalledWith(["category-1"]);
    expect(category.list).toHaveBeenCalled();

    const link = { create: vi.fn(), update: vi.fn(), destroy: vi.fn(), list: vi.fn().mockResolvedValue({ list: [], total: 0 }) };
    await createLink(link as never, {} as never);
    await destroyLinks(link as never, ["link-1"]);
    await getLinkList(link as never, { page: 1 } as never);
    expect(link.create).toHaveBeenCalled();
    expect(link.destroy).toHaveBeenCalledWith(["link-1"]);
    expect(link.list).toHaveBeenCalled();

    const menu = { saveAll: vi.fn(), list: vi.fn().mockResolvedValue([]) };
    await saveAllMenus(menu as never, [] as never);
    await getMenuList(menu as never);
    expect(menu.saveAll).toHaveBeenCalledWith([]);
    expect(menu.list).toHaveBeenCalled();

    const page = { create: vi.fn(), destroy: vi.fn(), update: vi.fn(), incrementViews: vi.fn(), list: vi.fn().mockResolvedValue({ list: [], total: 0 }), detail: vi.fn(), author: vi.fn() };
    await createPage(page as never, {} as never, "user-1");
    await destroyPages(page as never, ["page-1"]);
    await getPageList(page as never, { page: 1 } as never);
    await getPageDetail(page as never, "page-1");
    expect(page.create).toHaveBeenCalledWith({}, "user-1");
    expect(page.destroy).toHaveBeenCalledWith(["page-1"]);
    expect(page.list).toHaveBeenCalled();
    expect(page.detail).toHaveBeenCalledWith("page-1", "PUBLISHED_ONLY");

    const setting = { get: vi.fn(), update: vi.fn(), statistics: vi.fn() };
    await getSetting(setting as never);
    await updateSetting(setting as never, {} as never);
    expect(setting.get).toHaveBeenCalled();
    expect(setting.update).toHaveBeenCalled();
  });
});
