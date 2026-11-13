import { connection } from "next/server";
import type { Metadata } from "next";
import type { MultiLangEnum } from "@/lib/i18n/multi-lang";

export const defaultSocialImage = "/static/images/logo.png";

/** Defers locale-dependent metadata while keeping public content prefetchable. */
export async function DynamicMetadataMarker() {
  await connection();
  return null;
}

export function createLocalizedAlternates(
  locale: MultiLangEnum,
  path: `/${string}`,
): NonNullable<Metadata["alternates"]> {
  return {
    canonical: `/${locale}${path}`,
    languages: {
      en: `/en${path}`,
      zh: `/zh${path}`,
    },
  };
}

export function createContentMetadata({
  locale,
  path,
  title,
  description,
  type,
}: {
  locale: MultiLangEnum;
  path: `/${string}`;
  title?: string;
  description?: string;
  type: "article" | "website";
}): Metadata {
  const social = { title, description, images: [defaultSocialImage] };
  return {
    title,
    description,
    alternates: createLocalizedAlternates(locale, path),
    openGraph: { ...social, type },
    twitter: { ...social, card: "summary_large_image" },
  };
}
