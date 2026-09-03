/**
 * The Markdown renderer that draws the legal documents.
 *
 * Rendered with `renderToStaticMarkup` rather than a DOM testing library:
 * this component is pure (props in, elements out) with no state or effects,
 * so static markup is the whole behaviour, and it keeps the test in the
 * project's default `node` Vitest environment with no new dependency.
 *
 * The security case is the important one. This renderer exists partly so the
 * app never has to call `dangerouslySetInnerHTML` on document text, so the
 * escaping tests below are load-bearing, not decorative.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { MarkdownDocument } from '../MarkdownDocument';

const render = (markdown: string, onDocumentLink?: (file: string) => void) =>
  renderToStaticMarkup(<MarkdownDocument markdown={markdown} onDocumentLink={onDocumentLink} />);

describe('MarkdownDocument blocks', () => {
  it('renders the three heading levels', () => {
    const html = render('# Title\n\n## Section\n\n### Detail');
    expect(html).toContain('<h1');
    expect(html).toContain('Title');
    expect(html).toContain('<h2');
    expect(html).toContain('Section');
    expect(html).toContain('<h3');
    expect(html).toContain('Detail');
  });

  it('joins wrapped lines into one paragraph', () => {
    const html = render('This sentence was\nhard-wrapped in the source.');
    expect(html).toContain('This sentence was hard-wrapped in the source.');
    expect((html.match(/<p /g) ?? []).length).toBe(1);
  });

  it('renders a horizontal rule', () => {
    expect(render('a\n\n---\n\nb')).toContain('<hr');
  });

  it('renders unordered and ordered lists', () => {
    const ul = render('- first\n- second');
    expect(ul).toContain('<ul');
    expect((ul.match(/<li /g) ?? []).length).toBe(2);

    const ol = render('1. first\n2. second\n3. third');
    expect(ol).toContain('<ol');
    expect((ol.match(/<li /g) ?? []).length).toBe(3);
  });

  it('renders a table with a header row and body rows', () => {
    const html = render('| Data | Why |\n| --- | --- |\n| Email | Login |\n| Username | Handle |');
    expect(html).toContain('<table');
    expect((html.match(/<th /g) ?? []).length).toBe(2);
    expect((html.match(/<tr/g) ?? []).length).toBe(3); // header + 2 body rows
    expect(html).toContain('Username');
  });

  it('renders a fenced code block', () => {
    const html = render('```\nline one\nline two\n```');
    expect(html).toContain('<pre');
    expect(html).toContain('line one');
  });

  it('does not hang on an unterminated code fence', () => {
    const html = render('```\nnever closed');
    expect(html).toContain('never closed');
  });

  it('renders an empty document without throwing', () => {
    expect(render('')).toBe('<div></div>');
  });
});

describe('MarkdownDocument inline', () => {
  it('renders bold, italic and code', () => {
    const html = render('A **bold** and *soft* and `code` line.');
    expect(html).toContain('<strong');
    expect(html).toContain('bold');
    expect(html).toContain('<em');
    expect(html).toContain('<code');
  });

  it('prefers code over emphasis inside backticks', () => {
    const html = render('`**not bold**`');
    expect(html).not.toContain('<strong');
    expect(html).toContain('**not bold**');
  });

  it('links out to http and mailto in a new tab', () => {
    const http = render('[site](https://example.com)');
    expect(http).toContain('href="https://example.com"');
    expect(http).toContain('target="_blank"');
    expect(http).toContain('rel="noreferrer noopener"');

    expect(render('[mail](mailto:a@b.c)')).toContain('href="mailto:a@b.c"');
  });

  it('turns a sibling document link into a button when a handler is given', () => {
    const html = render('see [the policy](./DMCA.md)', () => {});
    expect(html).toContain('<button');
    expect(html).not.toContain('href="./DMCA.md"');
    expect(html).toContain('the policy');
  });

  it('degrades a sibling document link to plain text without a handler', () => {
    const html = render('see [the policy](./DMCA.md)');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('<a ');
    expect(html).toContain('the policy');
  });

  it('never emits an anchor for an unroutable relative link', () => {
    const html = render('[nope](/some/path)');
    expect(html).not.toContain('<a ');
    expect(html).toContain('nope');
  });
});

describe('MarkdownDocument escaping', () => {
  /**
   * The renderer builds React elements and never touches
   * dangerouslySetInnerHTML, so document text can only ever become text. If
   * this test starts failing, someone has introduced raw HTML injection into
   * the path that renders our published legal documents.
   */
  it('escapes HTML in paragraph text', () => {
    const html = render('before <script>alert(1)</script> after');
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;');
  });

  it('escapes HTML inside table cells and list items', () => {
    expect(render('- <img onerror="x">')).not.toContain('<img');
    expect(render('| a |\n| --- |\n| <b>x</b> |')).not.toContain('<b>x</b>');
  });

  it('escapes quotes in an href instead of letting them close the attribute', () => {
    const html = render('[x](https://example.com/"onmouseover="alert(1))');
    // The payload survives as TEXT inside the attribute value, with its
    // quotes entity-escaped — so it can never become an attribute of its own.
    expect(html).toContain('&quot;onmouseover=&quot;');
    expect(html).not.toContain('" onmouseover="');
  });

  /**
   * The allow-list in MarkdownDocument is what stops this, not escaping:
   * only http(s) and mailto become anchors, so a javascript: URL renders as
   * inert text. Worth a test of its own — an allow-list is easy to widen
   * later without noticing what it was protecting.
   */
  it('refuses to link a javascript: URL', () => {
    const html = render('[click me](javascript:alert(1))');
    expect(html).not.toContain('<a ');
    expect(html).not.toContain('javascript:');
    expect(html).toContain('click me');
  });
});
