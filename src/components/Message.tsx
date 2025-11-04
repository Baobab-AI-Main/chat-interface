import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Options as RehypeSanitizeOptions } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import type { PluggableList } from "unified";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Spinner } from "./ui/spinner";
import { cn } from "./ui/utils";
import "highlight.js/styles/github-dark.css";
import { appConfig } from "../config";

interface MessageProps {
  content: string;
  role: "user" | "assistant" | "system";
  createdAt: string;
  senderAvatar?: string;
}

type PropertyDefinition = string | [string, ...(string | number | boolean | RegExp)[]];
type AttributeList = PropertyDefinition[];

const cloneAttributes = (list?: readonly PropertyDefinition[]): AttributeList => [...(list ?? [])];

const mergeAttributes = (
  existing: readonly PropertyDefinition[] | undefined,
  additions: AttributeList,
): AttributeList => [...cloneAttributes(existing), ...additions];

const markdownSchema: RehypeSanitizeOptions = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: mergeAttributes(defaultSchema.attributes?.code, ["className"]),
    pre: mergeAttributes(defaultSchema.attributes?.pre, ["className"]),
    span: mergeAttributes(defaultSchema.attributes?.span, ["className"]),
    ul: mergeAttributes(defaultSchema.attributes?.ul, ["className"]),
    ol: mergeAttributes(defaultSchema.attributes?.ol, ["className"]),
    li: mergeAttributes(defaultSchema.attributes?.li, ["className"]),
    table: mergeAttributes(defaultSchema.attributes?.table, ["className"]),
    thead: mergeAttributes(defaultSchema.attributes?.thead, ["className"]),
    tbody: mergeAttributes(defaultSchema.attributes?.tbody, ["className"]),
    tr: mergeAttributes(defaultSchema.attributes?.tr, ["className"]),
    th: mergeAttributes(defaultSchema.attributes?.th, ["className", "align", "scope"]),
    td: mergeAttributes(defaultSchema.attributes?.td, ["className", "align", "colSpan", "rowSpan"]),
    a: mergeAttributes(defaultSchema.attributes?.a, ["className", "target", "rel"]),
  },
  tagNames: Array.from(
    new Set([
      ...(((defaultSchema.tagNames as string[]) ?? [])),
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ]),
  ),
};

const rehypePlugins = [[rehypeSanitize, markdownSchema], rehypeHighlight] as PluggableList;

export function Message({ content, role, createdAt, senderAvatar }: MessageProps) {
  const isUser = role === "user";
  const isLoadingAssistant = role === "assistant" && content.trim() === "";

  const formattedTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(createdAt));

  const markdownComponents: Components = {
    a: ({ className, children, ...props }) => (
        <a
          {...props}
          className={cn(
            "underline underline-offset-2 hover:opacity-80",
            isUser ? "text-white" : "text-cyan-600",
            className
          )}
          target="_blank"
          rel="noopener noreferrer"
        >
          {children}
        </a>
      ),
    p: ({ className, children, ...props }) => (
      <p {...props} className={cn("my-3 leading-relaxed", className)}>
        {children}
      </p>
    ),
    ul: ({ className, children, ...props }) => (
      <ul {...props} className={cn("my-3 list-disc space-y-2 pl-6", className)}>
        {children}
      </ul>
    ),
    ol: ({ className, children, ...props }) => (
      <ol {...props} className={cn("my-3 list-decimal space-y-2 pl-6", className)}>
        {children}
      </ol>
    ),
    li: ({ className, children, ...props }) => (
      <li {...props} className={cn("leading-relaxed", className)}>
        {children}
      </li>
    ),
    blockquote: ({ className, children, ...props }) => (
      <blockquote
        {...props}
        className={cn("my-4 border-l-4 border-muted-foreground/40 pl-4 italic", className)}
      >
        {children}
      </blockquote>
    ),
    table: ({ className, children, ...props }) => (
      <div className="my-4 w-full overflow-x-auto">
        <table {...props} className={cn("w-full border-collapse text-sm", className)}>
          {children}
        </table>
      </div>
    ),
    thead: ({ className, children, ...props }) => (
      <thead {...props} className={cn("bg-muted text-foreground", className)}>
        {children}
      </thead>
    ),
    tbody: ({ className, children, ...props }) => (
      <tbody {...props} className={cn("divide-y divide-border", className)}>
        {children}
      </tbody>
    ),
    tr: ({ className, children, ...props }) => (
      <tr {...props} className={cn("border-b border-border last:border-0", className)}>
        {children}
      </tr>
    ),
    th: ({ className, children, ...props }) => (
      <th
        {...props}
        className={cn(
          "px-3 py-2 text-left font-medium text-muted-foreground",
          className
        )}
      >
        {children}
      </th>
    ),
    td: ({ className, children, ...props }) => (
      <td {...props} className={cn("px-3 py-2 align-top", className)}>
        {children}
      </td>
    ),
  code: ({
    inline,
    className,
    children,
    ...props
  }: {
    inline?: boolean;
    className?: string;
    children?: ReactNode;
  } & ComponentPropsWithoutRef<"code">) => {
      if (inline) {
        return (
          <code
            {...props}
            className={cn("rounded bg-muted px-1 py-0.5 text-sm font-mono", className)}
          >
            {children}
          </code>
        );
      }

      return (
        <pre className="bg-muted/70 p-3 rounded-lg overflow-x-auto text-sm">
          <code
            {...props}
            className={cn("font-mono", className)}
          >
            {children}
          </code>
        </pre>
      );
    },
  };

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"} mb-6`}>
      <Avatar className="w-8 h-8">
        <AvatarImage src={senderAvatar} alt={isUser ? "You" : appConfig.brandFallbackName} />
        <AvatarFallback className={isUser ? "bg-blue-100 text-blue-700" : "bg-black text-white"}>
          {isUser ? "U" : "AI"}
        </AvatarFallback>
      </Avatar>

      <div className={`flex flex-col ${isUser ? "items-end" : "items-start"} max-w-[70%]`}>
        <div
          className={`rounded-2xl px-4 py-3 ${
            isUser ? "bg-blue-600 text-white" : "bg-muted text-foreground"
          }`}
        >
          {isLoadingAssistant ? (
            <div className="flex items-center justify-center">
              <Spinner size="sm" />
            </div>
          ) : (
            <ReactMarkdown
              className={cn(
                "prose max-w-none break-words whitespace-pre-wrap [&_*]:leading-relaxed",
                isUser ? "prose-invert" : ""
              )}
              remarkPlugins={[remarkGfm, remarkBreaks]}
              rehypePlugins={rehypePlugins}
              components={markdownComponents}
            >
              {content}
            </ReactMarkdown>
          )}
        </div>

        <span className="mt-2 px-2 text-xs text-muted-foreground">{formattedTime}</span>
      </div>
    </div>
  );
}