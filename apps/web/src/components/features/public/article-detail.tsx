import Image from "next/image";
import type { ReactNode } from "react";

import type { ArticleDocument, ArticleImage } from "@/lib/api/public-types";

function renderChildren(node: Record<string, unknown>, key: string): ReactNode[] {
  const children = Array.isArray(node.content) ? node.content : [];
  return children.map((child, index) =>
    renderNode(child as Record<string, unknown>, `${key}-${index}`),
  );
}

function renderText(node: Record<string, unknown>, key: string): ReactNode {
  let value: ReactNode = typeof node.text === "string" ? node.text : "";
  const marks = Array.isArray(node.marks) ? node.marks : [];
  for (const mark of marks as Array<Record<string, unknown>>) {
    if (mark.type === "bold") value = <strong key={`${key}-bold`}>{value}</strong>;
    if (mark.type === "italic") value = <em key={`${key}-italic`}>{value}</em>;
    if (mark.type === "link") {
      const href = (mark.attrs as Record<string, unknown> | undefined)?.href;
      if (typeof href === "string" && /^https?:\/\//.test(href)) {
        value = (
          <a
            key={`${key}-link`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary-700 underline underline-offset-2"
          >
            {value}
          </a>
        );
      }
    }
  }
  return value;
}

function renderNode(node: Record<string, unknown>, key: string): ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);
    case "heading":
      return (node.attrs as Record<string, unknown> | undefined)?.level === 3 ? (
        <h3 key={key} className="text-h3 mt-8 text-neutral-900">
          {renderChildren(node, key)}
        </h3>
      ) : (
        <h2 key={key} className="text-h2 mt-10 text-neutral-900">
          {renderChildren(node, key)}
        </h2>
      );
    case "bulletList":
      return (
        <ul key={key} className="text-body-lg ml-5 list-disc space-y-2 text-neutral-700">
          {renderChildren(node, key)}
        </ul>
      );
    case "orderedList":
      return (
        <ol
          key={key}
          className="text-body-lg ml-5 list-decimal space-y-2 text-neutral-700"
        >
          {renderChildren(node, key)}
        </ol>
      );
    case "listItem":
      return <li key={key}>{renderChildren(node, key)}</li>;
    case "blockquote":
      return (
        <blockquote
          key={key}
          className="border-primary-500 bg-primary-50 text-body-lg my-6 border-l-4 px-5 py-4 text-neutral-700"
        >
          {renderChildren(node, key)}
        </blockquote>
      );
    default:
      return (
        <p key={key} className="text-body-lg leading-8 text-neutral-700">
          {renderChildren(node, key)}
        </p>
      );
  }
}

export function ArticleDetail({
  body,
  images,
  cover,
  eyebrow,
  metadata,
}: {
  body: ArticleDocument;
  images: ArticleImage[];
  cover?: ArticleImage | null;
  eyebrow?: string;
  metadata?: string[];
}) {
  const gallery = images.filter((image) => image.id !== cover?.id);
  return (
    <article className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      {cover ? (
        <figure className="mb-9 overflow-hidden rounded-[20px] border border-neutral-200 bg-neutral-100 shadow-sm-card">
          <Image
            src={cover.url}
            alt={cover.alt_text}
            width={1600}
            height={900}
            unoptimized
            priority
            className="aspect-video w-full object-cover"
          />
          {cover.caption ? <figcaption className="px-5 py-3 text-sm text-neutral-600">{cover.caption}</figcaption> : null}
        </figure>
      ) : null}
      {eyebrow || metadata?.length ? (
        <header className="mb-8 border-l-4 border-primary-500 pl-4">
          {eyebrow ? <p className="text-overline text-primary-700">{eyebrow}</p> : null}
          {metadata?.length ? <p className="mt-2 text-sm text-neutral-600">{metadata.join(" · ")}</p> : null}
        </header>
      ) : null}
      <div className="space-y-5">
        {body.content.map((node, index) => renderNode(node, `body-${index}`))}
      </div>
      {gallery.length > 0 ? (
        <section
          aria-label="Article gallery"
          className="mt-12 border-t border-neutral-200 pt-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            {gallery.map((image) => (
              <figure
                key={image.id}
                className="overflow-hidden rounded-[14px] border border-neutral-200 bg-white"
              >
                <Image
                  src={image.url}
                  alt={image.alt_text}
                  width={1200}
                  height={800}
                  unoptimized
                  className="aspect-[3/2] w-full object-cover"
                />
                {image.caption ? (
                  <figcaption className="px-4 py-3 text-sm text-neutral-600">
                    {image.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </section>
      ) : null}
    </article>
  );
}
