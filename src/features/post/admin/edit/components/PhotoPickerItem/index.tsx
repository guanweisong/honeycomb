"use client";

import { Button } from "@/packages/ui/components/button";
import { Trash, Upload } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { FormField, FormMessage } from "@/packages/ui/components/form";
import React from "react";
import type { PostDetailViewModel as PostDetailEntity } from "../../../../presentation/post-view-model";
import Image from "next/image";

/**
 * 图片选择器项组件的属性接口。
 */
export interface PhotoPickerItemProps {
  /**
   * 封面图片对象，用于显示预览。
   */
  cover?: PostDetailEntity["cover"];
  /**
   * 图片选择器项的标题。
   */
  title: string;
  /**
   * 建议的图片尺寸。
   */
  size: string;
  /**
   * 清除已选图片的回调函数。
   */
  handlePhotoClear: () => void;
  /**
   * 打开图片选择器的回调函数。
   */
  openPhotoPicker: () => void;
}

/**
 * 图片选择器项组件。
 * 用于在表单中展示和选择封面图片，并提供上传和清除功能。
 * @param {PhotoPickerItemProps} props - 组件属性。
 * @returns {JSX.Element} 图片选择器项。
 */
const PhotoPickerItem = (props: PhotoPickerItemProps) => {
  const { cover, title, size, handlePhotoClear, openPhotoPicker } = props;
  const { control } = useFormContext();
  const previewWidth = cover?.width ?? 960;
  const previewHeight = cover?.height ?? 540;

  return (
    <div>
      <div className="mb-2">
        <span className="font-medium">{title}</span> {`（尺寸：${size}）`}
      </div>
      <FormField
        control={control}
        name="coverId"
        render={() => (
          <>
            {cover?.id ? (
              <>
                <div className="mb-2 text-center bg-gray-300">
                  <Image
                    src={cover.url as string}
                    alt={`${title}预览`}
                    width={previewWidth}
                    height={previewHeight}
                    sizes="(max-width: 768px) 100vw, 640px"
                    className="mx-auto block h-auto max-h-full max-w-full object-contain"
                  />
                </div>
                <div className="flex justify-between">
                  <Button
                    type={"button"}
                    variant="outline"
                    onClick={() => openPhotoPicker()}
                  >
                    <Upload />
                    重新上传
                  </Button>
                  <Button
                    type={"button"}
                    variant="outline"
                    onClick={() => handlePhotoClear()}
                  >
                    <Trash />
                    清除图片
                  </Button>
                </div>
              </>
            ) : (
              <Button
                type={"button"}
                variant={"outline"}
                onClick={() => openPhotoPicker()}
              >
                <Upload />
                点击上传
              </Button>
            )}
            <FormMessage />
          </>
        )}
      />
    </div>
  );
};

export default PhotoPickerItem;
