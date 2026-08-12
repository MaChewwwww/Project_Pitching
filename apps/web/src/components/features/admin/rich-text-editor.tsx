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
  Unlink,
} from "lucide-react";

import { Button } from "@/components/common/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [linkText, setLinkText] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");

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
          "min-h-44 px-3 py-3 text-sm leading-6 text-neutral-800 outline-none [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-bold [&_blockquote]:border-l-2 [&_blockquote]:border-primary-500 [&_blockquote]:pl-3 [&_blockquote]:text-neutral-600 [&_a]:text-emerald-700 [&_a]:underline [&_a]:font-semibold",
      },
    },
    onUpdate: ({ editor: activeEditor }) =>
      onChange(activeEditor.getJSON() as ArticleDocument),
  });

  if (!editor) return <div className="h-56 animate-pulse rounded border bg-neutral-50" />;

  const openLinkDialog = () => {
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    const previousUrl = editor.getAttributes("link").href || "";

    setLinkText(selectedText);
    setLinkUrl(previousUrl || "https://");
    setLinkDialogOpen(true);
  };

  const handleApplyLink = () => {
    let formattedUrl = linkUrl.trim();
    if (formattedUrl && !/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }

    if (!formattedUrl) return;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    if (hasSelection) {
      editor.chain().focus().extendMarkRange("link").setLink({ href: formattedUrl }).run();
    } else {
      const displayText = linkText.trim() || formattedUrl;
      editor
        .chain()
        .focus()
        .insertContent(`<a href="${formattedUrl}">${displayText}</a>`)
        .run();
    }

    setLinkDialogOpen(false);
  };

  const handleUnlink = () => {
    editor.chain().focus().unsetLink().run();
    setLinkDialogOpen(false);
  };

  return (
    <div className="focus-within:ring-emerald-600/30 overflow-hidden rounded-xl border border-neutral-300 bg-white focus-within:ring-2 shadow-2xs">
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
        <ToolButton label="Insert / Edit Link" active={editor.isActive("link")} onClick={openLinkDialog}>
          <Link2 className="size-4" />
        </ToolButton>
      </div>
      <EditorContent editor={editor} aria-labelledby={labelledBy} />

      {/* Custom Link Modal */}
      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6 bg-white border border-neutral-200 shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-neutral-900 flex items-center gap-2">
              <Link2 className="size-4 text-emerald-600" />
              <span>Insert / Edit Hyperlink</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="link-text" className="text-xs font-bold text-neutral-700">
                Display Text
              </Label>
              <Input
                id="link-text"
                value={linkText}
                onChange={(e) => setLinkText(e.target.value)}
                placeholder="Text to display..."
                className="h-10 rounded-xl text-sm"
              />
              <p className="text-[11px] text-neutral-500">
                Text that will be hyperlinked in the article.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="link-url" className="text-xs font-bold text-neutral-700">
                Destination URL <span className="text-red-500 font-bold">*</span>
              </Label>
              <Input
                id="link-url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://example.com"
                className="h-10 rounded-xl text-sm font-mono"
              />
            </div>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-2 pt-2 border-t border-neutral-100">
            {editor.isActive("link") ? (
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={handleUnlink}
                className="h-9 rounded-xl px-3 gap-1.5 text-xs font-semibold cursor-pointer"
              >
                <Unlink className="size-3.5" />
                <span>Remove Link</span>
              </Button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setLinkDialogOpen(false)}
                className="h-9 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyLink}
                className="h-9 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer px-4 shadow-sm"
              >
                Apply Link
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
