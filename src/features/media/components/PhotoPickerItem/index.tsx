"use client";

import { Button } from "@/components/ui/button";
import { Trash, Upload } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { FormField, FormItem, FormMessage } from "@/components/ui/form";
import React from "react";
import type { MediaRecord } from "@/features/media/types/media.record";
import Image from "next/image";

/**
 * 图片选择器项组件的属性接口。
 */
export interface PhotoPickerItemProps {
  /**
   * 封面图片对象，用于显示预览。
   */
  cover?: Pick<MediaRecord, "id" | "url" | "width" | "height"> | null;
  coverId?: string | null;
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
  const { cover, coverId, title, size, handlePhotoClear, openPhotoPicker } =
    props;
  const { control } = useFormContext();
  const previewWidth = cover?.width ?? 960;
  const previewHeight = cover?.height ?? 540;

  return (
    <div>
      <div className="mb-2">
        <span className="font-medium">{title}</span> {`（建议尺寸：${size}）`}
      </div>
      <FormField
        control={control}
        name="coverId"
        render={() => (
          <FormItem className="gap-0">
            {cover?.id || coverId ? (
              <>
                {cover ? (
                  <div className="mb-2 aspect-video w-full overflow-hidden bg-gray-300">
                    <Image
                      src={cover.url}
                      alt={`${title}预览`}
                      width={previewWidth}
                      height={previewHeight}
                      sizes="(min-width: 1024px) 320px, 100vw"
                      className="block h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <p className="mb-2 text-sm text-muted-foreground">
                    已恢复封面选择，重新选择可查看预览。
                  </p>
                )}
                <div className="flex justify-between">
                  <Button
                    type={"button"}
                    variant="outline"
                    onClick={() => openPhotoPicker()}
                  >
                    <Upload />
                    更换图片
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
                选择图片
              </Button>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
};

export default PhotoPickerItem;
