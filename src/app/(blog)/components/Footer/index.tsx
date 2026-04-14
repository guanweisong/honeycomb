import { format } from "date-fns";
import { getLocale } from "next-intl/server";
import { createServerClient } from "@/packages/trpc/server";
import { MultiLangEnum } from "@/packages/trpc/server/types/multi.lang";

/**
 * 网站底部组件。
 * 显示网站的签名、版权信息和备案号等。
 * @returns {Promise<JSX.Element>} 网站底部。
 */
export default async function Footer() {
  const serverClient = await createServerClient();
  const [setting, locale] = await Promise.all([
    serverClient.setting.index(),
    getLocale(),
  ]);

  return (
    <div className="text-center py-4 px-2 text-sm text-auto-front-gray/40">
      <div>{setting?.siteSignature?.[locale as MultiLangEnum]}</div>
      <div>
        ©{format(new Date(), "yyyy")}&nbsp;
        {setting?.siteCopyright?.[locale as MultiLangEnum]}
      </div>
      <div>
        {setting?.siteRecordNo ? (
          setting?.siteRecordUrl ? (
            <a
              className="link-light"
              href={`${setting?.siteRecordUrl}`}
              target="_blank"
              rel="nofollow"
            >
              {setting?.siteRecordNo}
            </a>
          ) : (
            setting?.siteRecordNo
          )
        ) : null}
      </div>
    </div>
  );
}
