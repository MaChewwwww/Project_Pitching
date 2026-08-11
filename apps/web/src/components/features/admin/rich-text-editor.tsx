"use client";

import * as React from "react";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { EditorContent, useEditor } from "@tiptap/react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
} from "lucide-react";

import { Button } from "@/components/common/button";

export type ArticleDocument = { type: "doc"; content: Array<Record<string, unknown>> };

export const emptyArticleDocument: ArticleDocument = { type: "doc", content: [] };

function ToolButton({
  active,
  label,
  onClick,
  children,
}: {
  active?: boolean;
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="size-8 p-0"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/** Restricted toolbar mirrors the API's server-side NFR-SEC-013 allow-list. */
export function RichTextEditor({
  value,
  onChange,
  labelledBy,
}: {
  value: ArticleDocument;
  onChange: (value: ArticleDocument) => void;
  labelledBy: string;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] } }),
      Link.configure({ openOnClick: false, protocols: ["http", "https"] }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-44 px-3 py-3 text-sm leading-6 text-neutral-800 outline-none [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-bold [&_blockquote]:border-l-2 [&_blockquote]:border-primary-500 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-600 [&_a]:text-primary-700 [&_a]:underline",
      },
    },
    onUpdate: ({ editor: activeEditor }) =>
      onChange(activeEditor.getJSON() as ArticleDocument),
  });

  if (!editor) return <div className="h-56 animate-pulse rounded border bg-neutral-50" />;

  const setLink = () => {
    const href = window.prompt("Link URL (https:// or http://)");
    if (!href) return;
    if (!/^https?:\/\//i.test(href)) return;
    editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
  };

  return (
    <div className="focus-within:ring-primary-600/30 overflow-hidden rounded border border-neutral-300 bg-white focus-within:ring-2">
      <div className="flex flex-wrap gap-1 border-b border-neutral-200 bg-neutral-50 p-1.5">
        <ToolButton
          label="Bold"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="size-4" />
        </ToolButton>
        <ToolButton
          label="Italic"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="size-4" />
        </ToolButton>
        <ToolButton
          label="Heading level 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="size-4" />
        </ToolButton>
        <ToolButton
          label="Heading level 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="size-4" />
        </ToolButton>
        <ToolButton
          label="Bulleted list"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="size-4" />
        </ToolButton>
        <ToolButton
          label="Numbered list"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="size-4" />
        </ToolButton>
        <ToolButton
          label="Quote"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="size-4" />
        </ToolButton>
        <ToolButton label="Add link" active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="size-4" />
        </ToolButton>
      </div>
      <EditorContent editor={editor} aria-labelledby={labelledBy} />
    </div>
  );
}
