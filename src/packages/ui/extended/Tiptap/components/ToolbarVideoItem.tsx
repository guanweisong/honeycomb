import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { ToolbarButton } from "./ToolbarButton";
import { Film } from "lucide-react";
import { useTiptapMediaPicker } from "../media-picker";

export function ToolbarVideoItem({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const renderMediaPicker = useTiptapMediaPicker();

  if (!renderMediaPicker) return null;

  const handlePhotoPickerOk = (selection: { url?: string | null }) => {
    if (selection.url) {
      editor.chain().focus().setVideo({ src: selection.url }).run();
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
      {renderMediaPicker({
        open,
        kind: "video",
        onConfirm: handlePhotoPickerOk,
        onCancel: handlePhotoPickerCancel,
      })}
    </>
  );
}
