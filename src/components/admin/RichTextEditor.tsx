"use client";

import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import "react-quill/dist/quill.snow.css";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
};

type QuillComponent = ComponentType<{
  theme?: string;
  value?: string;
  onChange?: (v: string) => void;
  modules?: unknown;
  placeholder?: string;
  className?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ref?: any;
}>;

/**
 * WYSIWYG for blog body (react-quill, client-only).
 * Image button uploads to Supabase Storage via /api/admin/upload.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
}: Props) {
  const [Quill, setQuill] = useState<QuillComponent | null>(null);
  const quillRef = useRef<{
    getEditor: () => {
      getSelection: (focus?: boolean) => { index: number } | null;
      insertEmbed: (index: number, type: string, url: string) => void;
      setSelection: (index: number) => void;
    };
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("react-quill").then((mod) => {
      if (!cancelled) {
        setQuill(() => mod.default as unknown as QuillComponent);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const modules = useMemo(
    () => ({
      toolbar: {
        container: [
          [{ header: [2, 3, false] }],
          ["bold", "italic", "underline"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "link", "image"],
          ["clean"],
        ],
        handlers: {
          image: () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async () => {
              const file = input.files?.[0];
              if (!file) return;
              try {
                const fd = new FormData();
                fd.append("files", file);
                fd.append("productKey", "blog-body");
                const res = await fetch("/api/admin/upload", {
                  method: "POST",
                  body: fd,
                });
                const data = await res.json();
                const url = data.urls?.[0] as string | undefined;
                if (!url) throw new Error(data.error || "Upload failed");
                const editor = quillRef.current?.getEditor();
                if (!editor) return;
                const range = editor.getSelection(true);
                const index = range ? range.index : 0;
                editor.insertEmbed(index, "image", url);
                editor.setSelection(index + 1);
              } catch (e) {
                alert(
                  e instanceof Error ? e.message : "Не вдалося завантажити фото"
                );
              }
            };
            input.click();
          },
        },
      },
    }),
    []
  );

  if (!Quill) {
    return (
      <div
        className={`min-h-[220px] rounded-lg border border-zinc-300 bg-zinc-50 p-3 text-sm text-zinc-400 ${className || ""}`}
      >
        Завантаження редактора…
      </div>
    );
  }

  return (
    <div className={className}>
      <Quill
        ref={quillRef}
        theme="snow"
        value={value}
        onChange={onChange}
        modules={modules}
        placeholder={placeholder}
        className="blog-quill bg-white text-zinc-900"
      />
      <style jsx global>{`
        .blog-quill .ql-toolbar {
          border-color: #d4d4d8;
          border-radius: 0.5rem 0.5rem 0 0;
          background: #fafafa;
        }
        .blog-quill .ql-container {
          border-color: #d4d4d8;
          border-radius: 0 0 0.5rem 0.5rem;
          min-height: 220px;
          font-family: inherit;
          font-size: 0.9rem;
        }
        .blog-quill .ql-editor {
          min-height: 220px;
        }
        .blog-quill .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
        }
      `}</style>
    </div>
  );
}
