import { describe, expect, it, vi } from "vitest";
import { EnableStatus } from "@/packages/domain/shared/enable-status";

import type { LinkViewModel as LinkEntity } from "../../presentation/link-view-model";

import { submitLinkUpdate } from "./link-actions";

const link = {
  id: "link-1",
  name: "OpenAI",
  url: "https://openai.com",
  logo: "https://openai.com/logo.png",
  description: null,
  status: EnableStatus.ENABLE,
  createdAt: "2026-01-02T03:04:05.000Z",
  updatedAt: null,
} as LinkEntity;

describe("link action state", () => {
  it("reports update failures without refreshing", async () => {
    const refetch = vi.fn();
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();

    await expect(
      submitLinkUpdate({
        record: link,
        values: { id: "forged-id", name: "Updated" },
        update: vi.fn().mockRejectedValue(new Error("update failed")),
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("error");
    expect(notifyError).toHaveBeenCalledWith("更新失败");
    expect(refetch).not.toHaveBeenCalled();
    expect(notifySuccess).not.toHaveBeenCalled();
  });

  it("updates only the selected target and fails closed without one", async () => {
    const update = vi.fn().mockResolvedValue(link);
    const refetch = vi.fn();
    const notifySuccess = vi.fn();
    const notifyError = vi.fn();

    await expect(
      submitLinkUpdate({
        record: link,
        values: { id: "forged-id", name: "Updated" },
        update,
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("success");
    expect(update).toHaveBeenCalledWith({ id: "link-1", name: "Updated" });
    expect(refetch).toHaveBeenCalledOnce();
    expect(notifySuccess).toHaveBeenCalledWith("更新成功");

    update.mockClear();
    await expect(
      submitLinkUpdate({
        record: undefined,
        values: { id: "forged-id", name: "Updated" },
        update,
        refetch,
        notifySuccess,
        notifyError,
      }),
    ).resolves.toBe("missing-target");
    expect(update).not.toHaveBeenCalled();
    expect(notifyError).toHaveBeenCalledWith("缺少记录ID");
  });

});
