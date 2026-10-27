import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryObservability } from "@tests/helpers/memory-observability";
import { configureObservability } from "@/lib/observability/server";
import { CommentStatus } from "@/features/comment/types/comment.status";
import { sendCommentEmail } from "@/features/comment/notifications/comment-email";

vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_SITE_URL: "https://blog.example.test/blog/" },
}));

const currentComment = {
  id: "comment-1",
  author: "Reader <b>name</b>",
  content: "Current <script>alert(1)</script> & body",
  site: null,
  email: "reader@example.test",
  parentId: "parent-1",
  postId: "post-1",
  pageId: null,
  customId: null,
  status: CommentStatus.PUBLISH,
  createdAt: null,
  updatedAt: null,
  userAgent: null,
  ip: null,
  post: { id: "post-1", title: { zh: "文章", en: "Post" } },
  page: null,
};
const payload = {
  setting: { siteName: { zh: "站点", en: "Site" } },
  currentComment,
  parentComment: {
    ...currentComment,
    id: "parent-1",
    author: "Parent",
    email: "parent@example.test",
    content: "Parent <b>original</b> & body",
  },
} satisfies Parameters<typeof sendCommentEmail>[1];

describe("comment email real SDK transport", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "synthetic-api-key");
    vi.stubEnv("RESEND_FROM_EMAIL", "sender@example.test");
    vi.stubEnv("ADMIN_EMAIL", "admin@example.test");
    configureObservability(createMemoryObservability());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    configureObservability();
  });

  it.each([
    {
      type: "ADMIN_NOTICE",
      to: "admin@example.test",
      subject: "[站点]有一条新的评论",
    },
    {
      type: "REPLY_NOTICE",
      to: "parent@example.test",
      subject: "您在[站点]的评论有新的回复",
    },
  ] as const)(
    "sends rendered $type HTML to its intended recipient",
    async ({ type, to, subject }) => {
      const fetchMock = vi.fn<typeof fetch>(() =>
        Promise.resolve(Response.json({ id: "synthetic-message" })),
      );
      vi.stubGlobal("fetch", fetchMock);

      await sendCommentEmail(type, payload);

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const request = fetchMock.mock.calls[0];
      expect(request?.[0]).toBe("https://api.resend.com/emails");
      expect(request?.[1]?.method).toBe("POST");
      expect(request?.[1]?.signal).toBeInstanceOf(AbortSignal);
      expect(request?.[1]?.signal?.aborted).toBe(false);
      expect(new Headers(request?.[1]?.headers).get("authorization")).toBe(
        "Bearer synthetic-api-key",
      );
      const body: unknown = JSON.parse(String(request?.[1]?.body));
      expect(body).toMatchObject({
        from: "sender@example.test",
        to,
        subject,
      });
      expect(body).not.toHaveProperty("react");
      expect(body).toMatchObject({
        html: expect.stringContaining(
          "Current &lt;script&gt;alert(1)&lt;/script&gt; &amp; body",
        ),
      });
      expect(body).toMatchObject({
        html: expect.stringContaining(
          'href="https://blog.example.test/blog/archives/post-1"',
        ),
      });
      if (type === "REPLY_NOTICE") {
        expect(body).toMatchObject({
          html: expect.stringContaining(
            "Parent &lt;b&gt;original&lt;/b&gt; &amp; body",
          ),
        });
      }
    },
  );
});
