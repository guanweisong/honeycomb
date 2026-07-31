"use client";

import { UploadCloud } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useCan } from "@/app/admin/hooks/useCurrentUser";
import { Permission } from "@/packages/auth/permissions";
import type { MediaEntity } from "@/packages/trpc/api/modules/media/types/media.entity";
import { Button } from "@/packages/ui/components/button";
import { MediaGrid } from "./MediaGrid";
import { useMediaActions } from "./mediaActions";
import { useMediaQuery } from "./mediaQuery";

export interface MediaProps {
  onSelect?: (media: MediaEntity) => void;
}

export function MediaPageShell({ onSelect }: MediaProps) {
  const canUploadMedia = useCan(Permission.mediaUpload);
  const [currentItem, setCurrentItem] = useState<MediaEntity>();
  const onSelectRef = useRef(onSelect);
  const query = useMediaQuery();
  const actions = useMediaActions({
    refetch: query.refetch,
    onUploadComplete: setCurrentItem,
    onDeleteComplete: () => setCurrentItem(undefined),
  });
  const { fileInputRef, handleDelete, handleUpload, loading } = actions;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (currentItem) onSelectRef.current?.(currentItem);
  }, [currentItem]);

  return (
    <div>
      {canUploadMedia && (
        <div className="flex m-1">
          <input
            type="file"
            multiple
            hidden
            ref={fileInputRef}
            onChange={(event) => handleUpload(event.target.files)}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
          >
            <UploadCloud />
            {loading ? "正在上传中..." : "点击上传文件"}
          </Button>
        </div>
      )}
      <MediaGrid
        media={query.data?.list}
        currentItem={currentItem}
        onDelete={handleDelete}
        onSelect={setCurrentItem}
      />
    </div>
  );
}
