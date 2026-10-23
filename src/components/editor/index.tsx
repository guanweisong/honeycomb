import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { ToolbarButton } from "./components/ToolbarButton";
import { useEffect, useRef, useState, type HTMLAttributes } from "react";
import { toolbarItems } from "@/components/editor/config/toolbar-items";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { ToolbarGroupItem } from "./components/ToolbarGroupItem";

interface TiptapProps extends Pick<
  HTMLAttributes<HTMLDivElement>,
  "id" | "aria-describedby" | "aria-invalid" | "aria-labelledby"
> {
  disabled?: boolean;
  value?: string;
  onChange?: (value: string) => void;
}

export default function Tiptap({
  value,
  disabled = false,
  onChange,
  id,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  "aria-labelledby": labelledBy,
}: TiptapProps = {}) {
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: {
          openOnClick: false,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            rel: "noopener noreferrer nofollow",
            target: "_blank",
          },
        },
      }),
      TaskList,
      TaskItem,
      Image,
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      TextStyle,
      Color,
      Highlight,
    ],
    editable: !disabled,
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        ...(id ? { id } : {}),
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(invalid !== undefined ? { "aria-invalid": String(invalid) } : {}),
        ...(labelledBy ? { "aria-labelledby": labelledBy } : {}),
      },
    },
    onUpdate: ({ editor }) => {
      onChangeRef.current?.(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "<p></p>", { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);

  if (!editor) return null;

  return (
    <div className="rounded-md border">
      {/* Remount controls to close portalled menus/pickers when editability changes. */}
      <EditorToolbar
        key={String(disabled)}
        editor={editor}
        disabled={disabled}
      />

      {/* Editor */}
      <EditorContent editor={editor} className="prose-editor" />
    </div>
  );
}

/** 选择与事务变化只刷新工具栏，不重渲染编辑器内容。 */
function EditorToolbar({
  editor,
  disabled,
}: {
  editor: Editor;
  disabled: boolean;
}) {
  const [, setUpdateCount] = useState(0);

  useEffect(() => {
    const update = () => setUpdateCount((prev) => prev + 1);
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
    };
  }, [editor]);

  return (
    <fieldset
      disabled={disabled}
      inert={disabled}
      className="sticky -top-3 left-0 right-0 z-20 flex flex-wrap items-center gap-1 border-b bg-white p-1"
    >
      {toolbarItems.map((group, index) => (
        <div key={index} className="flex flex-nowrap items-center gap-1">
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
            if (item.render) {
              return <div key={item.label}>{item.render(editor)}</div>;
            }
            return (
              <ToolbarButton
                key={item.label}
                icon={item.icon}
                label={item.label}
                active={item.isActive?.(editor)}
                onClick={() => item.onClick?.(editor)}
              />
            );
          })}
        </div>
      ))}
    </fieldset>
  );
}
