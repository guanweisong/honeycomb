"use client";

import { LocalDraftPrompt } from "@/components/admin/local-draft";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PhotoPickerModal from "@/features/media/components/PhotoPicker/index";
import { MediaPageShell } from "@/features/media/shared/MediaPageShell";
import { Form } from "@/components/ui/form";
import {
  useAdminLayoutActions,
  useAdminLayoutPageTitle,
} from "@/components/admin/layout-context";
import AddCategoryModal from "../../../category/admin/components/AddCategoryModal";
import { PostEditorActions } from "./components/PostEditorActions";
import { PostSidebarFields } from "./components/PostSidebarFields";
import { PostTypeFields } from "./components/PostTypeFields";
import { usePostEditor } from "./hooks/use-post-editor";
import { EditorLoadError } from "@/components/admin/editor-load-error";
import LoadingState from "@/components/LoadingState";

function PostDetailContent() {
  const id = useSearchParams().get("id");
  const editor = usePostEditor(id);
  const {
    detail,
    form,
    loading,
    readOnly,
    modalProps,
    setCoverPreview,
    setModalProps,
    setShowPhotoPicker,
    showPhotoPicker,
    submit,
    type,
  } = editor;

  const headerActions = editor.loadError ? null : (
    <div className="flex flex-wrap gap-3">
      <PostEditorActions
        id={detail?.id}
        loading={loading}
        status={detail?.status}
        submit={submit}
      />
    </div>
  );

  useAdminLayoutPageTitle(
    id ? "修改文章" : "添加新文章",
    `${id ?? "new"}:${loading}`,
  );
  useAdminLayoutActions(
    headerActions,
    `${detail?.id ?? "new"}:${detail?.status ?? "draft"}:${loading}:${editor.loadError}:${editor.actionsKey}`,
  );

  if (editor.loadError) {
    return (
      <EditorLoadError
        kind="文章"
        notFound={editor.loadError === "not-found"}
        listHref="/admin/post"
        onRetry={editor.retryLoad}
      />
    );
  }

  return (
    <div inert={readOnly} aria-busy={readOnly}>
      {editor.saveProblem && (
        <div
          role="status"
          className="mb-4 rounded-md border border-amber-300 p-3 text-sm"
        >
          <p>
            {editor.saveProblem === "conflict"
              ? "服务器版本已改变，本地编辑仍保留。请加载最新版本后核对，不会自动覆盖服务器。"
              : "保存结果暂时无法确认，本地编辑仍保留。请先核对，不要重复新建。"}
          </p>
          {id && (
            <button
              type="button"
              className="underline"
              disabled={loading}
              onClick={() => void editor.loadLatest()}
            >
              保留本地内容并加载最新版本
            </button>
          )}
        </div>
      )}
      {editor.preservedDraft && (
        <div role="status" className="mb-4 text-sm">
          已保留加载前的本地内容。
          <button
            type="button"
            className="underline"
            onClick={editor.restorePreservedDraft}
          >
            恢复本地内容以核对
          </button>
        </div>
      )}
      {editor.creationAttempt && (
        <div
          role="status"
          className="mb-4 rounded-md border border-amber-300 p-3 text-sm"
        >
          <p>
            存在尚未确认的创建请求。先核对上次结果；重试只使用原始内容，不包含之后的编辑。
          </p>
          {editor.creationResult.data ? (
            <button
              type="button"
              className="underline"
              onClick={editor.openCreated}
            >
              打开已创建文章
            </button>
          ) : (
            <>
              <p>
                查无结果不代表从未创建。如果文章已删除，重试可能重新创建，请先人工核对。
              </p>
              <button
                type="button"
                className="mr-3 underline"
                disabled={loading}
                onClick={() => void editor.creationResult.refetch()}
              >
                核对上次结果
              </button>
              <button
                type="button"
                className="underline"
                disabled={loading}
                onClick={() => void editor.retryCreation()}
              >
                已核对，重试原始创建
              </button>
            </>
          )}
        </div>
      )}
      {editor.draft && <LocalDraftPrompt {...editor.draft} />}
      <Form {...form}>
        <form onSubmit={(event) => event.preventDefault()}>
          <div className="lg:flex lg:gap-8">
            <div className="lg:flex-1 flex flex-col gap-3 mb-3">
              <PostTypeFields type={type} />
            </div>
            <div className="lg:w-80 space-y-4">
              <PostSidebarFields editor={editor} />
            </div>
          </div>
        </form>
      </Form>

      <PhotoPickerModal
        pickerContent={(onSelect) => <MediaPageShell onSelect={onSelect} />}
        showPhotoPicker={showPhotoPicker}
        handlePhotoPickerOk={(media) => {
          form.setValue("coverId", media.id, { shouldDirty: true });
          setCoverPreview(media);
          setShowPhotoPicker(false);
        }}
        handlePhotoPickerCancel={() => setShowPhotoPicker(false)}
      />
      <AddCategoryModal modalProps={modalProps} setModalProps={setModalProps} />
    </div>
  );
}

export default function PostDetail() {
  return (
    <Suspense fallback={<LoadingState variant="region" />}>
      <PostDetailContent />
    </Suspense>
  );
}
