import { defineRouting } from "next-intl/routing";
import { Language } from "@/types/Language";

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: [Language.En, Language.Zh],

  // Used when no locale matches
  defaultLocale: Language.En,
});
