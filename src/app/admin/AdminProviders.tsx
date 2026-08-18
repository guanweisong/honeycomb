"use client";

import PhotoPickerModal from "@/features/post/admin/edit/components/PhotoPicker";
import { MediaPageShell } from "@/features/media/public";
import { trpc, trpcClient } from "@/packages/trpc/client/trpc";
import { createAdminQueryClient } from "@/packages/trpc/client/admin-query-client";
import { TiptapMediaPickerProvider, type MediaPickerRenderer } from "@/packages/ui/extended/Tiptap/media-picker";
import { CurrentUserProvider } from "@/features/contracts/admin/use-current-user";
import { SiteSettingProvider } from "@/features/setting/admin/hooks-use-site-setting";
import type { AdminUser } from "./lib/admin-auth";
import { QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import React from "react";

export function AdminProviders({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser: AdminUser;
}) {
  const router = useRouter();
  const [queryClient] = React.useState(() =>
    createAdminQueryClient({ onForbidden: () => router.replace("/admin/forbidden") }),
  );
  const renderMediaPicker: MediaPickerRenderer = ({ open, onConfirm, onCancel }) => (
    <PhotoPickerModal
      pickerContent={(onSelect) => <MediaPageShell onSelect={onSelect} />}
      showPhotoPicker={open}
      handlePhotoPickerOk={(media) => onConfirm({ url: media.url })}
      handlePhotoPickerCancel={onCancel}
    />
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <TiptapMediaPickerProvider renderer={renderMediaPicker}>
          <CurrentUserProvider initialUser={initialUser}>
            <SiteSettingProvider>{children}</SiteSettingProvider>
          </CurrentUserProvider>
        </TiptapMediaPickerProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
}
