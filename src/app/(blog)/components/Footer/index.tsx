import { Suspense } from "react";
import { format } from "date-fns";
import { connection } from "next/server";
import { getLocale } from "next-intl/server";
import { getPublicSetting } from "@/app/lib/server/public-queries";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import LoadingState from "@/components/LoadingState";

/**
 * 网站底部组件。
 * 显示网站的签名、版权信息和备案号等。
 * @returns {Promise<JSX.Element>} 网站底部。
 */
export default async function Footer() {
  const [setting, locale] = await Promise.all([
    getPublicSetting(),
    getLocale(),
  ]);
  const language = normalizeMultiLangLocale(locale);

  return (
    <footer className="text-center py-4 px-2 text-sm text-auto-front-gray/40">
      <div>{setting?.siteSignature?.[language]}</div>
      <div>
        ©
        <Suspense
          fallback={
            <LoadingState
              variant="inline"
              label={language === "zh" ? "正在加载年份" : "Loading year"}
              visuallyHiddenLabel
            />
          }
        >
          <CurrentYear />
        </Suspense>
        &nbsp;
        {setting?.siteCopyright?.[language]}
      </div>
      <div>
        {setting?.siteRecordNo ? (
          setting?.siteRecordUrl ? (
            <a
              className="link-light"
              href={`${setting?.siteRecordUrl}`}
              target="_blank"
              rel="nofollow noopener noreferrer"
              aria-label={`View site record: ${setting?.siteRecordNo}`}
            >
              {setting?.siteRecordNo}
            </a>
          ) : (
            setting?.siteRecordNo
          )
        ) : null}
      </div>
    </footer>
  );
}

async function CurrentYear() {
  await connection();
  return format(new Date(), "yyyy");
}
