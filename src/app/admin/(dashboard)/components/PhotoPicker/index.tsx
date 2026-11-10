"use client";

import dynamic from "next/dynamic";
import { useLayoutEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sheet } from "@/components/Sheet";
import LoadingState from "@/components/LoadingState";
import { useCurrentUser } from "@/app/admin/(dashboard)/providers/use-current-user";
import type { MediaRecord } from "@/features/media/types/media.record";

const MediaPageShell = dynamic(
  () =>
    import("@/app/admin/(dashboard)/components/MediaPageShell").then(
      ({ MediaPageShell }) => MediaPageShell,
    ),
  {
    loading: () => (
      <LoadingState
        variant="inline"
        label="正在加载媒体选择器…"
        visuallyHiddenLabel
      />
    ),
  },
);

interface PhotoPickerModalProps {
  showPhotoPicker: boolean;
  handlePhotoPickerOk: (media: MediaRecord) => void;
  handlePhotoPickerCancel: () => void;
}

export default function PhotoPickerModal(props: PhotoPickerModalProps) {
  const { user } = useCurrentUser();
  return props.showPhotoPicker ? (
    <PhotoPickerSession key={user?.id ?? "signed-out"} {...props} />
  ) : null;
}

function PhotoPickerSession({
  handlePhotoPickerOk,
  handlePhotoPickerCancel,
}: PhotoPickerModalProps) {
  const [currentItem, setCurrentItem] = useState<MediaRecord>();
  const active = useRef(true);
  const confirmed = useRef(false);
  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const confirm = () => {
    if (!active.current || confirmed.current) return;
    if (!currentItem) {
      toast.info("请选择图片");
      return;
    }
    confirmed.current = true;
    handlePhotoPickerOk(currentItem);
  };

  return (
    <Sheet
      open
      onConfirm={confirm}
      title="选择图片"
      className="data-[side=right]:w-full data-[side=right]:sm:max-w-[1000px]"
      onOpenChange={() => handlePhotoPickerCancel()}
      showFooter
    >
      <MediaPageShell selection={{ currentItem, setCurrentItem }} />
    </Sheet>
  );
}
