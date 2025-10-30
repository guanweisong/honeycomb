import NoData from "@/components/NoData";
import Comment from "@/components/Comment";
import PageTitle from "@/components/PageTitle";
import { getLocale, getTranslations } from "next-intl/server";
import { MultiLang } from "@honeycomb/types/multi.lang";
import { cn } from "@honeycomb/ui/lib/utils";
import { MenuType } from "@honeycomb/types/menu/menu.type";
import { serverClient } from "@honeycomb/trpc/server";
import { EnableStatus } from "@honeycomb/types/enable.status";

/**
 * 友情链接页面组件的属性接口。
 */
export interface LinksProps {
  /**
   * 包含当前语言环境的 Promise。
   */
  params: Promise<{ locale: keyof MultiLang }>;
}

/**
 * 友情链接页面组件。
 * 用于展示友情链接列表，并提供申请友链的说明。
 * @param {LinksProps} props - 组件属性。
 * @returns {Promise<JSX.Element>} 友情链接页面。
 */
const Links = async (props: LinksProps) => {
  const { locale } = await props.params;
  const t = await getTranslations("Link");
  const [result, setting] = await Promise.all([
    serverClient.link.index({
      limit: 999,
      status: [EnableStatus.ENABLE],
    }),
    serverClient.setting.index(),
  ]);

  return (
    <div>
      <PageTitle>{t("slogan")}</PageTitle>
      {result?.total > 0 ? (
        <div className="py-2 lg:py-4">
          {result.list.map((item, index) => (
            <a
              href={item.url as string}
              target="_blank"
              className={cn("flex items-center py-2", {
                "border-t-0.5 border-dashed border-auto-front-gray/30":
                  index > 0,
              })}
            >
              <span
                className="inline-block w-10 h-10 bg-no-repeat bg-center bg-contain mr-2"
                style={{ backgroundImage: `url(${item.logo})` }}
              />
              <div>
                <div>{item.name}</div>
                <div className="text-auto-front-gray/50 text-base">
                  {item.description}
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : (
        <NoData title={t("emptyTip")} />
      )}
      <div>
        <div className="mb-1">{t("applyStep.title")}</div>
        <div>
          <div>{t("applyStep.stepOne")}</div>
          <div className="text-sm border border-dashed border-auto-front-gray/50 my-1 px-1 py-1">
            <div>
              {t("applyStep.nameLabel")}: {setting.siteName?.[locale]}
            </div>
            <div>{t("applyStep.linkLabel")}: https://guanweisong.com</div>
            <div>Logo: https://guanweisong.com/static/images/logo.192.png</div>
            <div>
              {t("applyStep.descLabel")}: {setting.siteSubName?.[locale]}
            </div>
          </div>
          <div>{t("applyStep.stepTwo")}</div>
          <div>{t("applyStep.stepThree")}</div>
        </div>
      </div>
      <Comment
        id={setting.customObjectId.link as string}
        type={MenuType.CUSTOM}
      />
    </div>
  );
};

/**
 * 为友情链接页面生成元数据。
 * 用于设置页面的标题、描述、开放图谱等，以优化 SEO 和社交媒体分享。
 * @returns {Promise<Metadata>} 页面元数据。
 */
export async function generateMetadata() {
  const t = await getTranslations("Link");
  const setting = await serverClient.setting.index();
  const locale = (await getLocale()) as keyof MultiLang;
  const title = t("title");

  const openGraph = {
    title,
    type: "article",
    description: setting.siteName?.[locale],
    images: ["/static/images/logo.png"],
  };

  return {
    title,
    description: setting.siteName?.[locale],
    openGraph,
  };
}

/**
 * 生成静态页面参数。
 * 在构建时预渲染页面，提高性能。
 * @returns {Promise<any[]>} 静态参数数组。
 */
export async function generateStaticParams() {
  return [];
}

export default Links;
