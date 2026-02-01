import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Video from "./components/VideoNode";
import { ToolbarButton } from "./components/ToolbarButton";
import { useEffect, useState } from "react";
import { toolbarItems } from "@/packages/ui/extended/Tiptap/config/toolbarItems";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import { ToolbarGroupItem } from "./components/ToolbarGroupItem";

interface TiptapProps {
  value?: string;
  onChange?: (value: string) => void;
}

export default function Tiptap({ value, onChange }: TiptapProps = {}) {
  const [updateCount, setUpdateCount] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
        },
      }),
      TaskList,
      TaskItem,
      Video,
      Image,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Highlight,
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    const update = () => setUpdateCount((prev) => prev + 1);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "<p></p>");
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-md border">
      <div className="flex items-center gap-1 border-b p-1">
        {toolbarItems.map((group, index) => (
          <div key={index} className="flex items-center gap-1">
            {index > 0 && <div className="bg-gray-300 w-[1px] h-5" />}
            {group.map((item, itemIndex) => {
              if ("items" in item) {
                return (
                  <ToolbarGroupItem
                    key={itemIndex}
                    editor={editor}
                    group={item}
                  />
                );
              }
              if (item.render && editor) {
                return <div key={item.label}>{item.render(editor)}</div>;
              }
              return (
                <ToolbarButton
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  active={editor && item.isActive?.(editor)}
                  onClick={() => editor && item.onClick?.(editor)}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className="prose-editor" />
    </div>
  );
}
