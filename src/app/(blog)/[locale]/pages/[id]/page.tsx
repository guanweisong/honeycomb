import React, { Suspense } from "react";
import PostInfo from "@/app/(blog)/components/features/post/public/PostInfo";
import {
  PublicCommentCount,
  PublicCommentSection,
  PublicCommentSectionSkeleton,
} from "@/app/(blog)/components/features/comment/public/PublicCommentSection";
import CommentClient from "@/app/(blog)/components/features/comment/public/components/CommentClient";
import PageTitle from "@/app/(blog)/components/PageTitle";
import { normalizeMultiLangLocale } from "@/lib/i18n/multi-lang";
import { MenuType } from "@/features/menu/types/menu.type";
import { createServerClient } from "@/app/trpc/server";
import { getCachedMetadataSettings } from "@/app/(blog)/lib/metadata-settings";
import { RichText } from "@/app/(blog)/components/features/media/public/RichText";
import { ContentViewTracker } from "@/app/(blog)/components/ContentViewTracker";
import { PageTemplate } from "@/features/page/types/page.template";
import { cn } from "cn";
import { getTranslations } from "next-intl/server";
import LoadingState from "@/components/LoadingState";
import { assertPublishedPage } from "@/app/(blog)/[locale]/pages/[id]/page.utils";
import { assertDetailId } from "@/app/(blog)/lib/assert-detail-id";
import { createContentMetadata } from "@/app/(blog)/lib/metadata";
import { EnableStatus } from "@/lib/validation/enable-status";
import { MAX_PAGE_SIZE } from "@/lib/validation/resource-limits";
import { connection } from "next/server";
import { cacheLife, cacheTag } from "next/cache";
import {
  PAGE_DETAILS_CACHE_TAG,
  pageDetailCacheTag,
} from "@/lib/cache/public-cache-keys";
import { getPublishedPageDetailStaticParams } from "@/app/(blog)/lib/server/detail-static-params";

export function generateStaticParams() {
  return getPublishedPageDetailStaticParams();
}

async function getPrefetchedPageDetail(id: string) {
  "use cache";

  cacheLife({ stale: 300, revalidate: 3600, expire: 86400 });
  cacheTag(PAGE_DETAILS_CACHE_TAG, pageDetailCacheTag(id));

  const trpc = await createServerClient({
    requestContext: { requestId: "public-detail-cache-fill" },
    skipRequestObservability: true,
  });
  return trpc.page.detail({ id });
}
/**
 * 页面详情组件。
 * 用于显示单个页面的详细内容，包括页面信息、评论等。
 * @param {PageProps<"/[locale]/pages/[id]">} props - 组件属性。
 * @returns {Promise<JSX.Element>} 页面详情。
 */
export default function Pages(props: PageProps<"/[locale]/pages/[id]">) {
  return (
    <Suspense fallback={<LoadingState variant="region" />}>
      <PageContent {...props} />
    </Suspense>
  );
}

async function PageContent(props: PageProps<"/[locale]/pages/[id]">) {
  const { id, locale: rawLocale } = await props.params;
  assertDetailId(id);
  const locale = normalizeMultiLangLocale(rawLocale);
  const pageDetail = await getPrefetchedPageDetail(id);
  const publishedPage = assertPublishedPage(pageDetail);
  const postInfoT = await getTranslations({ locale, namespace: "PostInfo" });

  return (
    <>
      <PageTitle>{publishedPage.title?.[locale]}</PageTitle>
      <PostInfo
        id={publishedPage.id}
        author={publishedPage.author?.name ?? ""}
        authorId={publishedPage.author?.id}
        date={publishedPage.createdAt ?? ""}
        comments={
          <Suspense
            fallback={
              <LoadingState
                variant="inline"
                label={postInfoT("loading")}
                visuallyHiddenLabel
              />
            }
          >
            <PublicCommentCount id={id} type={MenuType.PAGE} locale={locale} />
          </Suspense>
        }
        views={
          <ContentViewTracker
            kind="page"
            id={id}
            initialViews={publishedPage.views ?? 0}
          />
        }
      />
      <div className="my-3 lg:my-5">
        <div className="prose-editor">
          <RichText
            html={publishedPage.content?.[locale]}
            images={publishedPage.imagesInContent}
          />
        </div>
      </div>
      {publishedPage.template === PageTemplate.FRIENDLY_LINKS ? (
        <Suspense fallback={<LoadingState variant="region" />}>
          <FriendlyLinks locale={locale} />
        </Suspense>
      ) : null}
      <CommentClient id={id} type={MenuType.PAGE}>
        <Suspense
          fallback={
            <PublicCommentSectionSkeleton label={postInfoT("loading")} />
          }
        >
          <PublicCommentSection id={id} type={MenuType.PAGE} locale={locale} />
        </Suspense>
      </CommentClient>
    </>
  );
}

async function FriendlyLinks({
  locale,
}: {
  locale: ReturnType<typeof normalizeMultiLangLocale>;
}) {
  await connection();
  const [trpc, linkT] = await Promise.all([
    createServerClient(),
    getTranslations({ locale, namespace: "Link" }),
  ]);
  const input = {
    limit: MAX_PAGE_SIZE,
    status: [EnableStatus.ENABLE],
  };
  const first = await trpc.link.index({ ...input, page: 1 });
  const list = [...first.list];
  for (let page = 2; page <= Math.ceil(first.total / MAX_PAGE_SIZE); page++) {
    const result = await trpc.link.index({ ...input, page });
    list.push(...result.list);
    if (result.list.length === 0) break;
  }

  return (
    <div className="py-2 lg:py-4">
      {list.length ? (
        list.map((item, index) => (
          <a
            key={item.url}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn("flex items-center py-2", {
              "border-t-0.5 border-dashed border-auto-front-gray/30": index > 0,
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
        ))
      ) : (
        <div className="text-auto-front-gray/60">{linkT("emptyTip")}</div>
      )}
    </div>
  );
}

/**
 * 为页面详情生成元数据。
 * 用于设置页面的标题、描述、开放图谱等，以优化 SEO 和社交媒体分享。
 * @param props - 包含页面参数的属性。
 * @returns {Promise<Metadata>} 页面元数据。
 */
export async function generateMetadata(
  props: PageProps<"/[locale]/pages/[id]">,
) {
  const { id, locale: rawLocale } = await props.params;
  assertDetailId(id);
  const [setting, pageDetail] = await Promise.all([
    getCachedMetadataSettings(),
    getPrefetchedPageDetail(id),
  ]);
  const publishedPage = assertPublishedPage(pageDetail);
  const local = normalizeMultiLangLocale(rawLocale);

  const title = publishedPage.title?.[local];

  return createContentMetadata({
    title,
    description: setting?.siteName?.[local],
    locale: local,
    path: `/pages/${encodeURIComponent(id)}`,
    type: "article",
  });
}
