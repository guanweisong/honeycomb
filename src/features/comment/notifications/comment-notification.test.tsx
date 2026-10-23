import { render } from "react-email";
import { describe, expect, it, vi } from "vitest";
import { CommentStatus } from "@/features/comment/types/comment.status";
import type { NotificationComment } from "@/features/comment/types/comment.notification";
import { getCommentTarget } from "./comment-notification";
import AdminCommentEmailMessage from "./templates/AdminCommentEmailMessage";
import ReplyCommentEmailMessage from "./templates/ReplyCommentEmailMessage";

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

  it("keeps both reply bodies for custom targets without an empty or guessed link", async () => {
    const parentComment = {
      ...comment,
      id: "parent",
      content: "Parent comment body",
    };
    const document = parsedEmail(
      await render(
        <ReplyCommentEmailMessage
          currentComment={comment}
          parentComment={parentComment}
          setting={setting}
        />,
      ),
    );
    expect(document.body.textContent).toContain("自定义内容收到评论");
    expect(document.body.textContent).toContain("Current comment body");
    expect(document.body.textContent).toContain("Parent comment body");
    expect(document.querySelector("a")).toBeNull();
  });

  it.each(["post", "page"] as const)(
    "retains verified target links in both %s email templates",
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
      for (const email of [
        <AdminCommentEmailMessage
          key="admin"
          currentComment={targetComment}
          setting={setting}
        />,
        <ReplyCommentEmailMessage
          key="reply"
          currentComment={targetComment}
          parentComment={targetComment}
          setting={setting}
        />,
      ]) {
        const document = parsedEmail(await render(email));
        expect(document.querySelector("a")?.getAttribute("href")).toBe(
          expectedLink,
        );
        expect(document.body.textContent).toContain("Current comment body");
      }
    },
  );

  it.each(["admin", "reply"] as const)(
    "renders %s user content as text while retaining multiline email styles",
    async (type) => {
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
      const parentComment = {
        ...currentComment,
        author: "Parent <svg onload=alert(1)>",
        content: '<script>alert("parent")</script> & parent body',
      };
      const unsafeSetting = {
        siteName: { zh: "Site <img src=x>", en: "Site" },
      };
      const email =
        type === "admin" ? (
          <AdminCommentEmailMessage
            currentComment={currentComment}
            setting={unsafeSetting}
          />
        ) : (
          <ReplyCommentEmailMessage
            currentComment={currentComment}
            parentComment={parentComment}
            setting={unsafeSetting}
          />
        );
      const document = parsedEmail(await render(email));

      expect(document.body.textContent).toContain(currentComment.author);
      expect(document.body.textContent).toContain(currentComment.content);
      expect(document.body.textContent).toContain(
        currentComment.post?.title?.zh,
      );
      expect(document.body.textContent).toContain(unsafeSetting.siteName.zh);
      if (type === "reply") {
        expect(document.body.textContent).toContain(parentComment.author);
        expect(document.body.textContent).toContain(parentComment.content);
      }
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
    },
  );
});
