/**
 * A deliberately small Markdown renderer, themed to the game's panels.
 *
 * WHY NOT A LIBRARY: the app ships three Markdown files (see
 * src/app/legal/legalDocuments.ts) written by us, in a subset we control —
 * headings, rules, paragraphs, lists, tables, and inline emphasis/code/links.
 * Pulling in a full CommonMark parser plus a sanitiser to render our own text
 * would add a dependency and an HTML-injection surface for no gain. This
 * renderer never produces raw HTML: every node is a real React element, so
 * there is no `dangerouslySetInnerHTML` anywhere in this path and untrusted
 * Markdown could at worst render as ugly text.
 *
 * WHAT IT DOES NOT SUPPORT, on purpose: nested lists, images, footnotes,
 * reference links, inline HTML, and setext headings. If a legal document ever
 * needs one, add it here — do not work around it by hand-writing the page.
 *
 * Ordered/unordered list items, table cells, and paragraphs all share the
 * same inline pass, so `**bold**`, `` `code` `` and `[links](url)` behave the
 * same everywhere.
 */
import type { ReactNode } from 'react';

export interface MarkdownDocumentProps {
  markdown: string;
  /**
   * Called for a relative link to a sibling document (e.g. `./DMCA.md`) with
   * the bare file name, so the host screen can switch tabs instead of the
   * browser trying to navigate to a file that is not served. When omitted,
   * such links render as plain text — never as a dead anchor.
   */
  onDocumentLink?: (fileName: string) => void;
  className?: string;
}

// ---------------------------------------------------------------- inline ---

type InlinePattern = {
  regex: RegExp;
  render: (match: RegExpExecArray, key: string, props: MarkdownDocumentProps) => ReactNode;
};

const LINK_CLASS =
  'font-semibold text-[rgb(var(--op-gold-rgb))] underline decoration-[rgb(var(--op-gold-rgb)/0.45)] underline-offset-4 transition hover:brightness-125';

