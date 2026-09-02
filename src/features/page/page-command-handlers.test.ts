import { describe, expect, it, vi } from "vitest";
import { PageStatus } from "@/packages/domain/content/page";
import { updatePage } from "./application/page-use-cases";

describe("Page command use cases", () => {
  it("更新页面状态时必须先经过页面生命周期规则", async () => {
    const findStatus = vi.fn().mockResolvedValue(PageStatus.DRAFT);
    const update = vi.fn().mockResolvedValue({ id: "page-1" });

    await updatePage(
      { findStatus, update } as never,
      { id: "page-1", title: { en: "About", zh: "关于" }, status: PageStatus.PUBLISHED },
    );

    expect(findStatus).toHaveBeenCalledWith("page-1");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ id: "page-1", status: PageStatus.PUBLISHED }),
    );
  });

  it("页面状态未变化时仍读取当前状态并执行普通更新", async () => {
    const findStatus = vi.fn().mockResolvedValue(PageStatus.DRAFT);
    const update = vi.fn().mockResolvedValue({ id: "page-1" });

    await updatePage(
      { findStatus, update } as never,
      { id: "page-1", status: PageStatus.DRAFT },
    );

    expect(findStatus).toHaveBeenCalledWith("page-1");
    expect(update).toHaveBeenCalledWith({ id: "page-1", status: PageStatus.DRAFT });
  });

  it("拒绝页面不支持的状态流转", async () => {
    const findStatus = vi.fn().mockResolvedValue(PageStatus.PUBLISHED);
    const update = vi.fn();

    await expect(
      updatePage(
        { findStatus, update } as never,
        { id: "page-1", status: PageStatus.TO_AUDIT },
      ),
    ).rejects.toThrow();

    expect(update).not.toHaveBeenCalled();
  });
});
