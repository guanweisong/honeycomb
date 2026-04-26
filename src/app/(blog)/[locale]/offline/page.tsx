"use client";
import { WifiOff } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * 离线页面组件。
 * 当用户离线时显示友好的提示。
 * @returns {Promise<JSX.Element>} 离线页面。
 */
export default async function Offline() {
  const t = useTranslations("Offline");

  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen py-20 px-4"
      role="alert"
      aria-live="polite"
    >
      <WifiOff className="w-16 h-16 text-gray-500 mb-4" aria-hidden="true" />
      <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
      <p className="text-gray-600 mb-6 text-center">{t("description")}</p>
      <button
        onClick={() => window.location.reload()}
        className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
        type="button"
      >
        {t("retry")}
      </button>
    </div>
  );
}
