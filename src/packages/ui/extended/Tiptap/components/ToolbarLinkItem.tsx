import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Link as LinkIcon } from "lucide-react";
import { Button } from "@/packages/ui/components/button";
import { Input } from "@/packages/ui/components/input";
import { ToolbarButton } from "./ToolbarButton";

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
    <ToolbarButton
      icon={<LinkIcon className="h-4 w-4" />}
      label="超链接"
      active={editor.isActive("link")}
      open={open}
      onOpenChange={setOpen}
    >
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
    </ToolbarButton>
  );
}
