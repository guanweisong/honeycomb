"use client";

import PhotoPickerPanel from "@/app/(root)/(dashboard)/media/page";
import { Sheet } from "@honeycomb/ui/extended/Sheet";
import React, { useState } from "react";
import { toast } from "sonner";
import { MediaEntity } from "@honeycomb/trpc/server/types/media.entity";

/**
 * 图片选择器模态框的属性接口。
 */
export interface PhotoPickerModalProps {
  /**
   * 控制图片选择器模态框的显示与隐藏。
   */
  showPhotoPicker: boolean;
  /**
   * 当用户确认选择图片时触发的回调函数。
   * @param {MediaEntity} media - 被选中的图片媒体实体。
   */
  handlePhotoPickerOk: (media: MediaEntity) => void;
  /**
   * 当用户取消选择图片时触发的回调函数。
   */
  handlePhotoPickerCancel: () => void;
}

/**
 * 图片选择器模态框组件。
 * 允许用户从媒体库中选择图片，并支持确认和取消操作。
 * @param {PhotoPickerModalProps} props - 组件属性。
 * @returns {JSX.Element} 图片选择器模态框。
 */
const PhotoPickerModal = (props: PhotoPickerModalProps) => {
  const { showPhotoPicker, handlePhotoPickerOk, handlePhotoPickerCancel } =
    props;
  const [selectItem, setSelectItem] = useState<MediaEntity>();

  /**
   * 处理图片选择事件。
   * 当用户在 `PhotoPickerPanel` 中选择一张图片时调用，更新内部状态 `selectItem`。
   * @param {MediaEntity} media - 被选中的图片媒体实体。
   */
  const onSelect = (media: MediaEntity) => {
    setSelectItem(media);
  };

  /**
   * 处理模态框确认事件。
   * 检查是否已选择图片，如果已选择则调用 `handlePhotoPickerOk` 回调函数，否则显示提示信息。
   */
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
