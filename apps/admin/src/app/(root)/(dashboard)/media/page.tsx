"use client";

import { Copy, File, Trash, UploadCloud } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@honeycomb/ui/components/button";
import { Dialog } from "@honeycomb/ui/extended/Dialog";
import { Skeleton } from "@honeycomb/ui/components/skeleton";
import { cn } from "@honeycomb/ui/lib/utils";

import type { MediaEntity } from "./types/media.entity";
import { MediaIndexRequest } from "./types/media.index.request";
import { trpc } from "@honeycomb/trpc/client/trpc";

export interface MediaProps {
  onSelect?: (media: MediaEntity) => void;
}

const Media = ({ onSelect }: MediaProps) => {
  const [currentItem, setCurrentItem] = useState<MediaEntity>();
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [searchParams, setSearchParams] = useState<MediaIndexRequest>({
    limit: 99999,
  });
  const { data, refetch } = trpc.media.index.useQuery(searchParams);
  const destroyMedia = trpc.media.destroy.useMutation();

  const handleUpload = async (files: FileList | null) => {
    if (!files) return;
    setLoading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("file", file);
    });

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_DOAMIN}/media`,
        {
          method: "POST",
          body: formData,
          headers: {
            "x-auth-token": localStorage.getItem("token") || "",
          },
        },
      );
      const data = await response.json();

      if (response.ok) {
        toast.success("上传成功");
        setCurrentItem(data);
        refetch();
      } else {
        toast.error(data.message || "上传失败");
      }
    } catch (e) {
      toast.error("上传失败，请稍后再试");
    } finally {
      setLoading(false);
    }
  };

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
              title={item.name}
            >
              {item.type.includes("image") ? (
                <Image
                  className="object-contain"
                  fill
                  sizes="7vw"
                  src={item.url}
                  alt={item.name}
                />
              ) : (
                <File className="w-full h-full p-8 text-gray-400" />
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 flex items-center justify-center space-x-2 text-white transition">
                <Button
                  variant="secondary"
                  onClick={() => {
                    navigator.clipboard.writeText(item.url);
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
            {Array.from({ length: 100 }).map(() => (
              <Skeleton className="relative w-32 h-32 m-1 border-2 bg-gray-100 border-gray-100 rounded-none" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Media;
