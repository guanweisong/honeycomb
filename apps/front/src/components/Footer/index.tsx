import dayjs from "dayjs";
import SettingServer from "@/src/services/setting";
import { MultiLang } from "@/src/types/Language";
import { getLocale } from "next-intl/server";
import { SettingEntity } from "@/src/types/setting/setting.entity";

export default async function Footer() {
  const [setting, locale] = (await Promise.all([
    SettingServer.indexSetting(),
    getLocale(),
  ])) as [SettingEntity, keyof MultiLang];

  return (
    <div className="text-center py-4 px-2 text-base text-auto-front-gray/40">
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
