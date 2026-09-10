import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRevalidatePath = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
}));

import { publicContentInvalidator } from "./refresh-path";

describe("publicContentInvalidator", () => {
  beforeEach(() => mockRevalidatePath.mockReset());

  it("rejects arbitrary paths without invalidating cache", async () => {
    await expect(
      publicContentInvalidator.invalidateContent("/admin" as never),
    ).rejects.toThrow();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("builds the public archive path from a validated content reference", async () => {
    await publicContentInvalidator.invalidateContent({
      id: "507f1f77bcf86cd799439011",
      type: "post",
    });

    expect(mockRevalidatePath.mock.calls).toEqual([
      ["/zh/archives/507f1f77bcf86cd799439011"],
      ["/en/archives/507f1f77bcf86cd799439011"],
      ["/[locale]", "layout"],
    ]);
  });

  it("rejects invalid locales and identifiers", async () => {
    await expect(
      publicContentInvalidator.invalidateContent({
        id: "short",
        type: "page",
      }),
    ).rejects.toThrow();
    expect(mockRevalidatePath).not.toHaveBeenCalled();
  });

  it("invalidates the bounded public locale layout for writes without a target", async () => {
    await publicContentInvalidator.invalidateAll();

    expect(mockRevalidatePath).toHaveBeenCalledOnce();
    expect(mockRevalidatePath).toHaveBeenCalledWith("/[locale]", "layout");
  });
});
