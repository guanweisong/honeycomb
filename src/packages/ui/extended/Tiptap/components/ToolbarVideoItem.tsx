import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import PhotoPickerModal from "@/app/admin/components/PhotoPicker";
import { MediaEntity } from "@/packages/trpc/server/types/media.entity";
import { Film } from "lucide-react";

export function ToolbarVideoItem({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);

  const handlePhotoPickerOk = (media: MediaEntity) => {
    if (media.url) {
      editor.chain().focus().setVideo({ src: media.url }).run();
    }
    setOpen(false);
  };

  const handlePhotoPickerCancel = () => {
    setOpen(false);
  };

  return (
    <>
      <ToolbarButton
        icon={<Film className="h-4 w-4" />}
        label="插入视频"
        onClick={() => setOpen(true)}
      />
      <PhotoPickerModal
        showPhotoPicker={open}
        handlePhotoPickerOk={handlePhotoPickerOk}
        handlePhotoPickerCancel={handlePhotoPickerCancel}
      />
    </>
  );
}
