"use client";

import PhotoPickerPanel from "@/app/(root)/(dashboard)/media/page";
import { MediaEntity } from "@/app/(root)/(dashboard)/media/types/media.entity";
import { Sheet } from "@honeycomb/ui/extended/Sheet";
import React, { useState } from "react";
import { toast } from "sonner";

export interface PhotoPickerModalProps {
  showPhotoPicker: boolean;
  handlePhotoPickerOk: (media: MediaEntity) => void;
  handlePhotoPickerCancel: () => void;
}

const PhotoPickerModal = (props: PhotoPickerModalProps) => {
  const { showPhotoPicker, handlePhotoPickerOk, handlePhotoPickerCancel } =
    props;
  const [selectItem, setSelectItem] = useState<MediaEntity>();

  const onSelect = (media: MediaEntity) => {
    setSelectItem(media);
  };

  const onOk = () => {
    if (!selectItem) {
      toast.info("请选择图片");
      return;
    }
    handlePhotoPickerOk(selectItem);
  };

  return (
    <Sheet
      open={showPhotoPicker}
      onConfirm={onOk}
      title="选择图片"
      className="min-w-[1000px]"
      onOpenChange={() => handlePhotoPickerCancel()}
      showFooter={true}
    >
      <PhotoPickerPanel onSelect={onSelect} />
    </Sheet>
  );
};

export default PhotoPickerModal;
