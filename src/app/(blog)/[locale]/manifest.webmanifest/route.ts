import { connection } from "next/server";
import type { MetadataRoute } from "next";
import { getPublicSetting } from "@/app/lib/server/public-queries";
import { normalizeMultiLangLocale } from "@/packages/domain/localization/multi-lang";

/** 按当前语言在请求时生成 Web App Manifest。 */
export async function GET(
  _request: Request,
  { params }: RouteContext<"/[locale]/manifest.webmanifest">,
): Promise<Response> {
  await connection();

  const { locale: rawLocale } = await params;
  const locale = normalizeMultiLangLocale(rawLocale);
  const setting = await getPublicSetting();
  const manifest: MetadataRoute.Manifest = {
    name: setting?.siteName?.[locale] ?? "Honeycomb",
    short_name: setting?.siteName?.[locale] ?? "Honeycomb",
    description:
      setting?.siteSubName?.[locale] ?? "Honeycomb content management system",
    background_color: "#FFFFFF",
    theme_color: "#FFFFFF",
    start_url: `/${locale}/`,
    display: "standalone",
    orientation: "portrait",
    icons: [
      {
        src: "/static/images/logo.192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/static/images/logo.384.png",
        sizes: "384x384",
        type: "image/png",
      },
      {
        src: "/static/images/logo.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    screenshots: [
      {
        src: "/static/images/desktop.png",
        sizes: "2560x1440",
        type: "image/png",
        form_factor: "wide",
      },
      {
        src: "/static/images/mobile.png",
        sizes: "780x1688",
        type: "image/png",
      },
    ],
  };

  return Response.json(manifest, {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8" },
  });
}
