import { Marked } from "marked";
import DOMPurify from "isomorphic-dompurify";

/**
 * Blog content rendering: Markdown source (what GLM generates and the
 * editor stores) → sanitized HTML. The sanitizer allowlist is the
 * security boundary — n8n/GLM output is untrusted input by definition
 * (spec section 43), so nothing outside this set ever reaches the DOM.
 */

const marked = new Marked({ gfm: true, breaks: false });

const ALLOWED_TAGS = [
  "h1", "h2", "h3", "h4",
  "p", "br", "hr",
  "ul", "ol", "li",
  "blockquote",
  "strong", "em", "s", "code", "pre",
  "a", "img",
  "table", "thead", "tbody", "tr", "th", "td",
];

const ALLOWED_ATTR = [
  "href", "title", "target", "rel",
  "src", "alt", "width", "height", "loading",
  "class",
];

// External article links open safely; images load lazily.
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("href")?.startsWith("http")) {
    node.setAttribute("target", "_blank");
    node.setAttribute("rel", "noopener noreferrer");
  }
  if (node.tagName === "IMG") {
    node.setAttribute("loading", "lazy");
  }
});

export function markdownToHtml(markdown: string | null | undefined): string {
  if (!markdown) return "";
  const raw = marked.parse(markdown, { async: false });
  return DOMPurify.sanitize(raw, { ALLOWED_TAGS, ALLOWED_ATTR });
}

/** Plain-text excerpt fallback derived from markdown when unset. */
export function markdownExcerpt(markdown: string | null | undefined, max = 180): string {
  const text = (markdown ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`\[\]()!-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}
