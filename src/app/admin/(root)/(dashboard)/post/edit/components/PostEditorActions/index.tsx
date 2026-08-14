"use client";

import { Button } from "@/packages/ui/components/button";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { PostStatus } from "@/packages/domain/content/post-status";
import type { PostSubmitAction } from "../../hooks/use-post-editor";
import { Permission } from "@/packages/identity/auth/permissions";
import { useCan } from "@/app/admin/hooks/use-current-user";

interface PostEditorActionsProps {
  id?: string;
  loading: boolean;
  status?: string;
  submit: (status: PostStatus, action: PostSubmitAction) => Promise<void>;
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
          onOK={() => submit(PostStatus.DRAFT, "update")}
        />
      )}
      {canUpdatePost && isEdit && isDraft && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => submit(PostStatus.DRAFT, "update")}
        >
          保存
        </Button>
      )}
      {((canUpdatePost && isEdit && isDraft) || (canCreatePost && !isEdit)) && (
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
