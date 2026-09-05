import { expect, it, vi } from "vitest";
import { PageStatus } from "@/packages/domain/content/page";
import { submitPageEditor } from "./page-editor-actions";

it("does not submit incomplete create input to the mutation", async () => {
  const create = vi.fn().mockResolvedValue({ id: "unexpected" });
  const result = await submitPageEditor({
    values: {},
    status: PageStatus.DRAFT,
    create,
    update: vi.fn(),
  });
  expect(result).toEqual({ state: "error" });
  expect(create).not.toHaveBeenCalled();
});
