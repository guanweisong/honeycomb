import sanitizeHtml from "sanitize-html";
import type { I18n } from "@/packages/trpc/api/schemas/i18n.schema";

const SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "div",
    "section",
    "article",
    "p",
    "br",
    "hr",
    "blockquote",
    "pre",
    "code",
    "span",
    "figure",
    "figcaption",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "mark",
    "sup",
    "sub",
    "ul",
    "ol",
    "li",
    "dl",
    "dt",
    "dd",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "a",
    "img",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "width", "height"],
    pre: ["class"],
    code: ["class"],
    table: ["style"],
    th: ["colspan", "rowspan", "style"],
    td: ["colspan", "rowspan", "style"],
    p: ["style", "class"],
    div: ["style", "class"],
    section: ["style", "class"],
    article: ["style", "class"],
    span: ["style", "class"],
    h1: ["style", "class"],
    h2: ["style", "class"],
    h3: ["style", "class"],
    h4: ["style", "class"],
    h5: ["style", "class"],
    h6: ["style", "class"],
    figure: ["class"],
    figcaption: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: {
    img: ["http", "https"],
  },
  allowedStyles: {
    p: {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
      color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/],
      "background-color": [
        /^#[0-9a-fA-F]{3,8}$/,
        /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/,
      ],
    },
    span: {
      color: [/^#[0-9a-fA-F]{3,8}$/, /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/],
      "background-color": [
        /^#[0-9a-fA-F]{3,8}$/,
        /^rgb\((\s*\d+\s*,){2}\s*\d+\s*\)$/,
      ],
    },
    table: {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    th: {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    td: {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h1: {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h2: {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h3: {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h4: {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h5: {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
    h6: {
      "text-align": [/^left$/, /^right$/, /^center$/, /^justify$/],
    },
  },
};

export const sanitizeRichText = (value: string | null | undefined) => {
  if (!value) {
    return "";
  }
  return sanitizeHtml(value, SANITIZE_OPTIONS);
};

type OptionalI18nInput = Partial<Record<keyof I18n, string | null>> | null | undefined;

export const sanitizeOptionalI18nHtml = (value: OptionalI18nInput) => {
  if (value == null) {
    return value;
  }

  return {
    en: sanitizeRichText(value.en ?? ""),
    zh: sanitizeRichText(value.zh ?? ""),
  };
};
