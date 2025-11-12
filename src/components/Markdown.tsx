import { useMemo } from "react";
import MarkdownPreview from "@uiw/react-markdown-preview";
import "@uiw/react-markdown-preview/markdown.css";
import { cn } from "./ui/utils";
import "./markdown.css";

type MarkdownProps = {
  content: string;
  className?: string;
  invert?: boolean;
};

const preprocessContent = (value: string): string =>
  value
    .replace(/\r\n?/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\([\\`*_{[\]()#+\-.!>])/g, "$1");

export function Markdown({ content, className, invert = false }: MarkdownProps) {
  const prepared = useMemo(() => preprocessContent(content), [content]);

  return (
    <div
      className={cn(
        "markdown-bubble max-w-none break-words [&_*]:leading-relaxed",
        invert ? "markdown-bubble--invert" : "markdown-bubble--default",
        className,
      )}
      data-color-mode={invert ? "dark" : "light"}
    >
      <MarkdownPreview
        source={prepared}
        className="markdown-bubble__preview"
        wrapperElement={{ "data-color-mode": invert ? "dark" : "light" }}
        style={{ backgroundColor: "transparent" }}
      />
    </div>
  );
}
