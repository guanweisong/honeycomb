"use client";

import { Copy, File, Trash, UploadCloud } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/packages/ui/components/button";
import { Dialog } from "@/packages/ui/extended/Dialog";
import { Skeleton } from "@/packages/ui/components/skeleton";
import { cn } from "@/packages/ui/lib/utils";

import { trpc } from "@/packages/trpc/client/trpc";
import { MediaIndexInput } from "@/packages/validation/schemas/media/media.list.query.schema";
import { MediaEntity } from "@/packages/trpc/server/types/media.entity";

/**
 * 媒体库组件的属性接口。
 */
export interface MediaProps {
  /**
   * 当选择媒体文件时触发的回调函数。
   * @param {MediaEntity} media - 被选中的媒体实体。
   */
  onSelect?: (media: MediaEntity) => void;
}

/**
 * 媒体库组件。
 * 负责展示媒体文件列表，并提供上传、删除、选择等功能。
 * @param {MediaProps} { onSelect } - 组件属性，包含选择媒体文件的回调函数。
 * @returns {JSX.Element} 媒体库界面。
 */
const Media = ({ onSelect }: MediaProps) => {
  /**
   * 当前选中的媒体项。
   */
  const [currentItem, setCurrentItem] = useState<MediaEntity>();
  /**
   * 上传操作的加载状态。
   */
  const [loading, setLoading] = useState(false);
  /**
   * 文件输入框的引用，用于触发文件选择对话框。
   */
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 媒体列表的查询参数。
   * 默认 `limit` 为 99999，以获取所有媒体文件。
   */
  const [searchParams] = useState<MediaIndexInput>({
    limit: 99999,
  });
  /**
   * 获取媒体列表数据的 tRPC 查询。
   * `data` 包含列表数据，`refetch` 用于手动重新获取数据。
   */
  const { data, refetch } = trpc.media.index.useQuery(searchParams);
  /**
   * 删除媒体文件的 tRPC mutation。
   * 用于执行删除操作。
   */
  const destroyMedia = trpc.media.destroy.useMutation();
  const getPresignedUrl = trpc.media.getPresignedUrl.useMutation();
  const uploadMedia = trpc.media.upload.useMutation();

  /**
   * 获取图片的元数据（尺寸和颜色）。
   * @param {File} file - 图片文件。
   * @returns {Promise<{ width: number; height: number; color?: string }>} 返回包含尺寸和颜色的对象。
   */
  const getImageMetadata = (
    file: File,
  ): Promise<{ width: number; height: number; color?: string }> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/")) {
        resolve({ width: 0, height: 0 });
        return;
      }

      const img = new window.Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);

        // 使用 canvas 获取主色调（简化版：获取中心像素颜色）
        let color = undefined;
        try {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          if (ctx) {
            canvas.width = 1;
            canvas.height = 1;
            ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 1, 1);
            const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
            color = `rgb(${r},${g},${b})`;
          }
        } catch (e) {
          console.warn("Failed to get image color on client", e);
        }

        resolve({
          width: img.width,
          height: img.height,
          color,
        });
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ width: 0, height: 0 });
      };
      img.src = url;
    });
  };


  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);

    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        // 1. 获取元数据
        let metadata = { width: 0, height: 0, color: undefined as string | undefined };
        if (file.type.startsWith("image/")) {
          metadata = await getImageMetadata(file);
        }

        // 2. 获取预签名 URL
        const { url, key } = await getPresignedUrl.mutateAsync({
          name: file.name,
          type: file.type,
        });

        // 3. 直接上传到 S3
        const uploadRes = await fetch(url, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        if (!uploadRes.ok) {
          throw new Error(`文件 ${file.name} 上传到存储失败`);
        }

        // 4. 通知后端完成上传并传递元数据
        return uploadMedia.mutateAsync({
          name: file.name,
          type: file.type,
          size: file.size,
          key,
          width: metadata.width || null,
          height: metadata.height || null,
          color: metadata.color || null,
        });
      });

      const results = await Promise.all(uploadPromises);

      toast.success(`成功上传 ${results.length} 个文件`);
      setCurrentItem(results[results.length - 1]); // 将最新上传的设为当前项
      refetch();
    } catch (e: any) {
      toast.error(e.message || "上传失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

  /**
   * 处理文件删除。
   * 调用 `destroyMedia` mutation 删除指定 ID 的媒体文件，并刷新列表。
   * @param {string} id - 要删除的媒体文件 ID。
   */
  const handleDelete = async (id: string) => {
    try {
      const res = await destroyMedia.mutateAsync({ ids: [id] });
      if (res.success) {
        toast.success("删除成功");
        setCurrentItem(undefined);
        refetch();
      }
    } catch (e) {
      toast.error("删除失败");
    }
  };

  /**
   * 副作用钩子，用于在 `currentItem` 变化时触发 `onSelect` 回调。
   * 如果 `onSelect` 存在且 `currentItem` 有值，则调用 `onSelect`。
   */
  useEffect(() => {
    if (onSelect && currentItem) {
      onSelect(currentItem);
    }
  }, [currentItem]);

  return (
    <div>
      <div className="flex m-1">
        <input
          type="file"
          multiple
          hidden
          ref={fileInputRef}
          onChange={(e) => handleUpload(e.target.files)}
        />
        <Button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading}
        >
          <UploadCloud />
          {loading ? "正在上传中..." : "点击上传文件"}
        </Button>
      </div>
      <div className="flex flex-wrap">
        {data?.list?.length ? (
          data?.list?.map((item) => (
            <div
              key={item.id}
              className={cn(
                "relative w-32 h-32 m-1 border-2 bg-gray-100 cursor-pointer",
                item.id === currentItem?.id
                  ? "border-blue-500"
                  : "border-gray-100",
              )}
              onClick={() => setCurrentItem(item)}
              title={item.name as string}
            >
              {item.type?.includes("image") ? (
                <Image
                  className="object-contain"
                  fill
                  sizes="7vw"
                  src={item.url as string}
                  alt={item.name as string}
                />
              ) : (
                <File className="w-full h-full p-8 text-gray-400" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center space-x-2 text-white transition">
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(item.url!);
                    toast.success("已复制至剪切板");
                  }}
                >
                  <Copy />
                </Button>
                <Dialog
                  trigger={
                    <Button variant="secondary">
                      <Trash />
                    </Button>
                  }
                  type="danger"
                  title="确定要删除吗？"
                  onOK={() => handleDelete(item.id)}
                />
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-wrap">
            {Array.from({ length: 100 }).map((_v, index) => (
              <Skeleton
                key={`media.skeleton${index}`}
                className="relative w-32 h-32 m-1 border-2 bg-gray-100 border-gray-100 rounded-none"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Media;
