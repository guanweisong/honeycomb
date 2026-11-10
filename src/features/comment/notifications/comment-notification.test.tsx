import { render } from "react-email";
import { describe, expect, it, vi } from "vitest";
import { CommentStatus } from "@/features/comment/types/comment.status";
import type { NotificationComment } from "@/features/comment/types/comment.notification";
import { getCommentTarget } from "@/features/comment/notifications/comment-notification";
import AdminCommentEmailMessage from "@/features/comment/notifications/templates/AdminCommentEmailMessage";

vi.mock("@/env/client", () => ({
  clientEnv: { NEXT_PUBLIC_SITE_URL: "http://localhost:3000/blog/" },
}));

const comment: NotificationComment = {
  id: "comment-1",
  author: "Reader",
  email: "reader@example.test",
  content: "Current comment body",
  site: null,
  parentId: null,
  postId: null,
  pageId: null,
  customId: "custom-1",
  status: CommentStatus.PUBLISH,
  createdAt: null,
  updatedAt: null,
  userAgent: null,
  ip: null,
  post: null,
  page: null,
};
const setting = { siteName: { zh: "站点", en: "Site" } };

function parsedEmail(html: string) {
  return new DOMParser().parseFromString(html, "text/html");
}

describe("comment notification targets", () => {
  it("uses the approved generic title and no target link for custom comments", () => {
    expect(getCommentTarget(comment)).toEqual({
      postTitle: "自定义内容收到评论",
      postLink: null,
    });
  });

  it.each([
    {
      target: {
        postId: "post-1",
        post: { id: "post-1", title: { zh: "文章", en: "Post" } },
      },
      title: "文章",
      path: "archives/post-1",
    },
    {
      target: {
        pageId: "page-1",
        page: { id: "page-1", title: { zh: "页面", en: "Page" } },
      },
      title: "页面",
      path: "pages/page-1",
    },
  ])(
    "retains configured scheme and base path for $path",
    ({ target, title, path }) => {
      expect(
        getCommentTarget({ ...comment, customId: null, ...target }),
      ).toEqual({
        postTitle: title,
        postLink: `http://localhost:3000/blog/${path}`,
      });
    },
  );

  it("keeps custom admin notification content without an empty or guessed link", async () => {
    const document = parsedEmail(
      await render(
        <AdminCommentEmailMessage currentComment={comment} setting={setting} />,
      ),
    );
    expect(document.body.textContent).toContain("自定义内容收到评论");
    expect(document.body.textContent).toContain("Current comment body");
    expect(document.querySelector("a")).toBeNull();
  });

  it.each(["post", "page"] as const)(
    "retains verified target links in the %s email",
    async (type) => {
      const targetComment: NotificationComment = {
        ...comment,
        customId: null,
        ...(type === "post"
          ? {
              postId: "post-1",
              post: { id: "post-1", title: { zh: "文章", en: "Post" } },
            }
          : {
              pageId: "page-1",
              page: { id: "page-1", title: { zh: "页面", en: "Page" } },
            }),
      };
      const expectedLink = `http://localhost:3000/blog/${type === "post" ? "archives/post-1" : "pages/page-1"}`;
      const document = parsedEmail(
        await render(
          <AdminCommentEmailMessage
            currentComment={targetComment}
            setting={setting}
          />,
        ),
      );
      expect(document.querySelector("a")?.getAttribute("href")).toBe(
        expectedLink,
      );
      expect(document.body.textContent).toContain("Current comment body");
    },
  );

  it("renders user content as text while retaining multiline email styles", async () => {
    const currentComment: NotificationComment = {
      ...comment,
      customId: null,
      author: '<img src=x onerror="alert(1)"> & Reader',
      content: '<script>alert("current")</script>\nSecond line & <b>text</b>',
      postId: "post-1",
      post: {
        id: "post-1",
        title: { zh: '<a href="https://evil.test">Title</a>', en: "Post" },
      },
    };
    const unsafeSetting = {
      siteName: { zh: "Site <img src=x>", en: "Site" },
    };
    const email = (
      <AdminCommentEmailMessage
        currentComment={currentComment}
        setting={unsafeSetting}
      />
    );
    const document = parsedEmail(await render(email));

    expect(document.body.textContent).toContain(currentComment.author);
    expect(document.body.textContent).toContain(currentComment.content);
    expect(document.body.textContent).toContain(currentComment.post?.title?.zh);
    expect(document.body.textContent).toContain(unsafeSetting.siteName.zh);
    expect(
      document.querySelector("script, img, svg, [onerror], [onload]"),
    ).toBeNull();
    expect(document.querySelectorAll("a")).toHaveLength(1);
    expect(document.querySelector("a")?.getAttribute("href")).toBe(
      "http://localhost:3000/blog/archives/post-1",
    );
    const body = Array.from(document.querySelectorAll("p")).find(
      (paragraph) => paragraph.textContent === currentComment.content,
    );
    expect(body?.style.whiteSpace).toBe("pre-wrap");
    expect(body?.style.borderStyle).toBe("dashed");
  });
});
