import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { BlogNotFound } from "@/app/(blog)/components/BlogNotFound";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import "@/app/styles/globals.css";

// The routing-level response chooses its language from this request.
export const instant = false;

export const metadata: Metadata = {
  robots: { index: false },
};

export default async function GlobalNotFound() {
  const locale = normalizeMultiLangLocale(await getLocale());
  return (
    <html lang={locale}>
      <body>
        <BlogNotFound locale={locale} />
      </body>
    </html>
  );
}
