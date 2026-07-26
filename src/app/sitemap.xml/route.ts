import { NextResponse } from "next/server";

import {
  getCachedSitemapShardCount,
  getSiteOrigin,
  reportSitemapError,
  toSitemapIndexXml,
} from "@/app/sitemap-data";

export const dynamic = "force-dynamic";

export async function GET() {
  const siteOrigin = getSiteOrigin();
  try {
    return new NextResponse(
      toSitemapIndexXml(
        siteOrigin,
        await getCachedSitemapShardCount(siteOrigin),
      ),
      {
        headers: { "Content-Type": "application/xml; charset=utf-8" },
      },
    );
  } catch (error) {
    reportSitemapError(error);
    return new NextResponse(toSitemapIndexXml(siteOrigin, 1), {
      headers: { "Content-Type": "application/xml; charset=utf-8" },
    });
  }
}
