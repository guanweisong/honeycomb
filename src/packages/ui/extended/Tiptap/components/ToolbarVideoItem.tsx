import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { Button } from "@/packages/ui/components/button";
import { Input } from "@/packages/ui/components/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/packages/ui/components/popover";
import { Film as FilmIcon } from "lucide-react";

export function ToolbarVideoItem({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  const apply = () => {
    if (url) editor.chain().focus().setVideo({ src: url }).run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost">
          <FilmIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3">
        <Input
          placeholder="输入视频 URL"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && apply()}
        />
        <div className="flex justify-end gap-2 mt-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button size="sm" onClick={apply}>
            应用
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
