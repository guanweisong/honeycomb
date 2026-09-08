import type { Metadata } from "next";
import type { MultiLangEnum } from "@/packages/domain/localization/multi-lang";

export const defaultSocialImage = "/static/images/logo.png";

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
