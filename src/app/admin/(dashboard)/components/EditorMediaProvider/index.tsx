"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import {
  TiptapMediaPickerProvider,
  type MediaPickerRenderer,
} from "@/components/Editor/media-picker";
import LoadingState from "@/components/LoadingState";

const loading = () => (
  <LoadingState
    variant="inline"
    label="正在加载媒体选择器…"
    visuallyHiddenLabel
  />
);

const PhotoPickerModal = dynamic(
  () => import("@/app/admin/(dashboard)/components/PhotoPicker"),
  { loading },
);
export function EditorMediaProvider({ children }: { children: ReactNode }) {
  const renderMediaPicker: MediaPickerRenderer = ({
    open,
    onConfirm,
    onCancel,
  }) => {
    if (!open) return null;

    return (
      <PhotoPickerModal
        showPhotoPicker
        handlePhotoPickerOk={(media) => onConfirm({ url: media.url })}
        handlePhotoPickerCancel={onCancel}
      />
    );
  };

  return (
    <TiptapMediaPickerProvider renderer={renderMediaPicker}>
      {children}
    </TiptapMediaPickerProvider>
  );
}
