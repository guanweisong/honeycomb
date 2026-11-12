import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import { getCachedMetadataSettings } from "@/app/(blog)/lib/metadata-settings";

const CURRENT_YEAR = new Date().getFullYear();

/**
 * 网站底部组件。
 * 显示网站的签名、版权信息和备案号等。
 * @returns {Promise<JSX.Element>} 网站底部。
 */
export default async function Footer({ locale }: { locale: string }) {
  const setting = await getCachedMetadataSettings();
  const language = normalizeMultiLangLocale(locale);

  return (
    <footer className="text-center py-4 px-2 text-sm text-auto-front-gray/40">
      <div>{setting?.siteSignature?.[language]}</div>
      <div>
        ©{CURRENT_YEAR}
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
