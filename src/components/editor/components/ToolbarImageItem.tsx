import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import { Image as ImageIcon } from "lucide-react";
import { useTiptapMediaPicker } from "../media-picker";

export function ToolbarImageItem({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const renderMediaPicker = useTiptapMediaPicker();

  if (!renderMediaPicker) return null;

  const handlePhotoPickerOk = (selection: { url?: string | null }) => {
    if (selection.url) {
      editor.chain().focus().setImage({ src: selection.url }).run();
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
      {renderMediaPicker({
        open,
        kind: "image",
        onConfirm: handlePhotoPickerOk,
        onCancel: handlePhotoPickerCancel,
      })}
    </>
  );
}
