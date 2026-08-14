import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  /** 加载状态中展示的提示文案。 */
  label?: string;
}

/**
 * 展示页面级加载状态。
 *
 * @param props - 加载状态的展示配置。
 * @returns 页面级加载状态视图。
 */
export default function LoadingState({
  label = "正在加载",
}: LoadingStateProps) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className="flex min-h-screen w-full items-center justify-center bg-background text-muted-foreground"
    >
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </main>
  );
}
