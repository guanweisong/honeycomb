"use client";

import { createContext, useContext, type ReactNode } from "react";

export type MediaPickerSelection = {
  url?: string | null;
};

export type MediaPickerRenderer = (props: {
  open: boolean;
  kind: "image" | "video";
  onConfirm: (selection: MediaPickerSelection) => void;
  onCancel: () => void;
}) => ReactNode;

const MediaPickerContext = createContext<MediaPickerRenderer | null>(null);

export function TiptapMediaPickerProvider({
  renderer,
  children,
}: {
  renderer: MediaPickerRenderer;
  children?: ReactNode;
}) {
  return (
    <MediaPickerContext.Provider value={renderer}>
      {children}
    </MediaPickerContext.Provider>
  );
}

export function useTiptapMediaPicker() {
  return useContext(MediaPickerContext);
}
