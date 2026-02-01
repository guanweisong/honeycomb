import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Redo,
  Undo,
  List,
  ListOrdered,
  ListTodo,
  Strikethrough,
  Underline,
  TextQuote,
  Image,
  Link,
  Film,
  TextAlignStart,
  TextAlignCenter,
  TextAlignEnd,
  TextAlignJustify,
  Circle,
  Heading,
  Baseline,
  Code,
  SquareCode,
  Highlighter,
} from "lucide-react";
import { Editor } from "@tiptap/core";
import { ReactNode } from "react";
import { ToolbarLinkItem } from "@/packages/ui/extended/Tiptap/components/ToolbarLinkItem";
import { ToolbarImageItem } from "@/packages/ui/extended/Tiptap/components/ToolbarImageItem";
import { ToolbarVideoItem } from "@/packages/ui/extended/Tiptap/components/ToolbarVideoItem";

export interface ToolbarItem {
  icon: ReactNode;
  label: string;
  onClick?: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
  render?: (editor: Editor) => ReactNode;
}

export interface ToolbarGroup {
  items: ToolbarItem[];
  icon: ReactNode;
  label: string;
}

export type ToolbarItemOrGroup = ToolbarItem | ToolbarGroup;

export const toolbarItems: ToolbarItemOrGroup[][] = [
  [
    {
      label: "标题",
      icon: <Heading className="h-4 w-4" />,
      items: [
        {
          icon: <Heading1 className="h-4 w-4" />,
          label: "一级标题",
          isActive: (editor: Editor) =>
            editor.isActive("heading", { level: 1 }),
          onClick: (editor: Editor) =>
            editor.chain().focus().toggleHeading({ level: 1 }).run(),
        },
        {
          icon: <Heading2 className="h-4 w-4" />,
          label: "二级标题",
          isActive: (editor: Editor) =>
            editor.isActive("heading", { level: 2 }),
          onClick: (editor: Editor) =>
            editor.chain().focus().toggleHeading({ level: 2 }).run(),
        },
        {
          icon: <Heading3 className="h-4 w-4" />,
          label: "三级标题",
          isActive: (editor: Editor) =>
            editor.isActive("heading", { level: 3 }),
          onClick: (editor: Editor) =>
            editor.chain().focus().toggleHeading({ level: 3 }).run(),
        },
      ],
    },
    {
      label: "列表",
      icon: <List className="h-4 w-4" />,
      items: [
        {
          icon: <List className="h-4 w-4" />,
          label: "无序列表",
          isActive: (editor: Editor) => editor.isActive("bulletList"),
          onClick: (editor: Editor) =>
            editor.chain().focus().toggleBulletList().run(),
        },
        {
          icon: <ListOrdered className="h-4 w-4" />,
          label: "有序列表",
          isActive: (editor: Editor) => editor.isActive("orderedList"),
          onClick: (editor: Editor) =>
            editor.chain().focus().toggleOrderedList().run(),
        },
        {
          icon: <ListTodo className="h-4 w-4" />,
          label: "任务列表",
          isActive: (editor: Editor) => editor.isActive("taskList"),
          onClick: (editor: Editor) =>
            editor.chain().focus().toggleTaskList().run(),
        },
      ],
    },
    {
      icon: <TextQuote className="h-4 w-4" />,
      label: "块级引用",
      isActive: (editor: Editor) => editor.isActive("blockquote"),
      onClick: (editor: Editor) =>
        editor.chain().focus().toggleBlockquote().run(),
    },
    {
      icon: <SquareCode className="h-4 w-4" />,
      label: "块级代码",
      isActive: (editor: Editor) => editor.isActive("codeBlock"),
      onClick: (editor: Editor) =>
        editor.chain().focus().toggleCodeBlock().run(),
    },
  ],
  [
    {
      icon: <Bold className="h-4 w-4" />,
      label: "加粗",
      isActive: (editor: Editor) => editor.isActive("bold"),
      onClick: (editor: Editor) => editor.chain().focus().toggleBold().run(),
    },
    {
      icon: <Italic className="h-4 w-4" />,
      label: "斜体",
      isActive: (editor: Editor) => editor.isActive("italic"),
      onClick: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
    },
    {
      icon: <Strikethrough className="h-4 w-4" />,
      label: "中划线",
      isActive: (editor: Editor) => editor.isActive("strike"),
      onClick: (editor: Editor) => editor.chain().focus().toggleStrike().run(),
    },
    {
      icon: <Underline className="h-4 w-4" />,
      label: "下划线",
      isActive: (editor: Editor) => editor.isActive("underline"),
      onClick: (editor: Editor) =>
        editor.chain().focus().toggleUnderline().run(),
    },
    {
      icon: <Link className="h-4 w-4" />,
      label: "超链接",
      render: (editor: Editor) => <ToolbarLinkItem editor={editor} />,
    },
    {
      icon: <Code className="h-4 w-4" />,
      label: "代码",
      isActive: (editor: Editor) => editor.isActive("code"),
      onClick: (editor: Editor) => editor.chain().focus().toggleCode().run(),
    },
    {
      label: "颜色",
      icon: <Baseline className="h-4 w-4" />,
      items: [
        {
          icon: <Circle className="h-4 w-4 text-red-600" />,
          label: "红",
          isActive: (editor: Editor) =>
            editor.isActive("textStyle", { color: "red" }),
          onClick: (editor: Editor) =>
            editor.isActive("textStyle", { color: "red" })
              ? editor.chain().focus().unsetColor().run()
              : editor.chain().focus().setColor("red").run(),
        },
        {
          icon: <Circle className="h-4 w-4 text-orange-600" />,
          label: "橙",
          isActive: (editor: Editor) =>
            editor.isActive("textStyle", { color: "orange" }),
          onClick: (editor: Editor) =>
            editor.isActive("textStyle", { color: "orange" })
              ? editor.chain().focus().unsetColor().run()
              : editor.chain().focus().setColor("orange").run(),
        },
        {
          icon: <Circle className="h-4 w-4 text-yellow-600" />,
          label: "黄",
          isActive: (editor: Editor) =>
            editor.isActive("textStyle", { color: "yellow" }),
          onClick: (editor: Editor) =>
            editor.isActive("textStyle", { color: "yellow" })
              ? editor.chain().focus().unsetColor().run()
              : editor.chain().focus().setColor("yellow").run(),
        },
        {
          icon: <Circle className="h-4 w-4 text-green-600" />,
          label: "绿",
          isActive: (editor: Editor) =>
            editor.isActive("textStyle", { color: "green" }),
          onClick: (editor: Editor) =>
            editor.isActive("textStyle", { color: "green" })
              ? editor.chain().focus().unsetColor().run()
              : editor.chain().focus().setColor("green").run(),
        },
        {
          icon: <Circle className="h-4 w-4 text-teal-600" />,
          label: "青",
          isActive: (editor: Editor) =>
            editor.isActive("textStyle", { color: "teal" }),
          onClick: (editor: Editor) =>
            editor.isActive("textStyle", { color: "teal" })
              ? editor.chain().focus().unsetColor().run()
              : editor.chain().focus().setColor("teal").run(),
        },
        {
          icon: <Circle className="h-4 w-4 text-blue-600" />,
          label: "蓝",
          isActive: (editor: Editor) =>
            editor.isActive("textStyle", { color: "blue" }),
          onClick: (editor: Editor) =>
            editor.isActive("textStyle", { color: "blue" })
              ? editor.chain().focus().unsetColor().run()
              : editor.chain().focus().setColor("blue").run(),
        },
        {
          icon: <Circle className="h-4 w-4 text-purple-600" />,
          label: "紫",
          isActive: (editor: Editor) =>
            editor.isActive("textStyle", { color: "purple" }),
          onClick: (editor: Editor) =>
            editor.isActive("textStyle", { color: "purple" })
              ? editor.chain().focus().unsetColor().run()
              : editor.chain().focus().setColor("purple").run(),
        },
      ],
    },
    {
      icon: <Highlighter className="h-4 w-4" />,
      label: "高亮",
      isActive: (editor: Editor) => editor.isActive("highlight"),
      onClick: (editor: Editor) =>
        editor.chain().focus().toggleHighlight().run(),
    },
  ],
  [
    {
      icon: <TextAlignStart className="h-4 w-4" />,
      label: "左对齐",
      isActive: (editor: Editor) => editor.isActive({ textAlign: "left" }),
      onClick: (editor: Editor) =>
        editor.chain().focus().setTextAlign("left").run(),
    },
    {
      icon: <TextAlignCenter className="h-4 w-4" />,
      label: "居中对齐",
      isActive: (editor: Editor) => editor.isActive({ textAlign: "center" }),
      onClick: (editor: Editor) =>
        editor.chain().focus().setTextAlign("center").run(),
    },
    {
      icon: <TextAlignEnd className="h-4 w-4" />,
      label: "右对齐",
      isActive: (editor: Editor) => editor.isActive({ textAlign: "right" }),
      onClick: (editor: Editor) =>
        editor.chain().focus().setTextAlign("right").run(),
    },
    {
      icon: <TextAlignJustify className="h-4 w-4" />,
      label: "两端对齐",
      isActive: (editor: Editor) => editor.isActive({ textAlign: "justify" }),
      onClick: (editor: Editor) =>
        editor.chain().focus().setTextAlign("justify").run(),
    },
  ],
  [
    {
      icon: <Image className="h-4 w-4" />,
      label: "上传图片",
      render: (editor: Editor) => <ToolbarImageItem editor={editor} />,
    },
    {
      icon: <Film className="h-4 w-4" />,
      label: "上传视频",
      render: (editor: Editor) => <ToolbarVideoItem editor={editor} />,
    },
  ],
  [
    {
      icon: <Undo className="h-4 w-4" />,
      label: "撤销",
      onClick: (editor: Editor) => editor.chain().focus().undo().run(),
    },
    {
      icon: <Redo className="h-4 w-4" />,
      label: "重做",
      onClick: (editor: Editor) => editor.chain().focus().redo().run(),
    },
  ],
];
