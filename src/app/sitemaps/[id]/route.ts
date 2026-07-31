import { NextResponse } from "next/server";

import {
  getCachedSitemapShard,
  getCachedSitemapShardCount,
  getSiteOrigin,
  getStaticSitemapUrls,
  reportSitemapError,
  toSitemapXml,
} from "@/app/sitemap-data";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const shard = Number(id.endsWith(".xml") ? id.slice(0, -4) : id);

  if (!Number.isSafeInteger(shard) || shard < 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const siteOrigin = getSiteOrigin();
  try {
    const shardCount = await getCachedSitemapShardCount(siteOrigin);
    if (shard >= shardCount) {
      return new NextResponse("Not Found", { status: 404 });
    }

    return new NextResponse(
      toSitemapXml(await getCachedSitemapShard(siteOrigin, shard)),
      {
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      },
    );
  } catch (error) {
    reportSitemapError(error);
    return new NextResponse(toSitemapXml(getStaticSitemapUrls(siteOrigin)), {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
}
