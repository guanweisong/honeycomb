"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/Dialog";
import type { PostWithRelations } from "@/features/post/types/post.read-model";
import { PostStatus } from "@/features/post/types/post.status";
import { Permission } from "@/lib/auth/permissions";
import { useCan } from "@/app/admin/(dashboard)/providers/use-current-user";

interface PostEditorActionsProps {
  id?: string;
  loading: boolean;
  status?: `${PostWithRelations["status"]}`;
  submit: (status: PostStatus) => Promise<boolean>;
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
          onClick={() => submit(PostStatus.PUBLISHED)}
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
          onOK={() => submit(PostStatus.DRAFT)}
        />
      )}
      {canSaveUnpublished && (
        <Button
          type="button"
          disabled={loading}
          onClick={() =>
            submit(isAwaitingAudit ? PostStatus.TO_AUDIT : PostStatus.DRAFT)
          }
        >
          {isAwaitingAudit ? "保存待审核" : "保存"}
        </Button>
      )}
      {(canSaveUnpublished || (canCreatePost && !isEdit)) && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => submit(PostStatus.PUBLISHED)}
        >
          发布
        </Button>
      )}
      {canCreatePost && !isEdit && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => submit(PostStatus.DRAFT)}
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
