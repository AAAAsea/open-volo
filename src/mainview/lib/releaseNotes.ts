import DOMPurify from "dompurify";
import { marked } from "marked";

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderReleaseNotesToHtml(value: string) {
  const input = String(value || "").trim();
  if (!input) return "";

  const rendered = marked.parse(input, { async: false });
  return DOMPurify.sanitize(rendered, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      "a",
      "blockquote",
      "br",
      "code",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "li",
      "ol",
      "p",
      "pre",
      "strong",
      "tt",
      "ul",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    FORBID_ATTR: ["style", "onerror", "onclick", "onload"],
  });
}
