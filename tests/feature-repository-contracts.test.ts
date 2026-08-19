import { describe, expect, it, vi } from "vitest";

import { createMedia, destroyMedia } from "@/features/media/application/media-commands";
import { getMediaList } from "@/features/media/application/media-queries";
import { createTag, destroyTags, getTagList, updateTag } from "@/features/tag/application";
import { getUserDetail, getUserList } from "@/features/user/application/user-queries";

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
});
