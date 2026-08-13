"use client";

import PhotoPickerModal from "@/app/admin/components/PhotoPicker";
import { trpc, trpcClient } from "@/packages/trpc/client/trpc";
import { createAdminQueryClient } from "@/packages/trpc/client/adminQueryClient";
import { TiptapMediaPickerProvider, type MediaPickerRenderer } from "@/packages/ui/extended/Tiptap/media-picker";
import { QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React from "react";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [queryClient] = React.useState(() =>
    createAdminQueryClient({ onForbidden: () => router.replace("/admin/forbidden") }),
  );
  const renderMediaPicker: MediaPickerRenderer = ({ open, onConfirm, onCancel }) => (
    <PhotoPickerModal
      showPhotoPicker={open}
      handlePhotoPickerOk={(media) => onConfirm({ url: media.url })}
      handlePhotoPickerCancel={onCancel}
    />
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TiptapMediaPickerProvider renderer={renderMediaPicker}>
          {children}
        </TiptapMediaPickerProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
