import { describe, expect, it, vi } from "vitest";

import { PageStatus } from "@/features/page/types/page.status";
import { PageTemplate } from "@/features/page/types/page.template";
import { submitPageEditor } from "./page-editor-actions";

type SubmitOptions = Parameters<typeof submitPageEditor>[0];

const creationToken = "11111111-1111-4111-8111-111111111111";
const values = {
  title: { en: "About", zh: "关于" },
  content: { en: "English", zh: "中文" },
  template: PageTemplate.DEFAULT,
} satisfies SubmitOptions["values"];

describe("page editor action state", () => {
  it("creates with the requested status and returns the new page id", async () => {
    const create = vi
      .fn()
      .mockResolvedValue({ id: "page-created", version: 0 });

    await expect(
      submitPageEditor({
        pageId: undefined,
        values: {
          ...values,
          creationToken: "11111111-1111-4111-8111-111111111111",
        },
        status: PageStatus.DRAFT,
        create,
        update: vi.fn(),
      }),
    ).resolves.toEqual({ state: "created", id: "page-created", version: 0 });
    expect(create).toHaveBeenCalledWith({
      ...values,
      creationToken: "11111111-1111-4111-8111-111111111111",
      status: PageStatus.DRAFT,
    });
  });

  it("updates the existing id and reports mutation failures without redirecting", async () => {
    const update = vi.fn().mockRejectedValue(new Error("network unavailable"));

    await expect(
      submitPageEditor({
        pageId: "507f1f77bcf86cd799439011",
        expectedVersion: 3,
        values,
        status: PageStatus.PUBLISHED,
        create: vi.fn(),
        update,
      }),
    ).resolves.toEqual({ state: "unknown" });
    expect(update).toHaveBeenCalledWith({
      id: "507f1f77bcf86cd799439011",
      expectedVersion: 3,
      ...values,
      status: PageStatus.PUBLISHED,
    });

    update.mockResolvedValue({ id: "507f1f77bcf86cd799439011", version: 4 });
    await expect(
      submitPageEditor({
        pageId: "507f1f77bcf86cd799439011",
        expectedVersion: 3,
        values,
        status: PageStatus.PUBLISHED,
        create: vi.fn(),
        update,
      }),
    ).resolves.toEqual({
      state: "updated",
      id: "507f1f77bcf86cd799439011",
      version: 4,
    });
  });

  it("reports local schema rejection without calling create", async () => {
    const create = vi.fn<SubmitOptions["create"]>();
    await expect(
      submitPageEditor({
        values,
        status: PageStatus.DRAFT,
        create,
        update: vi.fn(),
      }),
    ).resolves.toEqual({ state: "error" });
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    [new Error("create failed"), "unknown"],
    [{ data: { code: "BAD_REQUEST" } }, "error"],
  ])(
    "classifies create failures after invoking the mutation %#",
    async (error, state) => {
      const create = vi.fn<SubmitOptions["create"]>().mockRejectedValue(error);
      await expect(
        submitPageEditor({
          values: { ...values, creationToken },
          status: PageStatus.DRAFT,
          create,
          update: vi.fn(),
        }),
      ).resolves.toEqual({ state });
      expect(create).toHaveBeenCalledExactlyOnceWith({
        ...values,
        creationToken,
        status: PageStatus.DRAFT,
      });
    },
  );
});

describe("versioned page outcomes", () => {
  it("keeps an unavailable response distinct from a rejected write", async () => {
    const result = await submitPageEditor({
      pageId: "507f1f77bcf86cd799439011",
      expectedVersion: 3,
      values,
      status: PageStatus.DRAFT,
      create: vi.fn(),
      update: vi.fn().mockRejectedValue(new Error("offline")),
    });
    expect(result.state).toBe("unknown");
  });
  it("reports a concurrency conflict without discarding input", async () => {
    const update = vi.fn().mockRejectedValue({ data: { code: "CONFLICT" } });
    const result = await submitPageEditor({
      pageId: "507f1f77bcf86cd799439011",
      expectedVersion: 3,
      values,
      status: PageStatus.DRAFT,
      create: vi.fn(),
      update,
    });
    expect(result.state).toBe("conflict");
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ expectedVersion: 3 }),
    );
  });
});

describe("page transport error classification", () => {
  it.each([
    ["BAD_REQUEST", "error"],
    ["FORBIDDEN", "error"],
    ["UNAUTHORIZED", "error"],
    ["NOT_FOUND", "error"],
    ["CONFLICT", "conflict"],
    ["INTERNAL_SERVER_ERROR", "unknown"],
    [undefined, "unknown"],
    [400, "unknown"],
  ])("classifies code %s as %s", async (code, state) => {
    await expect(
      submitPageEditor({
        pageId: "507f1f77bcf86cd799439011",
        expectedVersion: 3,
        values,
        status: PageStatus.DRAFT,
        create: vi.fn(),
        update: vi.fn().mockRejectedValue({ data: { code } }),
      }),
    ).resolves.toEqual({ state });
  });
});
