import { BlogNotFound } from "@/app/(blog)/components/BlogNotFound";
import { routing } from "@/lib/i18n/routing";

export default function NotFound() {
  return <BlogNotFound locale={routing.defaultLocale} />;
}
