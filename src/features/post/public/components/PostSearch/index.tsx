"use client";

import { useEffect, useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { Search, X } from "lucide-react";
import Image from "next/image";
import { trpcClient } from "@/packages/trpc/client/trpc";
import { normalizeMultiLangLocale } from "@/packages/domain/localization/multi-lang";
import { Link } from "@/packages/ui/navigation/blog-navigation";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/packages/ui/components/dialog";
import { Input } from "@/packages/ui/components/input";
import { Button } from "@/packages/ui/components/button";
import { useMounted } from "@/packages/ui/hooks/use-mounted";

/** Mount only while open, so closing discards the query and cancels pending work. */
function SearchContent({ onNavigate }: { onNavigate: () => void }) {
  const t = useTranslations("Search");
  const locale = normalizeMultiLangLocale(useLocale());
  const inputId = useId();
  const [value, setValue] = useState("");
  const [composing, setComposing] = useState(false);
  const [query, setQuery] = useState("");
  const keyword = value.trim();

  useEffect(() => {
    if (composing) return;
    const timeout = setTimeout(() => setQuery(keyword), 300);
    return () => clearTimeout(timeout);
  }, [keyword, composing]);

  const ready = keyword.length > 0 && keyword === query && !composing;
  const result = useQuery({
    queryKey: ["public-post-search", locale, query],
    queryFn: ({ signal }) =>
      trpcClient.post.search.query({ query, locale }, { signal }),
    enabled: ready,
    retry: false,
    refetchOnWindowFocus: false,
    gcTime: 0,
  });
  const loading = keyword.length > 0 && (!ready || result.isFetching);

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogClose asChild>
          <Button variant="ghost" size="icon-sm" aria-label={t("close")}>
            <X aria-hidden="true" />
          </Button>
        </DialogClose>
      </div>
      <DialogDescription>{t("description")}</DialogDescription>
      <label className="sr-only" htmlFor={inputId}>
        {t("placeholder")}
      </label>
      <Input
        id={inputId}
        autoFocus
        type="search"
        autoComplete="off"
        maxLength={100}
        placeholder={t("placeholder")}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onCompositionStart={() => setComposing(true)}
        onCompositionEnd={() => setComposing(false)}
      />
      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
        aria-busy={loading}
      >
        <div
          role="status"
          aria-live="polite"
          className="text-sm text-muted-foreground"
        >
          {!keyword
            ? t("hint")
            : loading
              ? t("loading")
              : result.isError
                ? t("error")
                : result.data?.length === 0
                  ? t("empty")
                  : null}
        </div>
        {ready && !loading && result.isError && (
          <Button
            variant="outline"
            className="mt-3"
            onClick={() => void result.refetch()}
          >
            {t("retry")}
          </Button>
        )}
        {ready && !loading && !result.isError && result.data && (
          <ul className="space-y-2" aria-label={t("results")}>
            {result.data.map((post) => (
              <li key={post.id}>
                <Link
                  href={`/archives/${post.id}`}
                  onClick={onNavigate}
                  className="flex items-start gap-3 rounded-lg px-3 py-3 hover:bg-muted focus-visible:outline-2 focus-visible:outline-teal-500"
                >
                  {post.cover && (
                    <span
                      className="relative size-16 shrink-0 overflow-hidden rounded-md"
                      data-testid="search-cover"
                    >
                      <Image
                        src={post.cover.url}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <span className="text-xs text-muted-foreground">
                      {t(`types.${post.type}`)}
                    </span>
                    {post.type !== "QUOTE" && (
                      <div className="font-medium break-words">
                        {post.title || t("untitled")}
                      </div>
                    )}
                    <p
                      className={
                        post.type === "QUOTE"
                          ? "mt-1 font-medium break-words line-clamp-2"
                          : "mt-1 text-sm text-muted-foreground break-words line-clamp-2"
                      }
                    >
                      {post.excerpt}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {ready && !loading && !result.isError && result.data?.length === 20 && (
          <p className="mt-4 text-sm text-muted-foreground">{t("limit")}</p>
        )}
      </div>
    </>
  );
}

export default function PostSearch() {
  const mounted = useMounted();
  const t = useTranslations("Search");
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          disabled={!mounted}
          aria-label={t("title")}
          className="inline-flex size-5 shrink-0 items-center justify-center cursor-pointer focus-visible:outline-2 focus-visible:outline-teal-500"
        >
          <Search size={20} aria-hidden="true" />
        </button>
      </DialogTrigger>
      <DialogContent
        showCloseButton={false}
        className="flex h-dvh max-w-full flex-col gap-3 rounded-none bg-auto-back-gray text-foreground sm:h-[min(36rem,80dvh)] sm:max-w-xl sm:rounded-xl"
      >
        <SearchContent onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
