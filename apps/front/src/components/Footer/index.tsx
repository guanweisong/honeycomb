import dayjs from "dayjs";
import { getLocale } from "next-intl/server";
import { serverClient } from "@honeycomb/trpc/server";

export default async function Footer() {
  const [setting, locale] = await Promise.all([
    serverClient.setting.index(),
    getLocale(),
  ]);

  return (
    <div className="text-center py-4 px-2 text-sm text-auto-front-gray/40">
      <div>{setting?.siteSignature?.[locale]}</div>
      <div>
        ©{dayjs().format("YYYY")}&nbsp;{setting?.siteCopyright?.[locale]}
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
