"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PhotoPickerModal from "@/app/admin/components/PhotoPicker";
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

function PostDetailContent() {
  const id = useSearchParams().get("id") as string;
  const editor = usePostEditor(id);
  const {
    detail,
    form,
    loading,
    modalProps,
    setCoverPreview,
    setModalProps,
    setShowPhotoPicker,
    showPhotoPicker,
    submit,
    type,
  } = editor;

  const headerActions = (
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
    `${detail?.id ?? "new"}:${detail?.status ?? "draft"}:${loading}`,
  );

  return (
    <>
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
        showPhotoPicker={showPhotoPicker}
        handlePhotoPickerOk={(media) => {
          form.setValue("coverId", media.id, { shouldDirty: true });
          setCoverPreview(media);
          setShowPhotoPicker(false);
        }}
        handlePhotoPickerCancel={() => setShowPhotoPicker(false)}
      />
      <AddCategoryModal modalProps={modalProps} setModalProps={setModalProps} />
    </>
  );
}

export default function PostDetail() {
  return (
    <Suspense fallback={null}>
      <PostDetailContent />
    </Suspense>
  );
}
