"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import {
  TiptapMediaPickerProvider,
  type MediaPickerRenderer,
} from "@/packages/ui/extended/Tiptap/media-picker";

const loading = () => <span role="status">正在加载媒体选择器…</span>;

const PhotoPickerModal = dynamic(() => import("../PhotoPicker"), { loading });
const MediaPageShell = dynamic(
  () => import("@/features/media/public").then((module) => module.MediaPageShell),
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
