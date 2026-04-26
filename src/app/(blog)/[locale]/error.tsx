"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * 错误边界组件的属性接口。
 */
interface ErrorProps {
  /**
   * 错误对象。
   */
  error: Error & { digest?: string };
  /**
   * 重置函数。
   */
  reset: () => void;
}

/**
 * 错误边界组件。
 * 当发生错误时显示友好的错误提示。
 * @param {ErrorProps} props - 组件属性。
 * @returns {JSX.Element} 错误提示组件。
 */
export default function Error({ error, reset }: ErrorProps) {
  const t = useTranslations("Error");

  return (
    <div
      className="flex flex-col items-center justify-center py-20 px-4"
      role="alert"
      aria-live="assertive"
    >
      <AlertCircle className="w-16 h-16 text-red-500 mb-4" aria-hidden="true" />
      <h2 className="text-2xl font-bold mb-2">{t("title")}</h2>
      <p className="text-gray-600 mb-6 text-center">{t("description")}</p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="px-4 py-2 bg-teal-500 text-white rounded hover:bg-teal-600 transition-colors"
          type="button"
        >
          {t("tryAgain")}
        </button>
        <Link
          href="/"
          className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
        >
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}
