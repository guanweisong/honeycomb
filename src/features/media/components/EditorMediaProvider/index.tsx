"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import {
  TiptapMediaPickerProvider,
  type MediaPickerRenderer,
} from "@/components/editor/media-picker";
import LoadingState from "@/components/LoadingState";

const loading = () => (
  <LoadingState
    variant="inline"
    label="正在加载媒体选择器…"
    visuallyHiddenLabel
  />
);

const PhotoPickerModal = dynamic(() => import("../PhotoPicker"), { loading });
const MediaPageShell = dynamic(
  () =>
    import("@/features/media/shared/MediaPageShell").then((module) => module.MediaPageShell),
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
        pickerContent={(onSelect) => <MediaPageShell onSelect={onSelect} />}
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
