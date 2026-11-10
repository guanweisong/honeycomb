import { getLocale } from "next-intl/server";
import { BlogNotFound } from "@/app/(blog)/components/BlogNotFound";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";

export default async function NotFound() {
  return <BlogNotFound locale={normalizeMultiLangLocale(await getLocale())} />;
}
