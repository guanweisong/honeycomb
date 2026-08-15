import { Loader2 } from "lucide-react";

export interface LoadingStateProps {
  /** 加载状态中展示的提示文案。 */
  label?: string;
  /** 是否占满页面；局部列表加载时关闭。 */
  fullScreen?: boolean;
}

/**
 * 展示页面级加载状态。
 *
 * @param props - 加载状态的展示配置。
 * @returns 页面级加载状态视图。
 */
export default function LoadingState({
  label = "正在加载",
  fullScreen = true,
}: LoadingStateProps) {
  return (
    <main
      aria-busy="true"
      aria-live="polite"
      className={
        fullScreen
          ? "flex min-h-screen w-full -translate-y-[20%] items-center justify-center bg-background text-muted-foreground"
          : "flex min-h-32 w-full items-center justify-center text-muted-foreground"
      }
    >
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        <span>{label}</span>
      </div>
    </main>
  );
}
