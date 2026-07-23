"use client";

import { Button } from "@/packages/ui/components/button";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { PostStatus } from "@/packages/trpc/api/modules/post/types/post.status";
import type { PostSubmitAction } from "../../hooks/usePostEditor";

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
  const isEdit = !!id;
  const isDraft = status === PostStatus.DRAFT;
  const isPublished = status === PostStatus.PUBLISHED;

  return (
    <>
      {isEdit && isPublished && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => submit(PostStatus.PUBLISHED, "update")}
        >
          更新
        </Button>
      )}
      {isEdit && isPublished && (
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
      {isEdit && isDraft && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => submit(PostStatus.DRAFT, "update")}
        >
          保存
        </Button>
      )}
      {((isEdit && isDraft) || !isEdit) && (
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
      {!isEdit && (
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
