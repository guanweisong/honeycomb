"use client";

import { LocalDraftPrompt } from "@/packages/ui/admin/local-draft";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PhotoPickerModal from "@/features/post/admin/edit/components/PhotoPicker";
import { MediaPageShell } from "@/features/media/public";
import { Form } from "@/packages/ui/components/form";
import {
  useAdminLayoutActions,
  useAdminLayoutPageTitle,
} from "@/packages/ui/extended/AdminLayout";
import AddCategoryModal from "../category/components/AddCategoryModal";
import { PostEditorActions } from "./components/PostEditorActions";
import { PostSidebarFields } from "./components/PostSidebarFields";
import { PostTypeFields } from "./components/PostTypeFields";
import { usePostEditor } from "./hooks/use-post-editor";
import { EditorLoadError } from "@/packages/ui/admin/editor-load-error";
import LoadingState from "@/packages/ui/extended/LoadingState";

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
    `${detail?.id ?? "new"}:${detail?.status ?? "draft"}:${loading}:${editor.loadError}`,
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
      {editor.draft && <LocalDraftPrompt {...editor.draft} />}
      <Form {...form}>
        <form>
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
