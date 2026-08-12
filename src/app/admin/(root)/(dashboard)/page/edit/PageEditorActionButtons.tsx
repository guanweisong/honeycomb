import { Button } from "@/packages/ui/components/button";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { useCan } from "@/app/admin/hooks/useCurrentUser";
import { Permission } from "@/packages/identity/auth/permissions";
import { PageStatus } from "@/packages/domain/content/page";

type PageEditorActionButtonsProps = {
  isEdit: boolean;
  loading: boolean;
  status?: PageStatus | string;
  onSubmit: (status: PageStatus) => void;
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
        <Button type="button" onClick={() => onSubmit(PageStatus.DRAFT)}>
          保存草稿
        </Button>
      )}
    </>
  );
}
