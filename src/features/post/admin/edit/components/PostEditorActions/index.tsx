"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/Dialog";
import { PostStatus } from "@/features/post/types/post.status";
import type { PostSubmitAction } from "../../hooks/use-post-editor";
import { Permission } from "@/lib/auth/permissions";
import { useCan } from "@/features/user/admin/use-current-user";

interface PostEditorActionsProps {
  id?: string;
  loading: boolean;
  status?: string;
  submit: (status: PostStatus, action: PostSubmitAction) => Promise<boolean>;
}

export function PostEditorActions({
  id,
  loading,
  status,
  submit,
}: PostEditorActionsProps) {
  const canCreatePost = useCan(Permission.postCreate);
  const canUpdatePost = useCan(Permission.postUpdate);
  const isEdit = !!id;
  const isDraft = status === PostStatus.DRAFT;
  const isPublished = status === PostStatus.PUBLISHED;
  const isAwaitingAudit = status === PostStatus.TO_AUDIT;
  const canSaveUnpublished =
    canUpdatePost && isEdit && (isDraft || isAwaitingAudit);

  return (
    <>
      {canUpdatePost && isEdit && isPublished && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => submit(PostStatus.PUBLISHED, "update")}
        >
          更新
        </Button>
      )}
      {canUpdatePost && isEdit && isPublished && (
        <Dialog
          trigger={
            <Button type="button" variant="secondary" disabled={loading}>
              撤回为草稿
            </Button>
          }
          type="danger"
          title="确定要撤回吗？"
          OKProps={{ disabled: loading }}
          onOK={() => submit(PostStatus.DRAFT, "update")}
        />
      )}
      {canSaveUnpublished && (
        <Button
          type="button"
          disabled={loading}
          onClick={() =>
            submit(
              isAwaitingAudit ? PostStatus.TO_AUDIT : PostStatus.DRAFT,
              "update",
            )
          }
        >
          {isAwaitingAudit ? "保存待审核" : "保存"}
        </Button>
      )}
      {(canSaveUnpublished || (canCreatePost && !isEdit)) && (
        <Button
          type="button"
          disabled={loading}
          onClick={() =>
            submit(PostStatus.PUBLISHED, isEdit ? "update" : "create")
          }
        >
          发布
        </Button>
      )}
      {canCreatePost && !isEdit && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => submit(PostStatus.DRAFT, "create")}
        >
          保存草稿
        </Button>
      )}
    </>
  );
}
/**
 * 文章编辑操作按钮，负责根据文章状态和权限展示提交操作。
 */
