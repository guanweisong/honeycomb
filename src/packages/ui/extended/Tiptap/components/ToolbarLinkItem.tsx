import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Link as LinkIcon, Unlink } from "lucide-react";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/packages/ui/components/popover";
import { Button } from "@/packages/ui/components/button";
import { Input } from "@/packages/ui/components/input";

export function ToolbarLinkItem({ editor }: { editor: Editor }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");

  useEffect(() => {
    if (open) {
      setUrl(editor.getAttributes("link").href ?? "");
    }
  }, [open, editor]);

  const apply = () => {
    const chain = editor.chain().focus().extendMarkRange("link");

    if (url) {
      chain.setLink({ href: url }).run();
    } else {
      chain.unsetLink().run();
    }
    setOpen(false);
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          variant={"ghost"}
          className={editor.isActive("link") ? "!text-purple-600" : ""}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-72 p-3">
        <div className="space-y-2">
          <Input
            placeholder="https://example.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <div className="flex justify-between gap-2">
            {editor.isActive("link") && (
              <Button size="sm" variant="ghost" className="text-red-600" onClick={removeLink}>
                移除
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button size="sm" onClick={apply}>
                应用
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
