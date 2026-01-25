import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import { Image as ImageIcon } from "lucide-react";
import PhotoPickerModal from "@/app/admin/components/PhotoPicker";
import { MediaEntity } from "@/packages/trpc/server/types/media.entity";

export function ToolbarImageItem({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);

  const handlePhotoPickerOk = (media: MediaEntity) => {
    if (media.url) {
      editor.chain().focus().setImage({ src: media.url }).run();
    }
    setOpen(false);
  };

  const handlePhotoPickerCancel = () => {
    setOpen(false);
  };

  return (
    <>
      <ToolbarButton
        icon={<ImageIcon className="h-4 w-4" />}
        label="选择图片"
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
