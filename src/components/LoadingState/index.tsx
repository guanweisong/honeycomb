import { Loader2 } from "lucide-react";
import { cn } from "@/lib/ui/utils";

export type LoadingStateVariant = "page" | "region" | "inline";

export interface LoadingStateProps {
  /** 加载状态中展示的提示文案。 */
  label?: string;
  /** 加载提示所在的布局场景。 */
  variant?: LoadingStateVariant;
  /** 为小型图标状态保留可访问文案，同时隐藏可见文字。 */
  visuallyHiddenLabel?: boolean;
  /** 根容器的附加样式。 */
  className?: string;
}

/**
 * 展示页面、区域或行内加载状态。
 *
 * @param props - 加载状态的展示配置。
 * @returns 适配当前布局的加载状态视图。
 */
export default function LoadingState({
  label = "正在加载",
  variant,
  visuallyHiddenLabel = false,
  className,
}: LoadingStateProps) {
  const resolvedVariant = variant ?? "page";
  const labelElement = (
    <span className={visuallyHiddenLabel ? "sr-only" : undefined}>{label}</span>
  );
  const spinner = (
    <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden="true" />
  );

  if (resolvedVariant === "inline") {
    return (
      <span
        role="status"
        aria-busy="true"
        aria-live="polite"
        className={cn(
          "inline-flex items-center gap-2 align-middle text-sm text-muted-foreground",
          className,
        )}
      >
        {spinner}
        {labelElement}
      </span>
    );
  }

  const status = (
    <div className="flex items-center gap-2 text-sm">
      {spinner}
      {labelElement}
    </div>
  );

  if (resolvedVariant === "page") {
    return (
      <main
        aria-busy="true"
        aria-live="polite"
        className={cn(
          "flex min-h-screen w-full -translate-y-[20%] items-center justify-center text-muted-foreground",
          className,
        )}
      >
        {status}
      </main>
    );
  }

  return (
    <div
      role="status"
      aria-busy="true"
      aria-live="polite"
      className={cn(
        "flex min-h-32 w-full items-center justify-center text-muted-foreground",
        className,
      )}
    >
      {status}
    </div>
  );
}
