import { beforeEach, expect, it, vi } from "vitest";
import { MediaDeleteSchema } from "../schema";
import { mediaRouter } from "../router";
import {
  createAdminUser,
  createGuestUser,
  createMockContext,
  createMockDb,
} from "@tests/helpers/test-utils";
import { TEST_IDS } from "@tests/helpers/test-constants";
const service = vi.hoisted(() => ({
  begin: vi.fn(),
  confirm: vi.fn(),
  destroy: vi.fn(),
}));
vi.mock("../server", () => ({
  beginMediaUpload: service.begin,
  confirmMediaUpload: service.confirm,
  destroyMedia: service.destroy,
}));
vi.mock("@/lib/storage/S3", () => ({ default: {} }));
vi.mock("@/lib/cache/refresh-path", () => ({
  publicContentInvalidator: { invalidate: vi.fn() },
}));
beforeEach(() => vi.clearAllMocks());
function caller(admin = true) {
  return mediaRouter.createCaller(
    createMockContext(
      admin ? createAdminUser(TEST_IDS.ID_1) : createGuestUser(TEST_IDS.ID_2),
      createMockDb(),
    ),
  );
}
it("routes authenticated upload intent and actor, not client object metadata", async () => {
  service.begin.mockResolvedValue({
    id: TEST_IDS.ID_1,
    uploadUrl: "https://storage.test/temporary/a.png",
    expiresAt: "later",
  });
  const result = await caller().beginUpload({
    name: "test.png",
    type: "image/png",
    size: 1,
  });
  expect(result).toEqual({
    id: TEST_IDS.ID_1,
    uploadUrl: "https://storage.test/temporary/a.png",
    expiresAt: "later",
  });
  expect(service.begin.mock.calls[0]?.[3]).toBe(TEST_IDS.ID_1);
});
it("denies guest upload and confirmation before business calls", async () => {
  await expect(
    caller(false).beginUpload({ name: "test.png", type: "image/png", size: 1 }),
  ).rejects.toThrow();
  await expect(
    caller(false).confirmUpload({ id: TEST_IDS.ID_1 }),
  ).rejects.toThrow();
  expect(service.begin).not.toHaveBeenCalled();
  expect(service.confirm).not.toHaveBeenCalled();
});
it("requires explicit unknown-reference risk acknowledgment", async () => {
  // Runtime parsing must reject a bypassed client even when TypeScript is not in use.
  const result = MediaDeleteSchema.safeParse({ ids: [TEST_IDS.ID_1] });
  expect(result?.success).toBe(false);
});
it("routes deletion acknowledgment and preserves committed refresh outcome", async () => {
  service.destroy.mockResolvedValue({ success: true, publicSync: "degraded" });
  expect(
    await caller().destroy({
      ids: [TEST_IDS.ID_1],
      acknowledgeUnknownReferences: true,
    }),
  ).toEqual({ success: true, publicSync: "degraded" });
  expect(service.destroy.mock.calls[0]?.slice(-2)).toEqual([
    TEST_IDS.ID_1,
    true,
  ]);
});
it("does not expose the old arbitrary-key registration endpoints", () => {
  expect(Object.keys(mediaRouter._def.procedures)).not.toContain("upload");
  expect(Object.keys(mediaRouter._def.procedures)).not.toContain(
    "getPresignedUrl",
  );
});
