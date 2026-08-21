import type { ReactNode } from "react";

type GuideBodyRendererProps = {
  content: string;
  compact?: boolean;
  className?: string;
};

type GuideBlock =
  | { type: "heading"; level: 2 | 3; text: string }
  | { type: "paragraph"; text: string }
  | { type: "ordered-list"; items: string[] }
  | { type: "bullet-list"; items: string[] };

function parseInline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={index} className="font-bold text-neutral-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={index} className="italic">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <span key={index}>{part}</span>;
  });
}

function parseBlocks(content: string): GuideBlock[] {
  const lines = content.replace(/\r/g, "").split("\n");
  const blocks: GuideBlock[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: "paragraph", text: paragraph.join(" ") });
      paragraph = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      blocks.push({
        type: "heading",
        level: heading[1].length === 1 ? 2 : heading[1].length === 2 ? 2 : 3,
        text: heading[2],
      });
      continue;
    }

    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      flushParagraph();
      const items = [ordered[1]];
      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim().match(/^\d+\.\s+(.+)$/);
        if (!next) break;
        items.push(next[1]);
        index += 1;
      }
      blocks.push({ type: "ordered-list", items });
      continue;
    }

    const bullet = line.match(/^(?:-|\*)\s+(.+)$/);
    if (bullet) {
      flushParagraph();
      const items = [bullet[1]];
      while (index + 1 < lines.length) {
        const next = lines[index + 1].trim().match(/^(?:-|\*)\s+(.+)$/);
        if (!next) break;
        items.push(next[1]);
        index += 1;
      }
      blocks.push({ type: "bullet-list", items });
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  return blocks;
}

export function GuideBodyRenderer({
  content,
  compact = false,
  className,
}: GuideBodyRendererProps) {
  const blocks = parseBlocks(content);
  const paragraphClass = compact
    ? "text-sm leading-6 text-neutral-700"
    : "text-body-lg leading-8 text-neutral-700";
  const headingTwoClass = compact
    ? "mt-5 border-b border-neutral-200 pb-2 text-base font-bold text-neutral-900"
    : "mt-9 border-b border-neutral-200 pb-3 text-xl font-bold tracking-tight text-neutral-900 first:mt-0";
  const headingThreeClass = compact
    ? "mt-4 text-sm font-bold text-neutral-900"
    : "mt-6 text-lg font-bold text-neutral-900";

  return (
    <div className={`space-y-4 ${className ?? ""}`}>
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const Heading = block.level === 2 ? "h2" : "h3";
          return (
            <Heading
              key={index}
              className={block.level === 2 ? headingTwoClass : headingThreeClass}
            >
              {parseInline(block.text)}
            </Heading>
          );
        }

        if (block.type === "ordered-list") {
          return (
            <ol key={index} className={compact ? "space-y-2" : "space-y-3"}>
              {block.items.map((item, itemIndex) => (
                <li
                  key={`${index}-${itemIndex}`}
                  className={`flex items-start ${compact ? "gap-2.5 rounded-lg border border-neutral-200 bg-white p-3" : "gap-3.5 rounded-xl border border-neutral-200/90 bg-white p-4 shadow-2xs"}`}
                >
                  <span
                    className={`bg-primary-700 flex shrink-0 items-center justify-center rounded-full font-bold text-white ${compact ? "size-6 text-[10px]" : "size-7 text-xs"}`}
                  >
                    {itemIndex + 1}
                  </span>
                  <p className={`${paragraphClass} pt-0.5`}>{parseInline(item)}</p>
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === "bullet-list") {
          return (
            <ul key={index} className={compact ? "space-y-1.5" : "space-y-2"}>
              {block.items.map((item, itemIndex) => (
                <li key={`${index}-${itemIndex}`} className="flex items-start gap-3 pl-1">
                  <span className="bg-primary-600 mt-2 size-1.5 shrink-0 rounded-full" />
                  <p className={paragraphClass}>{parseInline(item)}</p>
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={index} className={paragraphClass}>
            {parseInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
