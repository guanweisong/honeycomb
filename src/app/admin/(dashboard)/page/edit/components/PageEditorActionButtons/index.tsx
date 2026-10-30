import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/Dialog";
import { useCan } from "@/app/admin/(dashboard)/providers/use-current-user";
import { Permission } from "@/lib/auth/permissions";
import type { PageRecord } from "@/features/page/types/page.read-model";
import { PageStatus } from "@/features/page/types/page.status";

type PageEditorActionButtonsProps = {
  isEdit: boolean;
  loading: boolean;
  status?: `${PageRecord["status"]}`;
  onSubmit: (status: PageStatus) => Promise<boolean>;
};

export function PageEditorActionButtons({
  isEdit,
  loading,
  status,
  onSubmit,
}: PageEditorActionButtonsProps) {
  const canCreatePage = useCan(Permission.pageCreate);
  const canUpdatePage = useCan(Permission.pageUpdate);
  const isDraft = status === PageStatus.DRAFT;
  const isPublished = status === PageStatus.PUBLISHED;

  return (
    <>
      {canUpdatePage && isEdit && isPublished && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => onSubmit(PageStatus.PUBLISHED)}
        >
          更新
        </Button>
      )}
      {canUpdatePage && isEdit && isPublished && (
        <Dialog
          trigger={
            <Button type="button" variant="secondary" disabled={loading}>
              撤回为草稿
            </Button>
          }
          type="danger"
          title="确定要撤回吗？"
          onOK={() => onSubmit(PageStatus.DRAFT)}
        />
      )}
      {canUpdatePage && isEdit && isDraft && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => onSubmit(PageStatus.DRAFT)}
        >
          保存
        </Button>
      )}
      {((canUpdatePage && isEdit && isDraft) || (canCreatePage && !isEdit)) && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => onSubmit(PageStatus.PUBLISHED)}
        >
          发布
        </Button>
      )}
      {canCreatePage && !isEdit && (
        <Button
          type="button"
          disabled={loading}
          onClick={() => onSubmit(PageStatus.DRAFT)}
        >
          保存草稿
        </Button>
      )}
    </>
  );
}
/**
 * 页面编辑操作按钮，负责根据页面状态和权限展示可用操作。
 */