const INLINE_PATTERNS: InlinePattern[] = [
  {
    // Code first: backticks must win over emphasis inside them.
    regex: /`([^`]+)`/,
    render: (m, key) => (
      <code key={key} className="rounded bg-black/45 px-1.5 py-0.5 font-mono text-[0.9em] text-cyan-200">
        {m[1]}
      </code>
    ),
  },
  {
    regex: /\*\*([^*]+)\*\*/,
    render: (m, key) => (
      <strong key={key} className="font-bold text-white">
        {m[1]}
      </strong>
    ),
  },
  {
    regex: /\[([^\]]+)\]\(([^)]+)\)/,
    render: (m, key, props) => {
      const [, label, href] = m;
      const sibling = /^\.\/([A-Za-z0-9_-]+\.md)$/.exec(href);
      if (sibling) {
        if (!props.onDocumentLink) return <span key={key}>{label}</span>;
        const fileName = sibling[1];
        return (
          <button key={key} type="button" className={LINK_CLASS} onClick={() => props.onDocumentLink?.(fileName)}>
            {label}
          </button>
        );
      }
      if (href.startsWith('mailto:') || /^https?:\/\//.test(href)) {
        return (
          <a key={key} href={href} target="_blank" rel="noreferrer noopener" className={LINK_CLASS}>
            {label}
          </a>
        );
      }
      // Anything else (an anchor, a path we do not serve) stays inert text
      // rather than becoming a link that 404s inside a single-page app.
      return <span key={key}>{label}</span>;
    },
  },
  {
    // Single asterisks last, so `**bold**` has already been consumed.
    regex: /\*([^*]+)\*/,
    render: (m, key) => (
      <em key={key} className="italic text-white/85">
        {m[1]}
      </em>
    ),
  },
];

/** Splits one line of Markdown into React nodes. Never returns raw HTML. */
export function renderInline(text: string, keyPrefix: string, props: MarkdownDocumentProps): ReactNode[] {
  const nodes: ReactNode[] = [];
  let rest = text;
  let index = 0;

  while (rest.length > 0) {
    let earliest: { at: number; match: RegExpExecArray; pattern: InlinePattern } | null = null;

    for (const pattern of INLINE_PATTERNS) {
      const match = pattern.regex.exec(rest);
      if (match && (earliest === null || match.index < earliest.at)) {
        earliest = { at: match.index, match, pattern };
      }
    }

    if (!earliest) {
      nodes.push(rest);
      break;
    }

    if (earliest.at > 0) nodes.push(rest.slice(0, earliest.at));
    nodes.push(earliest.pattern.render(earliest.match, `${keyPrefix}-i${index}`, props));
    rest = rest.slice(earliest.at + earliest.match[0].length);
    index += 1;
  }

  return nodes;
}

// ----------------------------------------------------------------- blocks ---

const TABLE_ROW = /^\|(.+)\|\s*$/;
const TABLE_DIVIDER = /^\|[\s:|-]+\|\s*$/;

function splitRow(line: string): string[] {
  const inner = TABLE_ROW.exec(line)?.[1] ?? '';
  return inner.split('|').map((cell) => cell.trim());
}

/**
 * Groups lines into blocks and renders them. Written as an explicit cursor
 * loop rather than a regex over the whole document so that a malformed table
 * or an unterminated code fence degrades into paragraphs instead of eating
 * the rest of the page.
 */
export function MarkdownDocument(props: MarkdownDocumentProps) {
  const { markdown, className } = props;
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const blocks: ReactNode[] = [];
  let i = 0;

  const push = (node: ReactNode) => blocks.push(node);

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;

    // Blank
    if (line.trim() === '') {
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^---+\s*$/.test(line)) {
      push(<hr key={key} className="my-6 border-0 border-t border-white/12" />);
      i += 1;
      continue;
    }

    // Fenced code
    if (line.trim().startsWith('```')) {
      const body: string[] = [];
      i += 1;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        body.push(lines[i]);
        i += 1;
      }
      i += 1; // closing fence (or end of file)
      push(
        <pre
          key={key}
          className="my-4 overflow-x-auto border border-white/12 bg-black/45 p-3 font-mono text-[11px] leading-5 text-cyan-100/90"
        >
          <code>{body.join('\n')}</code>
        </pre>,
      );
      continue;
    }

    // Headings
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const content = renderInline(heading[2], key, props);
      if (level === 1) {
        push(
          <h1 key={key} className="mt-2 font-heading text-xl font-black uppercase tracking-[0.1em] text-white sm:text-2xl">
            {content}
          </h1>,
        );
      } else if (level === 2) {
        push(
          <h2
            key={key}
            className="mt-7 border-b border-[rgb(var(--op-gold-rgb)/0.25)] pb-1.5 font-heading text-sm font-black uppercase tracking-[0.16em] text-[rgb(var(--op-gold-rgb))] sm:text-base"
          >
            {content}
          </h2>,
        );
      } else {
        push(
          <h3 key={key} className="mt-5 font-heading text-[12px] font-black uppercase tracking-[0.14em] text-cyan-200 sm:text-sm">
            {content}
          </h3>,
        );
      }
      i += 1;
      continue;
    }

    // Table
    if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1])) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && TABLE_ROW.test(lines[i])) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      push(
        <div key={key} className="my-4 overflow-x-auto border border-white/12">
          <table className="w-full min-w-[30rem] border-collapse text-left text-[11px] leading-5 sm:text-xs">
            <thead>
              <tr className="bg-black/45">
                {header.map((cell, c) => (
                  <th
                    key={c}
                    className="border-b border-white/12 px-3 py-2 font-heading text-[10px] font-black uppercase tracking-[0.14em] text-[rgb(var(--op-gold-rgb))]"
                  >
                    {renderInline(cell, `${key}-h${c}`, props)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, r) => (
                <tr key={r} className={r % 2 === 1 ? 'bg-white/[0.03]' : undefined}>
                  {row.map((cell, c) => (
                    <td key={c} className="border-b border-white/8 px-3 py-2 align-top text-white/70">
                      {renderInline(cell, `${key}-r${r}c${c}`, props)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    // Unordered list
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*]\s+/, ''));
        i += 1;
      }
      push(
        <ul key={key} className="my-3 flex flex-col gap-1.5 pl-1">
          {items.map((item, n) => (
            <li key={n} className="flex gap-2.5 text-[13px] leading-6 text-white/70">
              <span aria-hidden="true" className="mt-[0.55rem] h-1 w-1 flex-none rounded-full bg-[rgb(var(--op-gold-rgb)/0.8)]" />
              <span>{renderInline(item, `${key}-l${n}`, props)}</span>
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Ordered list
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i += 1;
      }
      push(
        <ol key={key} className="my-3 flex flex-col gap-1.5 pl-1">
          {items.map((item, n) => (
            <li key={n} className="flex gap-2.5 text-[13px] leading-6 text-white/70">
              <span className="mt-px w-4 flex-none text-right font-heading text-[11px] font-black text-[rgb(var(--op-gold-rgb)/0.85)]">
                {n + 1}.
              </span>
              <span>{renderInline(item, `${key}-o${n}`, props)}</span>
            </li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph — consume until a blank line or the start of another block.
    const paragraph: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(#{1,4})\s+/.test(lines[i]) &&
      !/^---+\s*$/.test(lines[i]) &&
      !/^[-*]\s+/.test(lines[i]) &&
      !/^\d+\.\s+/.test(lines[i]) &&
      !TABLE_ROW.test(lines[i]) &&
      !lines[i].trim().startsWith('```')
    ) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    // A "paragraph" that consumed nothing would spin forever; guard it.
    if (paragraph.length === 0) {
      paragraph.push(lines[i].trim());
      i += 1;
    }
    push(
      <p key={key} className="my-3 text-[13px] leading-6 text-white/70">
        {renderInline(paragraph.join(' '), key, props)}
      </p>,
    );
  }

  return <div className={className}>{blocks}</div>;
}
