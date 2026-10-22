import type { PageStatus } from "@/features/page/types/page.status";
import type { PostStatus } from "@/features/post/types/post.status";
import type { EnableStatus } from "@/lib/validation/enable-status";
import type { CommentRecord } from "./comment.read-model";

export type CommentTarget = Partial<
  Pick<CommentRecord, "postId" | "pageId" | "customId">
>;

export type CommentTargetReference = {
  type: "post" | "page" | "custom";
  id: string;
};

export type CommentTargetState =
  | { type: "page"; status: PageStatus }
  | {
      type: "post";
      status: PostStatus;
      commentStatus: EnableStatus;
    };
