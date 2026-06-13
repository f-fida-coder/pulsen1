/**
 * TiptapEditor
 * Rich text WYSIWYG editor for knowledge base articles.
 * Toolbar: Bold, Italic, H2, H3, Bullet list, Ordered list, Link, Image, Clear
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useCallback } from "react";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered,
  Link as LinkIcon, Image as ImageIcon, Minus, Undo, Redo, RemoveFormatting,
} from "lucide-react";

// ─── Toolbar button ───────────────────────────────────────────────────────────

function ToolbarBtn({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded text-sm transition-colors ${
        active
          ? "bg-slate-900 text-white"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground"
      } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="h-5 w-px bg-muted mx-0.5" />;
}

// ─── Editor component ─────────────────────────────────────────────────────────

interface TiptapEditorProps {
  value: string;           // HTML string
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export default function TiptapEditor({
  value,
  onChange,
  placeholder = "Skriv artikelns innehåll här...",
  minHeight = 300,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false, autolink: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "prose prose-slate max-w-none text-sm focus:outline-none p-4",
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  // Sync external value changes (e.g., when editing an existing article)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [value, editor]);

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("URL:", prev);
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt("Bild-URL:");
    if (url) editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-card focus-within:ring-2 focus-within:ring-slate-900/10 focus-within:border-border transition-all">
      {/* Toolbar */}
      <div className="flex items-center flex-wrap gap-0.5 px-2 py-1.5 border-b border-border bg-secondary">
        {/* Text formatting */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="Fetstil (Ctrl+B)"
        >
          <Bold className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="Kursiv (Ctrl+I)"
        >
          <Italic className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Headings */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="Rubrik H2"
        >
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="Rubrik H3"
        >
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Lists */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="Punktlista"
        >
          <List className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="Numrerad lista"
        >
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Horizontal rule */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horisontell linje"
        >
          <Minus className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Link & Image */}
        <ToolbarBtn
          onClick={setLink}
          active={editor.isActive("link")}
          title="Lägg till länk"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={addImage}
          title="Lägg till bild (URL)"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Undo/Redo */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="Ångra (Ctrl+Z)"
        >
          <Undo className="h-3.5 w-3.5" />
        </ToolbarBtn>
        <ToolbarBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="Gör om (Ctrl+Y)"
        >
          <Redo className="h-3.5 w-3.5" />
        </ToolbarBtn>

        <Divider />

        {/* Clear formatting */}
        <ToolbarBtn
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}
          title="Rensa formatering"
        >
          <RemoveFormatting className="h-3.5 w-3.5" />
        </ToolbarBtn>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
