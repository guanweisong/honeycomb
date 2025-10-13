"use client";

import { Button } from "@honeycomb/ui/components/button";
import type { MediaReadOnly, PostEntity } from "../../../types/post.entity";
import { Trash, Upload } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { FormField, FormMessage } from "@honeycomb/ui/components/form";
import React from "react";

/**
 * 图片选择器项组件的属性接口。
 */
export interface PhotoPickerItemProps {
  /**
   * 文章详情数据，用于显示当前封面图片。
   */
  detail?: PostEntity;
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
  const { detail, title, size, handlePhotoClear, openPhotoPicker } = props;
  const mediaObj = detail?.["cover"] as MediaReadOnly;
  const { control } = useFormContext();

  return (
    <div>
      <div className="mb-2">
        <span className="font-medium">{title}</span> {`（尺寸：${size}）`}
      </div>
      <FormField
        control={control}
        name="cover"
        render={() => (
          <>
            {mediaObj?.id ? (
              <>
                <div className="mb-2 text-center bg-gray-300">
                  <img
                    src={mediaObj.url}
                    className="max-w-full max-h-full block"
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
